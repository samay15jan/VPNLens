'use strict';

const { execFile } = require('child_process');

// ─── config (env vars — set these in your .env / process environment) ──────

const SSH_HOST     = process.env.SSH_HOST;                 // Server 2's IP or hostname
const SSH_USER     = process.env.SSH_USER || 'ubuntu';     // Server 2 SSH user
const SSH_PORT     = process.env.SSH_PORT || '22';
const SSH_KEY_PATH = process.env.SSH_KEY_PATH;             // path to the private key, on the backend host

if (!SSH_HOST || !SSH_KEY_PATH) {
  console.warn('[ssh] SSH_HOST / SSH_KEY_PATH not set — benchmark orchestration will fail until configured.');
}

const COMMON_OPTS = [
  '-i', SSH_KEY_PATH,
  '-o', 'StrictHostKeyChecking=no',
  '-o', 'BatchMode=yes',       // never prompt — fail fast instead of hanging
  '-o', 'ConnectTimeout=10',
];

const SSH_OPTS = [...COMMON_OPTS, '-p', SSH_PORT];
const SCP_OPTS = [...COMMON_OPTS, '-P', SSH_PORT];

/**
 * Runs a local command, resolving with { code, stdout, stderr } instead of
 * rejecting on non-zero exit — callers decide what a failure means (e.g.
 * run-benchmark.sh exits 1 on a switch failure, which is still a valid,
 * informative result, not a plumbing error).
 */
function run(cmd, args, { timeout = 5 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err && err.killed) {
        return reject(new Error(`${cmd} timed out after ${timeout}ms`));
      }
      if (err && err.code === undefined && err.signal === undefined && !stdout && !stderr) {
        // execFile itself failed to spawn (e.g. binary not found)
        return reject(err);
      }
      resolve({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

/** Run a command on Server 2 over SSH. */
async function sshExec(remoteCommand, opts) {
  return run('ssh', [...SSH_OPTS, `${SSH_USER}@${SSH_HOST}`, remoteCommand], opts);
}

/** Copy a local file to a directory on Server 2 over SCP. */
async function scpTo(localPath, remoteDir) {
  return run('scp', [...SCP_OPTS, localPath, `${SSH_USER}@${SSH_HOST}:${remoteDir}/`]);
}

module.exports = { sshExec, scpTo };