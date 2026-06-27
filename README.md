# ParkClear — Monorepo

Gestion des véhicules abandonnés sur parkings privés.

## Structure

```
parkclear/
├── backend/          Node.js + Express → Render
├── web/              React 18 + Vite → Vercel
├── mobile/           React Native + Expo
└── supabase/
    └── migrations/   SQL migrations
```

## Sprint 0 — Setup (à faire avant tout)

### 1. Supabase
1. Créer un projet sur supabase.com
2. Aller dans SQL Editor → coller + exécuter `supabase/migrations/001_initial.sql`
3. Aller dans Storage → créer 3 buckets : `photos` (privé), `documents` (privé), `logos` (public)
4. Récupérer dans Settings > API : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
5. Récupérer dans Settings > JWT : `SUPABASE_JWT_SECRET`

### 2. Stripe
1. Créer un compte stripe.com (mode test)
2. Créer 3 produits : Starter (29€/mois), Pro (59€/mois), Business (99€/mois)
3. Récupérer : `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, les 3 `STRIPE_PRICE_*`

### 3. Resend
1. Créer un compte resend.com
2. Vérifier votre domaine (parkclear.fr) ou utiliser le domaine sandbox
3. Récupérer : `RESEND_API_KEY`

### 4. AR24 (optionnel pour le MVP initial)
1. Créer un compte ar24.fr (compte de test disponible)
2. Récupérer : `AR24_API_KEY`

---

## Démarrage dev

### Backend
```bash
cd backend
cp .env.example .env
# Remplir les variables dans .env
npm install
npm run dev
# → http://localhost:3001
```

### Web
```bash
cd web
cp .env.example .env
# Remplir les variables dans .env
npm install
npm run dev
# → http://localhost:5173
```

### Mobile
```bash
cd mobile
cp .env.example .env
# Remplir les variables
npm install
npx expo start
# Scanner le QR code avec Expo Go (iOS/Android)
```

---

## Variables d'environnement

### backend/.env
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_BUSINESS=
AR24_API_KEY=
RESEND_API_KEY=
FRONTEND_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
```

### web/.env
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3001
VITE_STRIPE_PUBLISHABLE_KEY=
```

### mobile/.env
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=http://localhost:3001
```

---

## Sprints

| Sprint | Contenu | Durée |
|--------|---------|-------|
| ✅ Sprint 0 | Setup infra, migrations, config | 3j |
| ✅ Sprint 1 | Auth, onboarding, login mobile | 5j |
| Sprint 2 | Signalement mobile (photos, flux complet) | 7j |
| Sprint 3 | Dashboard web (liste + détail dossiers) | 7j |
| Sprint 4 | Procédure légale (LRAR, OPJ, alertes) | 8j |
| Sprint 5 | Paiement Stripe + exports | 5j |
| Sprint 6 | QA + go-live | 5j |

---

## Tests rapides (smoke test)

Après setup, vérifier :
- [ ] `GET http://localhost:3001/health` → `{ "status": "ok" }`
- [ ] Inscription sur `http://localhost:5173/signup` → email de vérification reçu
- [ ] Onboarding 4 étapes → dashboard vide affiché
- [ ] Login sur Expo Go → écran d'accueil mobile

---

*ParkClear MVP v1.0 — Juin 2026*
