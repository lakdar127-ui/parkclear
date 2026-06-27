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
  Bell,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/dossiers',  label: 'Dossiers',   icon: FolderOpen },
  { to: '/sites',     label: 'Parkings',   icon: MapPin },
  { to: '/agents',    label: 'Agents',     icon: Users },
]

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  trial:    { label: 'Essai',    color: 'bg-slate-700 text-slate-300' },
  starter:  { label: 'Starter', color: 'bg-blue-900 text-blue-300' },
  pro:      { label: 'Pro',      color: 'bg-primary-900 text-primary-300' },
  business: { label: 'Business',color: 'bg-violet-900 text-violet-300' },
}

export default function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  const { data: org } = useQuery({ queryKey: ['org'], queryFn: api.org.get })
  const plan = org?.plan ?? 'trial'
  const planBadge = PLAN_BADGE[plan] ?? PLAN_BADGE.trial

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar dark */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white font-black text-sm">P</span>
          </div>
          <span className="font-bold text-white text-base tracking-tight">ParkClear</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Subscription */}
        <div className="px-3 pb-2">
          <Link
            to="/settings/subscription"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors group"
          >
            <CreditCard size={17} />
            <span className="flex-1">Abonnement</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadge.color}`}>
              {planBadge.label}
            </span>
          </Link>
        </div>

        {/* User */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 group transition-colors cursor-default">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name ?? 'Utilisateur'}
              </p>
              <p className="text-xs text-slate-500 capitalize">{profile?.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700 transition-all"
              title="Se déconnecter"
            >
              <LogOut size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <span className="font-medium text-gray-700">{org?.name ?? 'Mon organisation'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell size={18} className="text-gray-500" />
            </button>
            <Link
              to="/settings/subscription"
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${planBadge.color} bg-opacity-10`}
            >
              {planBadge.label}
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-slate-50">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
