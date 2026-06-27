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
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/dossiers',  label: 'Dossiers',   icon: FolderOpen },
  { to: '/sites',     label: 'Parkings',   icon: MapPin },
  { to: '/agents',    label: 'Agents',     icon: Users },
]

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  trial:    { label: 'Essai',    color: 'bg-gray-100 text-gray-600' },
  starter:  { label: 'Starter', color: 'bg-blue-100 text-blue-700' },
  pro:      { label: 'Pro',      color: 'bg-primary-100 text-primary-700' },
  business: { label: 'Business',color: 'bg-violet-100 text-violet-700' },
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-4 border-b border-gray-200">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">🅿</span>
          </div>
          <span className="font-bold text-gray-900">ParkClear</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
              `}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Subscription link */}
        <div className="px-3 pb-2">
          <Link
            to="/settings/subscription"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <CreditCard size={16} />
            <span className="flex-1">Abonnement</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadge.color}`}>
              {planBadge.label}
            </span>
          </Link>
        </div>

        {/* User */}
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 group">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
              {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name ?? 'Utilisateur'}
              </p>
              <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-opacity"
              title="Se déconnecter"
            >
              <LogOut size={14} className="text-gray-500" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-3">
          <button className="relative p-2 rounded-lg hover:bg-gray-100">
            <Bell size={20} className="text-gray-500" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
