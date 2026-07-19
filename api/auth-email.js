import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'eShop <onboarding@resend.dev>'
const SITE_URL = process.env.SITE_URL || 'https://zlvsxhcoxiswafpaqkpw.vercel.app'

async function sendResend({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `Resend error ${res.status}`)
  }
}

function verificationEmail(link) {
  return `<!DOCTYPE html><html><head><style>
body{font-family:sans-serif;background:#f8f7fc;margin:0;padding:2rem}
.box{max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:2.5rem;border:1px solid #e5e2ee}
h1{font-size:1.6rem;color:#1a0dab;margin-bottom:.5rem}
hr{border:none;height:2px;background:linear-gradient(90deg,transparent,#c4b5e3,transparent);margin:1rem 0;width:60%}
p{color:#3d3d5c;font-size:.95rem;line-height:1.7}
a.btn{display:inline-block;padding:.8rem 2rem;background:#1a0dab;color:#fff;text-decoration:none;border-radius:50px;font-weight:600;margin:1.5rem 0}
.small{color:#7a7a9e;font-size:.8rem;margin-top:2rem;text-align:center}
</style></head><body>
<div class="box">
<h1>Verify Your Email</h1><hr>
<p>Thanks for signing up on <b>eShop</b>! Click the button below to verify your email address.</p>
<a href="${link}" class="btn">Verify Email</a>
<p>If you didn't create an account, you can safely ignore this email.</p>
<div class="small">&copy; 2024 eShop. All rights reserved.</div>
</div></body></html>`
}

function resetEmail(link) {
  return `<!DOCTYPE html><html><head><style>
body{font-family:sans-serif;background:#f8f7fc;margin:0;padding:2rem}
.box{max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:2.5rem;border:1px solid #e5e2ee}
h1{font-size:1.6rem;color:#1a0dab;margin-bottom:.5rem}
hr{border:none;height:2px;background:linear-gradient(90deg,transparent,#c4b5e3,transparent);margin:1rem 0;width:60%}
p{color:#3d3d5c;font-size:.95rem;line-height:1.7}
a.btn{display:inline-block;padding:.8rem 2rem;background:#1a0dab;color:#fff;text-decoration:none;border-radius:50px;font-weight:600;margin:1.5rem 0}
.warn{background:#fef3cd;border:1px solid #ffc107;border-radius:8px;padding:.8rem;font-size:.85rem;color:#856404;margin-top:1rem}
.small{color:#7a7a9e;font-size:.8rem;margin-top:2rem;text-align:center}
</style></head><body>
<div class="box">
<h1>Reset Your Password</h1><hr>
<p>We received a request to reset the password for your <b>eShop</b> account. Click the button below to set a new password.</p>
<a href="${link}" class="btn">Reset Password</a>
<p>This link will expire in 1 hour.</p>
<div class="warn">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</div>
<div class="small">&copy; 2024 eShop. All rights reserved.</div>
</div></body></html>`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, email } = req.body || {}
  if (!type || !email) return res.status(400).json({ error: 'Missing type or email' })

  try {
    if (type === 'signup') {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email,
        options: { redirectTo: SITE_URL + '/index.html' },
      })
      if (error) throw error

      const link = data?.properties?.action_link
      if (!link) throw new Error('No link generated')

      await sendResend({
        to: email,
        subject: 'Verify your email - eShop',
        html: verificationEmail(link),
      })
      return res.status(200).json({ success: true })
    }

    if (type === 'reset') {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: SITE_URL + '/index.html' },
      })
      if (error) return res.status(200).json({ success: true })

      const link = data?.properties?.action_link
      if (!link) return res.status(200).json({ success: true })

      await sendResend({
        to: email,
        subject: 'Reset your password - eShop',
        html: resetEmail(link),
      })
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid type' })
  } catch {
    return res.status(200).json({ success: true })
  }
}
