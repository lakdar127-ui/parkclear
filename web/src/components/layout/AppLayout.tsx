import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import {
  LayoutDashboard, FolderOpen, MapPin, Users,
  CreditCard, LogOut, Zap, ChevronRight, Sparkles,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { to: '/dossiers',  label: 'Dossiers',        icon: FolderOpen },
  { to: '/sites',     label: 'Parkings',         icon: MapPin },
  { to: '/agents',    label: 'Agents',           icon: Users },
]

const PLAN_CONFIG: Record<string, { label: string; color: string }> = {
  trial:    { label: 'Essai',    color: '#8892A4' },
  starter:  { label: 'Starter', color: '#2D7EF8' },
  pro:      { label: 'Pro',      color: '#7B61FF' },
  business: { label: 'Business', color: '#00C896' },
}

export default function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const { data: org } = useQuery({ queryKey: ['org'], queryFn: api.org.get })
  const plan = org?.plan ?? 'trial'
  const planCfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.trial
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col relative"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Background glow */}
        <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(45,126,248,0.12) 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative h-14 flex items-center gap-3 px-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #2D7EF8, #7B61FF)', boxShadow: '0 0 16px rgba(45,126,248,0.4)' }}>
            P
          </div>
          <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>ParkClear</span>
          <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ color: 'var(--electric-blue)', background: 'rgba(45,126,248,0.12)', border: '1px solid rgba(45,126,248,0.2)' }}>
            2026
          </span>
        </div>

        {/* Org */}
        <div className="relative px-5 pt-5 pb-3">
          <p style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Espace
          </p>
          <p className="text-sm font-semibold truncate mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {org?.name ?? '…'}
          </p>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 px-3 space-y-0.5 overflow-y-auto pb-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `
                group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200
                ${isActive ? 'text-white' : ''}
              `}
              style={({ isActive }) => isActive
                ? { background: 'linear-gradient(135deg, rgba(45,126,248,0.20), rgba(123,97,255,0.15))', border: '1px solid rgba(45,126,248,0.25)', color: 'white' }
                : { color: 'var(--text-muted)', border: '1px solid transparent' }
              }
            >
              {({ isActive }) => (<>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                    style={{ background: 'linear-gradient(180deg, #2D7EF8, #7B61FF)' }} />
                )}
                <Icon size={16} style={{ color: isActive ? '#2D7EF8' : 'var(--text-muted)' }} />
                <span>{label}</span>
              </>)}
            </NavLink>
          ))}
        </nav>

        {/* Upgrade CTA */}
        {plan === 'trial' && (
          <div className="relative px-3 pb-3">
            <Link to="/settings/subscription"
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-[12px] font-semibold transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, rgba(45,126,248,0.15), rgba(123,97,255,0.15))', border: '1px solid rgba(123,97,255,0.30)' }}>
              <Sparkles size={13} style={{ color: '#7B61FF' }} />
              <span style={{ color: '#A594FF', flex: 1 }}>Passer à Pro</span>
              <ChevronRight size={12} style={{ color: '#7B61FF' }} />
            </Link>
          </div>
        )}
        {plan !== 'trial' && (
          <div className="relative px-3 pb-3">
            <Link to="/settings/subscription"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all"
              style={{ color: 'var(--text-muted)', border: '1px solid transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <CreditCard size={15} style={{ color: 'var(--text-muted)' }} />
              <span style={{ flex: 1 }}>Abonnement</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: planCfg.color, background: `${planCfg.color}1A` }}>
                {planCfg.label}
              </span>
            </Link>
          </div>
        )}

        {/* User */}
        <div className="relative px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
          <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-default transition-all"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #2D7EF8, #7B61FF)' }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {profile?.full_name ?? 'Utilisateur'}
              </p>
              <p className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{profile?.role}</p>
            </div>
            <button onClick={handleSignOut}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.06)' }}
              title="Se déconnecter">
              <LogOut size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-6 shrink-0"
          style={{
            background: 'rgba(10,14,26,0.80)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {org?.name ?? '—'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
              style={{
                color: planCfg.color,
                background: `${planCfg.color}15`,
                border: `1px solid ${planCfg.color}30`,
              }}>
              <Zap size={10} />
              {planCfg.label}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto" style={{ background: 'var(--bg-base)' }}>
          <div className="p-6 max-w-7xl mx-auto animate-slide-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
