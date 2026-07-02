'use strict';

const RESEND_API_KEY   = process.env.RESEND_API_KEY;
const RESEND_FROM      = process.env.RESEND_FROM_EMAIL || 'VPNLens <benchmarks@samay15jan.com>';
const RESULTS_BASE_URL = process.env.RESULTS_BASE_URL || 'https://vpn.samay15jan.com';

const BLUE = '#3b82f6';   // WireGuard
const CYAN = '#22d3ee';   // Headscale

// ─── metric definitions ──────────────────────────────────────────────────────

const METRICS = [
  { key: 'latency_avg',         label: 'Latency (avg)',   unit: ' ms',   decimals: 1, lowerIsBetter: true  },
  { key: 'throughput_download', label: 'Throughput ↓',    unit: ' Mbps', decimals: 1, lowerIsBetter: false },
  { key: 'throughput_upload',   label: 'Throughput ↑',    unit: ' Mbps', decimals: 1, lowerIsBetter: false },
  { key: 'packet_loss',         label: 'Packet loss',     unit: '%',     decimals: 2, lowerIsBetter: true  },
  { key: 'connection_time_s',   label: 'Connection time', unit: 's',     decimals: 1, lowerIsBetter: true  },
  { key: 'recovery_time_s',     label: 'Recovery time',   unit: 's',     decimals: 1, lowerIsBetter: true  },
];

function fmtVal(v, decimals) {
  if (v === null || v === undefined) return null;
  return Number(v).toFixed(decimals);
}

function winnerOf(wgVal, hsVal, lowerIsBetter) {
  if (wgVal == null || hsVal == null || wgVal === hsVal) return null;
  const wgWins = lowerIsBetter ? wgVal < hsVal : wgVal > hsVal;
  return wgWins ? 'wireguard' : 'headscale';
}

// ─── plain-text fallback (also used to build the HTML bars' numbers) ────────

function buildSummaryText({ wireguard, headscale }) {
  const row = (label, wg, hs) =>
    `${label.padEnd(20)} WireGuard: ${String(wg).padEnd(12)} Headscale: ${hs}`;

  return METRICS.map(m => {
    const wg = fmtVal(wireguard[m.key], m.decimals);
    const hs = fmtVal(headscale[m.key], m.decimals);
    return row(m.label, wg != null ? `${wg}${m.unit}` : 'n/a', hs != null ? `${hs}${m.unit}` : 'n/a');
  }).join('\n');
}

// ─── HTML "bar chart" row — nested tables, no SVG/CSS-gradients so it ───────
// survives Outlook/Gmail/Apple Mail alike.

