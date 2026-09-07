// Minimal email sender using Resend's HTTP API directly via fetch (Node 18+
// has fetch built in, so no extra dependency). Swap the implementation here
// if you ever move providers — nothing else in the codebase needs to change,
// since every caller just uses sendEmail({ to, subject, html, text }).

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Students Renewed Hope Project <onboarding@resend.dev>';

async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set — skipping email to ${to} ("${subject}"). Set it in .env to enable real sending.`);
    return { skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html, text })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error (${res.status}): ${body}`);
  }
  return res.json();
}

module.exports = { sendEmail };
