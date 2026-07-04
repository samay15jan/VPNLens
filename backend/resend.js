'use strict';

const RESEND_API_KEY   = process.env.RESEND_API_KEY;
const RESEND_FROM      = process.env.RESEND_FROM_EMAIL || 'VPNLens <benchmarks@samay15jan.com>';
const RESULTS_BASE_URL = process.env.RESULTS_BASE_URL || 'https://vpn.samay15jan.com';

// Same palette as the dashboard: near-black zinc surfaces, blue for WireGuard,
// slate for Headscale (was cyan), green/amber reserved for status.
const BG        = '#09090b';   // page background        (zinc-950)
const CARD      = '#111113';   // container background    (zinc-900)
const BORDER    = '#27272a';   // borders                 (zinc-800)
const TEXT      = '#fafafa';   // primary text             (zinc-50)
const TEXT_MUTE = '#a1a1aa';   // secondary text           (zinc-400)
const TEXT_DIM  = '#71717a';   // tertiary / footer text   (zinc-500)
const BLUE      = '#3b82f6';   // WireGuard accent
const SLATE     = '#64748b';   // Headscale accent
const GREEN     = '#22c55e';   // success / "better" delta

// ─── metric definitions ──────────────────────────────────────────────────────
// deltaType controls how the caption under each metric reads:
//   'percent'    → "27% faster" / "14% higher"
//   'absolute'   → "1.0s faster"
//   'packetLoss' → special-cased ("Zero packet loss" when both ~0)

