'use strict';
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { VALID_VPN, validateResult } = require('./validate');
const benchmarkRouter = require('./benchmark');   // ← new

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── response helpers ────────────────────────────────────────────────────────

const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, error: message });

// ─── routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/results
 *
 * Store one benchmark result.
 *
 * Required:
 *   vpn  {string}  "wireguard" | "headscale"
 *
 * Optional numeric fields (omit or null = not measured this run):
 *   latency_min, latency_avg, latency_max       — milliseconds
 *   throughput_upload, throughput_download       — Mbps
 *   packet_loss                                  — percent  (0–100)
 *   cpu_avg, cpu_peak                            — percent
 *   mem_avg_mb, mem_peak_mb                      — megabytes
 *   connection_time_s, recovery_time_s           — seconds
 *   runs_successful, runs_failed                 — integer counts
 *   notes          {object}  — any extra data (stored as JSON)
 *   recorded_at    {string}  — ISO-8601 timestamp (default: server time)
 *
 * Example body:
 *   {
 *     "vpn": "wireguard",
 *     "latency_min": 15, "latency_avg": 18, "latency_max": 24,
 *     "throughput_upload": 850, "throughput_download": 790,
 *     "packet_loss": 0.2,
 *     "cpu_avg": 12.5, "cpu_peak": 31.0,
 *     "mem_avg_mb": 512, "mem_peak_mb": 620,
 *     "connection_time_s": 1.4,
 *     "recovery_time_s": 5.2,
 *     "runs_successful": 1, "runs_failed": 0
 *   }
 */
app.post('/api/results', async (req, res) => {
  const errors = validateResult(req.body);
  if (errors.length) return fail(res, errors.join('; '));

  const payload = { ...req.body, vpn: req.body.vpn.toLowerCase() };

  try {
    const row = await db.insertResult(payload);
    return ok(res, row, 201);
  } catch (err) {
    console.error('[POST /api/results]', err.message);
    return fail(res, 'Database write failed', 500);
  }
});

/**
 * GET /api/results
 *
 * Return all stored results, newest first.
 *
 * Query params:
 *   vpn     {string}  filter by VPN type
 *   limit   {number}  max rows to return
 *   offset  {number}  skip N rows (pagination)
 *
 * Example:
 *   GET /api/results?vpn=wireguard&limit=20&offset=0
 */
app.get('/api/results', async (req, res) => {
  const { vpn, limit, offset } = req.query;

  if (vpn && !VALID_VPN.includes(vpn.toLowerCase())) {
    return fail(res, `\`vpn\` must be one of: ${VALID_VPN.join(', ')}`);
  }

  try {
    const rows = await db.getAllResults({
      vpn: vpn ? vpn.toLowerCase() : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return ok(res, rows);
  } catch (err) {
    console.error('[GET /api/results]', err.message);
    return fail(res, 'Database read failed', 500);
  }
});

/**
 * GET /api/results/:id
 *
 * Return a single result by its numeric ID.
 */
app.get('/api/results/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) return fail(res, 'Invalid id');

  try {
    const row = await db.getResultById(id);
    if (!row) return fail(res, 'Result not found', 404);
    return ok(res, row);
  } catch (err) {
    console.error('[GET /api/results/:id]', err.message);
    return fail(res, 'Database read failed', 500);
  }
});

/**
 * GET /api/summary
 *
 * Per-VPN aggregated statistics — the comparison table data.
 *
 * Returns for each VPN:
 *   total_runs, total_successful, total_failed, success_rate_pct,
 *   first_recorded, last_recorded,
 *   <metric>_avg / <metric>_min / <metric>_max  for every numeric column
 */
app.get('/api/summary', async (req, res) => {
  try {
    const rows = await db.getSummary();
    return ok(res, rows);
  } catch (err) {
    console.error('[GET /api/summary]', err.message);
    return fail(res, 'Database read failed', 500);
  }
});

/**
 * GET /health
 *
 * Container health check.
 */
app.get('/health', async (req, res) => {
  try {
    // Simple DB connectivity check
    await db.getSummary();

    res.status(200).json({
      status: 'healthy',
      service: 'vpnlens-backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'vpnlens-backend',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ─── benchmark request flow (new) ───────────────────────────────────────────
//   POST /api/benchmark/start
//   GET  /results/:token
app.use(benchmarkRouter);

// ─── 404 ─────────────────────────────────────────────────────────────────────

app.use((req, res) => fail(res, `Cannot ${req.method} ${req.path}`, 404));

// ─── start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  VPN Benchmark API`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  POST  /api/results`);
  console.log(`  GET   /api/results[?vpn=wireguard|headscale&limit=N&offset=N]`);
  console.log(`  GET   /api/results/:id`);
  console.log(`  GET   /api/summary\n`);
  console.log(`  POST  /api/benchmark/start`);
  console.log(`  GET   /results/:token\n`);
  console.log(`  GET   /health\n`);
});

module.exports = app;