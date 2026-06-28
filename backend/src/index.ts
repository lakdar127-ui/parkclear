import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth'
import orgRoutes from './routes/org'
import siteRoutes from './routes/sites'
import dossierRoutes from './routes/dossiers'
import documentRoutes from './routes/documents'
import stripeRoutes, { stripeWebhookHandler } from './routes/stripe'
import exportRoutes from './routes/exports'
import healthRouter from './routes/health'
import { startDeadlineJobs } from './jobs/deadlineAlerts'

const app = express()
const PORT = process.env.PORT ?? 3001

// ── Sécurité ────────────────────────────────────────────────
app.use(helmet())
const allowedOrigins = [
  process.env.FRONTEND_URL ?? 'http://localhost:5173',
  'https://parkclear-one.vercel.app',
  'https://parkclear-git-master-lakdar127-uis-projects.vercel.app',
  'http://localhost:5173',
]
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

// Rate limiting global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}))

// Rate limiting auth
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests, please try again later' },
})

// ── Stripe webhook — raw body AVANT le json parser ───────────
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
)

// ── Body parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))

// ── Health check ────────────────────────────────────────────
app.use('/health', healthRouter)

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRoutes)
app.use('/api/org',       orgRoutes)
app.use('/api/sites',     siteRoutes)
app.use('/api/dossiers',  dossierRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/stripe',    stripeRoutes)
app.use('/api/exports',   exportRoutes)

// ── 404 ─────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ── Erreurs globales ────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`ParkClear backend running on port ${PORT}`)
  startDeadlineJobs()
})

export default app
