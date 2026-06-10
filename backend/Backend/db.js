'use strict';

const initSqlJs = require('./node_modules/sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.join(__dirname, 'data', 'benchmark.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db   = null;
let _sql = null;

// ─── init ────────────────────────────────────────────────────────────────────

async function getDb() {
  if (db) return db;

  _sql = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new _sql.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new _sql.Database();
  }

  db.run(`PRAGMA journal_mode = WAL;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS results (
      id                   INTEGER  PRIMARY KEY AUTOINCREMENT,
      vpn                  TEXT     NOT NULL CHECK(vpn IN ('wireguard','headscale')),
      recorded_at          TEXT     NOT NULL,

      -- Latency (ms)
      latency_min          REAL,
      latency_avg          REAL,
      latency_max          REAL,

      -- Throughput (Mbps)
      throughput_upload    REAL,
      throughput_download  REAL,

      -- Packet loss (%)
      packet_loss          REAL,

      -- Resource utilisation
      cpu_avg              REAL,
      cpu_peak             REAL,
      mem_avg_mb           REAL,
      mem_peak_mb          REAL,

      -- Operational
      connection_time_s    REAL,
      recovery_time_s      REAL,

      -- Availability counts for this run
      runs_successful      INTEGER,
      runs_failed          INTEGER,

      -- Free-form extras stored as JSON text
      notes                TEXT
    );
  `);

  persist();
  return db;
}

/** Flush in-memory DB → disk after every write. */
function persist() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// ─── row helper ──────────────────────────────────────────────────────────────

function collect(stmt) {
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ─── public functions ────────────────────────────────────────────────────────

async function insertResult(p) {
  const d   = await getDb();
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  d.run(`
    INSERT INTO results (
      vpn, recorded_at,
      latency_min, latency_avg, latency_max,
      throughput_upload, throughput_download,
      packet_loss,
      cpu_avg, cpu_peak,
      mem_avg_mb, mem_peak_mb,
      connection_time_s, recovery_time_s,
      runs_successful, runs_failed,
      notes
    ) VALUES (
      :vpn, :recorded_at,
      :latency_min, :latency_avg, :latency_max,
      :throughput_upload, :throughput_download,
      :packet_loss,
      :cpu_avg, :cpu_peak,
      :mem_avg_mb, :mem_peak_mb,
      :connection_time_s, :recovery_time_s,
      :runs_successful, :runs_failed,
      :notes
    )`,
    {
      ':vpn':                  p.vpn,
      ':recorded_at':          p.recorded_at || now,
      ':latency_min':          p.latency_min          ?? null,
      ':latency_avg':          p.latency_avg          ?? null,
      ':latency_max':          p.latency_max          ?? null,
      ':throughput_upload':    p.throughput_upload    ?? null,
      ':throughput_download':  p.throughput_download  ?? null,
      ':packet_loss':          p.packet_loss          ?? null,
      ':cpu_avg':              p.cpu_avg              ?? null,
      ':cpu_peak':             p.cpu_peak             ?? null,
      ':mem_avg_mb':           p.mem_avg_mb           ?? null,
      ':mem_peak_mb':          p.mem_peak_mb          ?? null,
      ':connection_time_s':    p.connection_time_s    ?? null,
      ':recovery_time_s':      p.recovery_time_s      ?? null,
      ':runs_successful':      p.runs_successful      ?? null,
      ':runs_failed':          p.runs_failed          ?? null,
      ':notes':                p.notes != null ? JSON.stringify(p.notes) : null,
    }
  );

  const row = collect(
    d.prepare('SELECT * FROM results WHERE id = last_insert_rowid()')
  )[0];

  persist();
  return row;
}

async function getAllResults({ vpn, limit, offset } = {}) {
  const d      = await getDb();
  const wheres = [];
  const params = {};

  if (vpn) { wheres.push('vpn = :vpn'); params[':vpn'] = vpn; }

  let sql = 'SELECT * FROM results';
  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
  sql += ' ORDER BY recorded_at DESC';
  if (limit  != null) { sql += ' LIMIT :limit';   params[':limit']  = +limit; }
  if (offset != null) { sql += ' OFFSET :offset'; params[':offset'] = +offset; }

  const stmt = d.prepare(sql);
  stmt.bind(params);
  return collect(stmt);
}

async function getResultById(id) {
  const d    = await getDb();
  const stmt = d.prepare('SELECT * FROM results WHERE id = :id');
  stmt.bind({ ':id': +id });
  return collect(stmt)[0] ?? null;
}

async function getSummary() {
  const d = await getDb();

  // Per-VPN aggregates for every metric column
  const metrics = [
    'latency_min', 'latency_avg', 'latency_max',
    'throughput_upload', 'throughput_download',
    'packet_loss',
    'cpu_avg', 'cpu_peak',
    'mem_avg_mb', 'mem_peak_mb',
    'connection_time_s', 'recovery_time_s',
  ];

  const aggs = metrics.map(c =>
    `ROUND(AVG(${c}),3) AS ${c}_avg,
     ROUND(MIN(${c}),3) AS ${c}_min,
     ROUND(MAX(${c}),3) AS ${c}_max`
  ).join(',\n      ');

  const stmt = d.prepare(`
    SELECT
      vpn,
      COUNT(*)                                                               AS total_runs,
      COALESCE(SUM(runs_successful), 0)                                      AS total_successful,
      COALESCE(SUM(runs_failed), 0)                                          AS total_failed,
      ROUND(
        100.0 * COALESCE(SUM(runs_successful), 0)
        / NULLIF(COALESCE(SUM(runs_successful),0) + COALESCE(SUM(runs_failed),0), 0),
        2
      )                                                                      AS success_rate_pct,
      MIN(recorded_at)                                                       AS first_recorded,
      MAX(recorded_at)                                                       AS last_recorded,
      ${aggs}
    FROM results
    GROUP BY vpn
    ORDER BY vpn
  `);

  return collect(stmt);
}

module.exports = { insertResult, getAllResults, getResultById, getSummary };
