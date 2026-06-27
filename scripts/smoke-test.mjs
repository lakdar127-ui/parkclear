/**
 * ParkClear — Smoke Test
 * Usage: node scripts/smoke-test.mjs [BASE_URL]
 * Default: http://localhost:3001
 */

const BASE = process.argv[2] ?? 'http://localhost:3001'
const EMAIL = process.env.TEST_EMAIL ?? ''
const PASS  = process.env.TEST_PASS  ?? ''

let passed = 0
let failed = 0

function ok(msg)   { console.log(`  ✓  ${msg}`); passed++ }
function fail(msg) { console.error(`  ✗  ${msg}`); failed++ }

async function check(label, fn) {
  try {
    await fn()
    ok(label)
  } catch (err) {
    fail(`${label} — ${err.message}`)
  }
}

async function get(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(`${BASE}${path}`, { headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}

// ─────────────────────────────────────────────────────────────
console.log(`\nParkClear Smoke Test — ${BASE}\n`)

// 1. Health
console.log('[ Health ]')
await check('GET /health', async () => {
  const data = await get('/health')
  if (data.status !== 'ok' && data.status !== 'degraded') throw new Error('Unexpected status')
  console.log(`     DB: ${data.db?.status} (${data.db?.latency_ms}ms)`)
  console.log(`     Stripe: ${data.services?.stripe}`)
  console.log(`     Resend: ${data.services?.resend}`)
})

// 2. Auth — login (requires TEST_EMAIL + TEST_PASS env vars)
console.log('\n[ Auth ]')
let token = null

if (EMAIL && PASS) {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://natfoqftpvgornpbnsch.supabase.co'
  const ANON_KEY     = process.env.SUPABASE_ANON_KEY ?? ''

  await check('POST /auth/v1/token (Supabase login)', async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      body: JSON.stringify({ email: EMAIL, password: PASS }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    token = data.access_token
    if (!token) throw new Error('No access_token returned')
  })
} else {
  console.log('  ℹ  Skipping auth tests (set TEST_EMAIL + TEST_PASS to enable)')
}

// 3. Protected routes
if (token) {
  console.log('\n[ Protected Routes ]')

  await check('GET /api/org', async () => {
    await get('/api/org', token)
  })

  await check('GET /api/sites', async () => {
    const data = await get('/api/sites', token)
    if (!Array.isArray(data)) throw new Error('Expected array')
  })

  await check('GET /api/dossiers', async () => {
    const data = await get('/api/dossiers', token)
    if (!data.dossiers) throw new Error('Missing dossiers field')
  })
}

// 4. 404
console.log('\n[ Error Handling ]')
await check('GET /api/nonexistent → 404', async () => {
  const res = await fetch(`${BASE}/api/nonexistent`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`)
})

await check('POST /api/auth/complete-signup with bad body → 400', async () => {
  const { status } = await post('/api/auth/complete-signup', { bad: 'data' }, token)
  if (![400, 401].includes(status)) throw new Error(`Expected 400/401, got ${status}`)
})

// Summary
console.log(`\n${'─'.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error('Some tests failed — check output above')
  process.exit(1)
} else {
  console.log('All checks passed!')
}
