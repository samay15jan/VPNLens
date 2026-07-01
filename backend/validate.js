'use strict';

const VALID_VPN = ['wireguard', 'headscale'];

const NUMERIC_FIELDS = [
  'latency_min', 'latency_avg', 'latency_max',
  'throughput_upload', 'throughput_download',
  'packet_loss',
  'cpu_avg', 'cpu_peak',
  'mem_avg_mb', 'mem_peak_mb',
  'connection_time_s', 'recovery_time_s',
  'runs_successful', 'runs_failed',
];

/**
 * Returns an array of error strings.
 * Empty array → payload is valid.
 */
function validateResult(body) {
  const errors = [];

  // vpn
  if (!body.vpn) {
    errors.push('`vpn` is required');
  } else if (!VALID_VPN.includes(String(body.vpn).toLowerCase())) {
    errors.push(`\`vpn\` must be one of: ${VALID_VPN.join(', ')}`);
  }

  // numeric fields
  for (const field of NUMERIC_FIELDS) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== 'number' || isNaN(body[field])) {
      errors.push(`\`${field}\` must be a number`);
      continue;
    }
    if (body[field] < 0) {
      errors.push(`\`${field}\` must be >= 0`);
    }
  }

  if (typeof body.packet_loss === 'number' && body.packet_loss > 100) {
    errors.push('`packet_loss` must be between 0 and 100');
  }

  // recorded_at (optional ISO string)
  if (body.recorded_at !== undefined) {
    const d = new Date(body.recorded_at);
    if (isNaN(d.getTime())) {
      errors.push('`recorded_at` must be a valid ISO-8601 date string');
    }
  }

  return errors;
}

module.exports = { VALID_VPN, NUMERIC_FIELDS, validateResult };
