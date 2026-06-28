import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'
import {
  LayoutDashboard,
  FolderOpen,
  MapPin,
  Users,
  CreditCard,
  LogOut,
  Zap,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { to: '/dossiers',  label: 'Dossiers',        icon: FolderOpen },
  { to: '/sites',     label: 'Parkings',         icon: MapPin },
  { to: '/agents',    label: 'Agents terrain',   icon: Users },
]

const PLAN_CONFIG: Record<string, { label: string; dot: string; ring: string }> = {
  trial:    { label: 'Essai',    dot: 'bg-slate-400', ring: 'ring-slate-400/30' },
  starter:  { label: 'Starter', dot: 'bg-sky-400',   ring: 'ring-sky-400/30' },
  pro:      { label: 'Pro',      dot: 'bg-violet-400',ring: 'ring-violet-400/30' },
  business: { label: 'Business',dot: 'bg-amber-400', ring: 'ring-amber-400/30' },
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

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)' }}>

        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-white/5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <span className="text-white font-black text-xs">P</span>
          </div>
          <span className="font-bold text-white text-sm tracking-tight">ParkClear</span>
          <span className="ml-auto text-[10px] font-semibold text-slate-500 uppercase tracking-wider">v2</span>
        </div>

        {/* Org name */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            {org?.name ?? '…'}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 pb-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} className={isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'} />
                  <span className="flex-1">{label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Upgrade / Subscription */}
        {plan === 'trial' ? (
          <div className="px-3 pb-2">
            <Link
              to="/settings/subscription"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(124,58,237,0.2))', border: '1px solid rgba(79,70,229,0.3)' }}
            >
              <Zap size={13} className="text-primary-400 shrink-0" />
              <span className="text-primary-300 flex-1">Passer Pro</span>
              <ChevronRight size={12} className="text-primary-400" />
            </Link>
          </div>
        ) : (
          <div className="px-3 pb-2">
            <Link
              to="/settings/subscription"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors text-[13px]"
            >
              <CreditCard size={15} className="text-slate-500" />
              <span className="flex-1">Abonnement</span>
              <span className={`w-1.5 h-1.5 rounded-full ring-2 ${planCfg.dot} ${planCfg.ring}`} />
            </Link>
          </div>
        )}

        {/* User */}
        <div className="p-2 border-t border-white/5">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg group hover:bg-white/5 transition-colors cursor-default">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate leading-tight">
                {profile?.full_name ?? 'Utilisateur'}
              </p>
              <p className="text-[10px] text-slate-500 capitalize">{profile?.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-white/10 transition-all"
              title="Se déconnecter"
            >
              <LogOut size={12} className="text-slate-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{org?.name ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${
              plan === 'trial' ? 'bg-slate-50 text-slate-500 ring-slate-200' :
              plan === 'pro'   ? 'bg-violet-50 text-violet-600 ring-violet-200' :
              'bg-sky-50 text-sky-600 ring-sky-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${planCfg.dot}`} />
              {planCfg.label}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