function barCell(value, decimals, unit, widthPct, color) {
  const label = value != null ? `${fmtVal(value, decimals)}${unit}` : 'n/a';
  const w = value != null ? Math.max(widthPct, 4) : 2;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
      <tr>
        <td style="font-family:'SFMono-Regular',Menlo,Consolas,monospace; font-size:12px; color:${color}; padding-bottom:3px;">${label}</td>
      </tr>
      <tr>
        <td>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#111827; border-radius:4px;">
            <tr>
              <td style="width:${w}%; background:${color}; height:8px; border-radius:4px; font-size:1px; line-height:1px;">&nbsp;</td>
              <td style="height:8px; font-size:1px; line-height:1px;">&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function metricRow(m, wireguard, headscale) {
  const wgVal = wireguard[m.key];
  const hsVal = headscale[m.key];
  const max = Math.max(Math.abs(wgVal ?? 0), Math.abs(hsVal ?? 0)) || 1;
  const wgWidth = wgVal != null ? Math.round((Math.abs(wgVal) / max) * 100) : 0;
  const hsWidth = hsVal != null ? Math.round((Math.abs(hsVal) / max) * 100) : 0;

  const w = winnerOf(wgVal, hsVal, m.lowerIsBetter);
  const badge = w
    ? `<span style="display:inline-block; margin-left:8px; padding:1px 8px; border-radius:999px; font-size:10px; font-weight:600; letter-spacing:.02em; background:${w === 'wireguard' ? BLUE : CYAN}22; color:${w === 'wireguard' ? BLUE : CYAN};">${w === 'wireguard' ? 'WireGuard' : 'Headscale'}</span>`
    : '';

  return `
    <tr>
      <td style="padding:14px 24px; border-bottom:1px solid #1e293b;">
        <div style="font-size:13px; color:#94a3b8; margin-bottom:2px;">${m.label}${badge}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding-right:8px; vertical-align:top;">${barCell(wgVal, m.decimals, m.unit, wgWidth, BLUE)}</td>
            <td width="50%" style="padding-left:8px; vertical-align:top;">${barCell(hsVal, m.decimals, m.unit, hsWidth, CYAN)}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function buildHtml({ to, token, wireguard, headscale }) {
  const link = `${RESULTS_BASE_URL}/results/${token}`;

  const wgWins = METRICS.filter(m => winnerOf(wireguard[m.key], headscale[m.key], m.lowerIsBetter) === 'wireguard').length;
  const hsWins = METRICS.filter(m => winnerOf(wireguard[m.key], headscale[m.key], m.lowerIsBetter) === 'headscale').length;
  const overallWinner = wgWins === hsWins ? null : (wgWins > hsWins ? 'WireGuard' : 'Headscale');
  const overallColor  = overallWinner === 'WireGuard' ? BLUE : CYAN;

  const generatedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>Your VPNLens benchmark results</title>
<style>
  body, table, td { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  body { margin:0; padding:0; background:#050b16; }
  a { color:${BLUE}; }
  @media only screen and (max-width:480px) {
    .container { width:100% !important; border-radius:0 !important; }
    .px { padding-left:16px !important; padding-right:16px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:#050b16;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050b16;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" style="width:600px; max-width:600px; background:#0b1220; border:1px solid #1e293b; border-radius:16px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td class="px" style="padding:28px 24px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:40px; height:40px; border-radius:10px; background:${BLUE}1a; border:1px solid ${BLUE}4d; text-align:center; vertical-align:middle; font-size:18px;">🛡️</td>
                  <td style="padding-left:12px; vertical-align:middle;">
                    <div style="font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:700; color:#ffffff; letter-spacing:.02em;">VPNLens</div>
                    <div style="font-family:Arial,Helvetica,sans-serif; font-size:11px; color:#64748b;">Benchmark report generated ${generatedAt}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td class="px" style="padding:0 24px 20px; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:20px; font-weight:700; color:#ffffff;">Your benchmark is ready</div>
              <div style="font-size:13px; color:#94a3b8; margin-top:4px;">WireGuard vs Headscale (Tailscale), tested back to back on the same nodes.</div>
            </td>
          </tr>

          <!-- Winner banner -->
          ${overallWinner ? `
          <tr>
            <td class="px" style="padding:0 24px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${overallColor}0d; border:1px solid ${overallColor}40; border-radius:12px;">
                <tr>
                  <td align="center" style="padding:18px; font-family:Arial,Helvetica,sans-serif;">
                    <div style="font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em;">Overall winner</div>
                    <div style="font-size:26px; font-weight:800; color:${overallColor}; margin-top:4px;">${overallWinner}</div>
                    <div style="font-size:12px; color:#94a3b8; margin-top:2px;">Won ${overallWinner === 'WireGuard' ? wgWins : hsWins} of ${METRICS.length} metrics</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- Legend -->
          <tr>
            <td class="px" style="padding:0 24px 6px; font-family:Arial,Helvetica,sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px; color:#94a3b8; padding-right:16px;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${BLUE}; margin-right:6px;"></span>WireGuard</td>
                  <td style="font-size:12px; color:#94a3b8;"><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${CYAN}; margin-right:6px;"></span>Headscale</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Metric bars -->
          <tr>
            <td style="padding:0 0 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${METRICS.map(m => metricRow(m, wireguard, headscale)).join('')}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td class="px" align="center" style="padding:28px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px; background:#ffffff;">
                    <a href="${link}" style="display:inline-block; padding:12px 28px; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:700; color:#0b1220; text-decoration:none;">View full report →</a>
                  </td>
                </tr>
              </table>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:11px; color:#475569; margin-top:12px; word-break:break-all;">${link}</div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="px" style="padding:16px 24px 24px; border-top:1px solid #1e293b; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:11px; color:#475569;">Sent to ${to} because a benchmark was requested for this address. VPNLens</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── send ─────────────────────────────────────────────────────────────────

async function sendResultsEmail({ to, token, wireguard, headscale }) {
  if (!RESEND_API_KEY) {
    console.warn('[resend] RESEND_API_KEY not set — skipping email send.');
    return;
  }

  const link = `${RESULTS_BASE_URL}/results/${token}`;
  const text = `Your VPNLens benchmark is ready\n\n${buildSummaryText({ wireguard, headscale })}\n\nFull report: ${link}`;
  const html = buildHtml({ to, token, wireguard, headscale });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      subject: 'Your VPNLens benchmark results',
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}

module.exports = { sendResultsEmail };