const METRICS = [
  { key: 'latency_avg',         label: 'Latency (avg)',   unit: ' ms',   decimals: 1, lowerIsBetter: true,  deltaType: 'percent'    },
  { key: 'throughput_download', label: 'Throughput ↓',    unit: ' Mbps', decimals: 1, lowerIsBetter: false, deltaType: 'percent'    },
  { key: 'throughput_upload',   label: 'Throughput ↑',    unit: ' Mbps', decimals: 1, lowerIsBetter: false, deltaType: 'percent'    },
  { key: 'packet_loss',         label: 'Packet loss',     unit: '%',     decimals: 2, lowerIsBetter: true,  deltaType: 'packetLoss' },
  { key: 'connection_time_s',   label: 'Connection time', unit: 's',     decimals: 1, lowerIsBetter: true,  deltaType: 'absolute'   },
  { key: 'recovery_time_s',     label: 'Recovery time',   unit: 's',     decimals: 1, lowerIsBetter: true,  deltaType: 'absolute'   },
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

// Caption under each metric row, e.g. "27% faster", "1.0s faster", "Zero packet loss".
function deltaCaption(m, wgVal, hsVal, winner) {
  if (wgVal == null || hsVal == null) return null;

  if (m.deltaType === 'packetLoss' && wgVal === 0 && hsVal === 0) {
    return { text: 'Zero packet loss' };
  }
  if (!winner) return null;

  const winVal = winner === 'wireguard' ? wgVal : hsVal;
  const loseVal = winner === 'wireguard' ? hsVal : wgVal;

  if (m.deltaType === 'absolute') {
    const diff = Math.abs(loseVal - winVal);
    if (diff === 0) return null;
    return { text: `${diff.toFixed(m.decimals)}${m.unit} faster` };
  }

  if (m.deltaType === 'packetLoss') return null; // no winner case already handled above

  // percent
  if (loseVal === 0) return null;
  const pct = Math.abs((loseVal - winVal) / loseVal) * 100;
  if (pct < 1) return null;
  const comparator = m.lowerIsBetter ? 'faster' : 'higher';
  return { text: `${pct.toFixed(0)}% ${comparator}` };
}

// ─── plain-text fallback ─────────────────────────────────────────────────────

function buildSummaryText({ wireguard, headscale }) {
  const row = (label, wg, hs) =>
    `${label.padEnd(20)} WireGuard: ${String(wg).padEnd(12)} Headscale: ${hs}`;

  return METRICS.map(m => {
    const wg = fmtVal(wireguard[m.key], m.decimals);
    const hs = fmtVal(headscale[m.key], m.decimals);
    return row(m.label, wg != null ? `${wg}${m.unit}` : 'n/a', hs != null ? `${hs}${m.unit}` : 'n/a');
  }).join('\n');
}

// ─── metric card — two values side by side + a delta caption ───────────────

function metricCard(m, wireguard, headscale) {
  const wgVal = wireguard[m.key];
  const hsVal = headscale[m.key];
  const winner = winnerOf(wgVal, hsVal, m.lowerIsBetter);
  const delta = deltaCaption(m, wgVal, hsVal, winner);

  const wgDisplay = fmtVal(wgVal, m.decimals);
  const hsDisplay = fmtVal(hsVal, m.decimals);

  const badge = winner
    ? `<span style="display:inline-block; margin-left:6px; padding:1px 7px; border-radius:999px; font-size:9px; font-weight:600; letter-spacing:.02em; background:${winner === 'wireguard' ? BLUE : SLATE}22; color:${winner === 'wireguard' ? BLUE : '#94a3b8'};">${winner === 'wireguard' ? 'WireGuard' : 'Headscale'}</span>`
    : '';

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}; border:1px solid ${BORDER}; border-radius:10px;">
      <tr>
        <td style="padding:14px 16px;">
          <div style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:${TEXT_MUTE};">${m.label}${badge}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            <tr>
              <td width="50%" style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;">
                <span style="font-size:17px; font-weight:600; color:${BLUE};">${wgDisplay != null ? wgDisplay : '—'}</span>
                <span style="font-size:11px; color:${TEXT_DIM};">${m.unit}</span>
                <div style="font-size:10px; color:${TEXT_DIM}; margin-top:2px;">WireGuard</div>
              </td>
              <td width="50%" style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;">
                <span style="font-size:17px; font-weight:600; color:#d4d4d8;">${hsDisplay != null ? hsDisplay : '—'}</span>
                <span style="font-size:11px; color:${TEXT_DIM};">${m.unit}</span>
                <div style="font-size:10px; color:${TEXT_DIM}; margin-top:2px;">Headscale</div>
              </td>
            </tr>
          </table>
          ${delta ? `
          <div style="margin-top:10px; font-family:Arial,Helvetica,sans-serif; font-size:11px; color:${GREEN};">
            ✓ ${delta.text}
          </div>` : ''}
        </td>
      </tr>
    </table>`;
}

// ─── highlights — computed from the actual numbers, not fabricated ─────────

function buildHighlights({ wireguard, headscale, overallWinner }) {
  const highlights = [];

  if (overallWinner) {
    highlights.push(`⚡ ${overallWinner} was faster and more efficient overall.`);
  }

  if (wireguard.packet_loss === 0 && headscale.packet_loss === 0) {
    highlights.push('🛡 Both VPNs maintained zero packet loss.');
  }

  if (overallWinner) {
    const loserKey = overallWinner === 'WireGuard' ? 'headscale' : 'wireguard';
    const loserLabel = overallWinner === 'WireGuard' ? 'Headscale' : 'WireGuard';
    const loserWinsOn = METRICS.filter(
      m => winnerOf(wireguard[m.key], headscale[m.key], m.lowerIsBetter) === loserKey
    );
    if (loserWinsOn.length > 0) {
      highlights.push(`📈 ${loserLabel} came out ahead on ${loserWinsOn[0].label.toLowerCase()}.`);
    }
  }

  return highlights.slice(0, 3);
}

function buildHtml({ to, token, wireguard, headscale, durationSeconds }) {
  const link = `${RESULTS_BASE_URL}/results/${token}`;

  const wgWins = METRICS.filter(m => winnerOf(wireguard[m.key], headscale[m.key], m.lowerIsBetter) === 'wireguard').length;
  const hsWins = METRICS.filter(m => winnerOf(wireguard[m.key], headscale[m.key], m.lowerIsBetter) === 'headscale').length;
  const overallWinner = wgWins === hsWins ? null : (wgWins > hsWins ? 'WireGuard' : 'Headscale');
  const overallColor  = overallWinner === 'WireGuard' ? BLUE : SLATE;
  const winCount = overallWinner === 'WireGuard' ? wgWins : hsWins;

  const generatedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short',
  });

  const benchmarkId = token ? token.slice(0, 12) : null;
  const durationLabel = durationSeconds != null
    ? `${String(Math.floor(durationSeconds / 60)).padStart(2, '0')}:${String(Math.round(durationSeconds % 60)).padStart(2, '0')}`
    : null;

  const highlights = buildHighlights({ wireguard, headscale, overallWinner });

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
  body { margin:0; padding:0; background:${BG}; }
  a { color:${BLUE}; }
  @media only screen and (max-width:480px) {
    .container { width:100% !important; border-radius:0 !important; }
    .px { padding-left:16px !important; padding-right:16px !important; }
    .stack { display:block !important; width:100% !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:${BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <!-- Preheader -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" style="width:600px; max-width:600px; margin-bottom:12px;">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:${TEXT_DIM};">
              You asked. We benchmarked. Here are your results.
            </td>
            <td align="right" style="font-family:Arial,Helvetica,sans-serif; font-size:12px;">
              <a href="${link}" style="color:${TEXT_MUTE}; text-decoration:underline;">View in browser</a>
            </td>
          </tr>
        </table>

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" style="width:600px; max-width:600px; background:${CARD}; border:1px solid ${BORDER}; border-radius:16px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td class="px" style="padding:24px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:36px; height:36px; border-radius:9px; background:${BLUE}18; border:1px solid ${BLUE}40; text-align:center; vertical-align:middle; font-size:16px;">🛡️</td>
                        <td style="padding-left:12px; vertical-align:middle; font-family:Arial,Helvetica,sans-serif;">
                          <div style="font-size:15px; font-weight:700; color:${TEXT}; letter-spacing:.02em;">VPNLens</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif; font-size:12px; color:${GREEN};">
                    ● Benchmark completed
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td class="px" style="padding:20px 24px 0; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:19px; font-weight:700; color:${TEXT};">Your benchmark is ready</div>
              <div style="font-size:13px; color:${TEXT_MUTE}; margin-top:4px;">WireGuard vs Headscale, tested back to back on the same nodes.</div>
            </td>
          </tr>

          <!-- Meta strip -->
          <tr>
            <td class="px" style="padding:16px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}; border:1px solid ${BORDER}; border-radius:10px;">
                <tr>
                  <td style="padding:14px 18px; font-family:Arial,Helvetica,sans-serif;">
                    <div style="font-size:10px; color:${TEXT_DIM}; text-transform:uppercase; letter-spacing:.04em;">Completed</div>
                    <div style="font-size:13px; color:${TEXT}; margin-top:2px;">${generatedAt}</div>
                  </td>
                  ${benchmarkId ? `
                  <td style="padding:14px 18px; font-family:Arial,Helvetica,sans-serif; border-left:1px solid ${BORDER};">
                    <div style="font-size:10px; color:${TEXT_DIM}; text-transform:uppercase; letter-spacing:.04em;">Benchmark ID</div>
                    <div style="font-size:13px; color:${TEXT}; margin-top:2px; font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${benchmarkId}</div>
                  </td>` : ''}
                  ${durationLabel ? `
                  <td style="padding:14px 18px; font-family:Arial,Helvetica,sans-serif; border-left:1px solid ${BORDER};">
                    <div style="font-size:10px; color:${TEXT_DIM}; text-transform:uppercase; letter-spacing:.04em;">Duration</div>
                    <div style="font-size:13px; color:${TEXT}; margin-top:2px; font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${durationLabel}</div>
                  </td>` : ''}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Winner banner -->
          ${overallWinner ? `
          <tr>
            <td class="px" style="padding:20px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${overallColor}0d; border:1px solid ${overallColor}40; border-radius:12px;">
                <tr>
                  <td align="center" style="padding:20px; font-family:Arial,Helvetica,sans-serif;">
                    <span style="display:inline-block; padding:3px 10px; border-radius:999px; font-size:10px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; background:${GREEN}18; color:${GREEN};">Overall winner</span>
                    <div style="font-size:26px; font-weight:800; color:${overallColor === BLUE ? BLUE : '#cbd5e1'}; margin-top:10px;">🏆 ${overallWinner}</div>
                    <div style="font-size:12px; color:${TEXT_MUTE}; margin-top:4px;">Won ${winCount} of ${METRICS.length} metrics</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- Metric cards, two per row -->
          <tr>
            <td class="px" style="padding:20px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${(() => {
                  const rows = [];
                  for (let i = 0; i < METRICS.length; i += 2) {
                    const left = METRICS[i];
                    const right = METRICS[i + 1];
                    rows.push(`
                      <tr>
                        <td class="stack" width="49%" style="vertical-align:top; padding-bottom:12px;">${metricCard(left, wireguard, headscale)}</td>
                        <td style="width:2%;">&nbsp;</td>
                        <td class="stack" width="49%" style="vertical-align:top; padding-bottom:12px;">${right ? metricCard(right, wireguard, headscale) : ''}</td>
                      </tr>`);
                  }
                  return rows.join('');
                })()}
              </table>
            </td>
          </tr>

          <!-- Highlights -->
          ${highlights.length > 0 ? `
          <tr>
            <td class="px" style="padding:20px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}; border:1px solid ${BORDER}; border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px; font-family:Arial,Helvetica,sans-serif;">
                    <div style="font-size:11px; color:${TEXT_DIM}; text-transform:uppercase; letter-spacing:.04em; margin-bottom:10px;">Highlights</div>
                    ${highlights.map(h => `<div style="font-size:13px; color:${TEXT_MUTE}; padding:4px 0;">${h}</div>`).join('')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}

          <!-- CTA -->
          <tr>
            <td class="px" align="center" style="padding:28px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px; background:${BLUE};">
                    <a href="${link}" style="display:inline-block; padding:12px 28px; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none;">View full interactive report →</a>
                  </td>
                </tr>
              </table>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:11px; color:${TEXT_DIM}; margin-top:12px; word-break:break-all;">
                Or copy and paste this link in your browser:<br>
                <a href="${link}" style="color:${TEXT_MUTE};">${link}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="px" style="padding:16px 24px 24px; border-top:1px solid ${BORDER}; font-family:Arial,Helvetica,sans-serif;">
              <div style="font-size:11px; color:${TEXT_DIM};">This email was sent because a benchmark was requested for ${to}.</div>
              <div style="font-size:11px; color:${TEXT_DIM}; margin-top:4px;">VPNLens &middot; © ${new Date().getFullYear()} All rights reserved.</div>
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

async function sendResultsEmail({ to, token, wireguard, headscale, durationSeconds }) {
  if (!RESEND_API_KEY) {
    console.warn('[resend] RESEND_API_KEY not set — skipping email send.');
    return;
  }

  const link = `${RESULTS_BASE_URL}/results/${token}`;
  const text = `Your VPNLens benchmark is ready\n\n${buildSummaryText({ wireguard, headscale })}\n\nFull report: ${link}`;
  const html = buildHtml({ to, token, wireguard, headscale, durationSeconds });

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