'use strict';

const express = require('express');
const crypto = require('crypto');
const path = require('path');

const db = require('./db');
const { sshExec, scpTo } = require('./ssh');
const { sendResultsEmail } = require('./resend');

const router = express.Router();

const REMOTE_BASE = '/tmp/vpnlens-bench';
const LOCAL_SWITCH_SCRIPT = path.join(__dirname, 'scripts', 'switch.sh');
const LOCAL_RUN_SCRIPT = path.join(__dirname, 'scripts', 'run-benchmark.sh');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, message, status = 400) => res.status(status).json({ success: false, error: message });

function isValidEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// ─── POST /api/benchmark/start ──────────────────────────────────────────────

/**
 * POST /api/benchmark/start
 * Body: { email }
 *
 * Creates a benchmark_requests row, responds immediately with a token, and
 * runs the actual SSH benchmark flow (several minutes) in the background.
 * Poll GET /results/:token (or wait for the email) to see the outcome.
 */
router.post('/api/benchmark/start', async (req, res) => {
  const { email } = req.body || {};
  if (!isValidEmail(email)) return fail(res, '`email` must be a valid email address');

  const token = crypto.randomBytes(24).toString('hex');

  let request;
  try {
    request = await db.createBenchmarkRequest({ email, token });
  } catch (err) {
    console.error('[POST /api/benchmark/start]', err.message);
    return fail(res, 'Failed to create benchmark request', 500);
  }

  ok(res, { token: request.token, status: request.status }, 202);

  runBenchmarkFlow(request.id, token).catch(err => {
    console.error(`[benchmark ${token}] unhandled error:`, err);
    db.updateBenchmarkRequest(request.id, {
      status: 'failed',
      error: err.message,
      completed_at: new Date().toISOString(),
    }).catch(() => { });
  });
});

// ─── GET /results/:token ─────────────────────────────────────────────────────

/**
 * GET /results/:token
 * Joins benchmark_requests with the two results rows it points to.
 */
router.get('/results/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const request = await db.getBenchmarkRequestByToken(token);
    if (!request) return fail(res, 'Not found', 404);

    const [wireguard, headscale] = await Promise.all([
      db.getResultById(request.wireguard_result_id),
      db.getResultById(request.headscale_result_id),
    ]);

    return ok(res, {
      token: request.token,
      email: request.email,
      status: request.status,
      error: request.error || null,
      created_at: request.created_at,
      completed_at: request.completed_at,
      results: { wireguard, headscale },
    });
  } catch (err) {
    console.error('[GET /results/:token]', err.message);
    return fail(res, 'Database read failed', 500);
  }
});

// ─── orchestration ───────────────────────────────────────────────────────────

// run-benchmark.sh logs everything via `log()`, which writes to stderr —
// the only thing it ever prints to stdout is the bare numeric result id
// (or nothing, if switch.sh failed and it exited early before posting).
async function runOneLeg(remoteDir, vpnArg, token) {
  const { code, stdout, stderr } = await sshExec(
    `cd ${remoteDir} && ./run-benchmark.sh ${vpnArg} ${token}`,
    { timeout: 4 * 60 * 1000 } // generous — ping + 2x iperf3 + recovery poll
  );

  const resultId = Number(stdout.trim());

  if (!resultId) {
    console.error(`[benchmark] ${vpnArg} leg did not produce a result id (exit ${code}).\nstderr:\n${stderr}`);
  }
  return resultId;
}

async function runBenchmarkFlow(requestId, token) {
  const remoteDir = `${REMOTE_BASE}-${token}`;

  await db.updateBenchmarkRequest(requestId, { status: 'running' });

  try {
    await sshExec(`mkdir -p ${remoteDir}`);
    await scpTo(LOCAL_SWITCH_SCRIPT, remoteDir);
    await scpTo(LOCAL_RUN_SCRIPT, remoteDir);
    await sshExec(`chmod +x ${remoteDir}/switch.sh ${remoteDir}/run-benchmark.sh`);

    const wireguardResultId = await runOneLeg(remoteDir, 'wireguard', token);
    const headscaleResultId = await runOneLeg(remoteDir, 'tailscale', token);

    await sshExec(`rm -rf ${remoteDir}`);

    const bothSucceeded = Boolean(wireguardResultId && headscaleResultId);
    await db.updateBenchmarkRequest(requestId, {
      status: bothSucceeded ? 'completed' : 'failed',
      wireguard_result_id: wireguardResultId,
      headscale_result_id: headscaleResultId,
      completed_at: new Date().toISOString(),
      error: bothSucceeded ? null : 'One or both benchmark legs did not complete — check backend logs',
    });

    if (bothSucceeded) {
      const [wireguard, headscale] = await Promise.all([
        db.getResultById(wireguardResultId),
        db.getResultById(headscaleResultId),
      ]);
      const request = await db.getBenchmarkRequestById(requestId);
      await sendResultsEmail({ to: request.email, token, wireguard, headscale });
    }
  } catch (err) {
    // Best-effort remote cleanup; don't let it mask the original error.
    sshExec(`rm -rf ${remoteDir}`).catch(() => { });
    await db.updateBenchmarkRequest(requestId, {
      status: 'failed',
      error: err.message,
      completed_at: new Date().toISOString(),
    });
    throw err;
  }
}

module.exports = router;