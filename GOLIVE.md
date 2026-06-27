# ParkClear — Runbook Go-Live

## Statut des Sprints

| Sprint | Contenu | Statut |
|--------|---------|--------|
| 0 | Monorepo, migrations DB, Supabase setup | DONE |
| 1 | Auth web, onboarding, dashboard shell | DONE |
| 2 | Mobile signalement (5 étapes + offline) | DONE |
| 3 | Dashboard web + liste dossiers + détail + realtime | DONE |
| 4 | PDF LRAR & OPJ + cron deadline alerts | DONE |
| 5 | Stripe Checkout + CSV exports | DONE |
| 6 | QA + TypeScript zero-error + configs deploy | DONE |

---

## 1. Variables d'environnement à compléter

### Backend (`backend/.env`)
```bash
# Stripe — à remplir après création des produits
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...        # Après config webhook Stripe Dashboard
STRIPE_PRICE_STARTER=price_...         # ID prix mensuel Starter (29€)
STRIPE_PRICE_PRO=price_...             # ID prix mensuel Pro (59€)
STRIPE_PRICE_BUSINESS=price_...        # ID prix mensuel Business (99€)

# Resend — à remplir après vérification du domaine
RESEND_API_KEY=re_...

# Production
FRONTEND_URL=https://parkclear.vercel.app   # URL Vercel prod
NODE_ENV=production
```

### Web (`web/.env.production`)
```bash
VITE_SUPABASE_URL=https://natfoqftpvgornpbnsch.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://parkclear-backend.onrender.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 2. Stripe — Création des produits

1. Aller sur https://dashboard.stripe.com/products
2. Créer 3 produits avec abonnement mensuel :
   - **Starter** — 29€/mois — copier `price_xxx` → `STRIPE_PRICE_STARTER`
   - **Pro** — 59€/mois — copier `price_xxx` → `STRIPE_PRICE_PRO`
   - **Business** — 99€/mois — copier `price_xxx` → `STRIPE_PRICE_BUSINESS`
3. Configurer le Webhook :
   - URL : `https://parkclear-backend.onrender.com/api/stripe/webhook`
   - Events à écouter :
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copier le `whsec_...` → `STRIPE_WEBHOOK_SECRET`
4. Activer le **Customer Portal** dans Stripe Dashboard → Settings → Billing → Customer portal

---

## 3. Resend — Email transactionnel

1. Créer un compte sur https://resend.com
2. Ajouter et vérifier le domaine `parkclear.fr` (enregistrements DNS TXT)
3. Créer une clé API → `RESEND_API_KEY`
4. Vérifier l'adresse `notifications@parkclear.fr` dans les expéditeurs

---

## 4. Déploiement Backend → Render

1. Push le repo sur GitHub
2. Sur https://render.com → New Web Service → connecter le repo
3. Settings :
   - **Root Directory** : `backend`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `node dist/index.js`
   - **Region** : Frankfurt (le plus proche de la France)
4. Remplir toutes les variables d'env depuis `backend/.env`
5. Ajouter `FRONTEND_URL=https://parkclear.vercel.app`
6. Vérifier : `https://parkclear-backend.onrender.com/health` → `{"status":"ok",...}`

---

## 5. Déploiement Frontend → Vercel

1. Sur https://vercel.com → New Project → connecter le repo
2. Settings :
   - **Root Directory** : `web`
   - **Framework** : Vite
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
3. Variables d'env : remplir depuis `web/.env.production`
4. Après deploy, copier l'URL Vercel → mettre à jour `FRONTEND_URL` sur Render
5. Vérifier que la navigation SPA fonctionne (F5 sur `/dossiers` → doit afficher la page)

---

## 6. Supabase — Config production

1. **Auth → URL Configuration** :
   - Site URL : `https://parkclear.vercel.app`
   - Redirect URLs : `https://parkclear.vercel.app/**`
2. **Auth → Email Templates** : personnaliser l'email d'invitation agent
3. **Storage** : vérifier que les buckets `photos`, `documents`, `logos` existent
4. **Database → Backups** : activer les backups quotidiens (plan Pro Supabase)

---

## 7. Smoke Test post-déploiement

```bash
# Tester le backend prod
node scripts/smoke-test.mjs https://parkclear-backend.onrender.com

# Avec auth (créer un compte de test d'abord)
TEST_EMAIL=test@parkclear.fr TEST_PASS=password123 \
  SUPABASE_URL=https://natfoqftpvgornpbnsch.supabase.co \
  SUPABASE_ANON_KEY=eyJ... \
  node scripts/smoke-test.mjs https://parkclear-backend.onrender.com
```

---

## 8. Checklist finale avant annonce

- [ ] Health check prod retourne `status: ok`
- [ ] DB latence < 500ms
- [ ] Stripe : test d'un paiement avec carte `4242 4242 4242 4242`
- [ ] LRAR PDF téléchargeable sur un dossier validé
- [ ] Email de bienvenue reçu lors d'un signup
- [ ] App mobile : créer un signalement → visible sur le web en < 2s (realtime)
- [ ] CSV export : ouvre correctement dans Excel (encodage UTF-8 BOM)
- [ ] Alerte deadline : créer manuellement un dossier avec deadline passée → vérifier que le statut s'expire
- [ ] Webhook Stripe : payer un plan Starter → vérifier que `organizations.plan` = `starter`

---

## 9. Architecture de production

```
User (navigateur)
    │
    ▼
Vercel CDN (web/)
    │  React 18 + Vite
    │
    ├──▶ Supabase (auth + BDD + storage)
    │        PostgreSQL + RLS + Realtime
    │
    └──▶ Render (backend/)
             Node.js + Express
             ├── /api/dossiers
             ├── /api/documents (PDF)
             ├── /api/stripe
             ├── /api/exports
             └── Cron jobs (deadline alerts)

App Mobile (Expo)
    │
    ├──▶ Supabase (auth + storage upload)
    └──▶ Render (API)
```

---

## 10. Prochaines itérations (post-MVP)

| Feature | Sprint | Priorité |
|---------|--------|----------|
| OCR plaques (tesseract.js) | V1.1 | Haute |
| Notifications push mobile | V1.1 | Haute |
| Module agents (invites, sites assignés) | V1.1 | Haute |
| Alertes SMS propriétaire (Twilio) | V1.2 | Moyenne |
| Intégration fourrières partenaires | V2 | Moyenne |
| Rapports conformité PDF mensuel | V2 | Basse |
| API B2B (grandes enseignes) | V3 | Basse |

---

*Généré le 2026-06-27 — ParkClear v1.0.0*
