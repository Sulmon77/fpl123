'use client'
// src/components/layout/AdminSidebar.tsx

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Settings, Users, Users2, Layers, BarChart2,
  DollarSign, Megaphone, Trophy, History, Ban, FileText,
  Wrench, ChevronLeft, ChevronRight, Zap, LogOut, Menu, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: 'dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
  { href: 'gw-controls',       icon: Settings,        label: 'GW Controls' },
  { href: 'entries',           icon: Users,           label: 'Entries & Payments' },
  { href: 'user-management',   icon: Users2,          label: 'User Management' },
  { href: 'groups',            icon: Layers,          label: 'Group Management' },
  { href: 'standings',         icon: BarChart2,       label: 'Standings & Points' },
  { href: 'payouts',           icon: DollarSign,      label: 'Payouts' },
  { href: 'announcements',     icon: Megaphone,       label: 'Announcements' },
  { href: 'hall-of-fame',      icon: Trophy,          label: 'Hall of Fame' },
  { href: 'history',           icon: History,         label: 'History' },
  { href: 'blacklist',         icon: Ban,             label: 'Blacklist' },
  { href: 'terms',             icon: FileText,        label: 'Terms & Conditions' },
  { href: 'settings',          icon: Wrench,          label: 'Platform Settings' },
]

interface AdminSidebarProps {
  adminPath: string
}

export function AdminSidebar({ adminPath }: AdminSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const getLinkHref = (href: string) =>
    href === 'dashboard'
      ? `/${adminPath}/dashboard`
      : `/${adminPath}/dashboard/${href}`

  const isActive = (href: string) => {
    const fullHref = getLinkHref(href)
    if (href === 'dashboard') {
      return pathname === fullHref
    }
    return pathname === fullHref || pathname.startsWith(fullHref + '/')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-white/10',
        collapsed ? 'justify-center' : ''
      )}>
        <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-brand-purple fill-current" />
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-white text-lg">FPL123 Admin</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          const linkHref = getLinkHref(href)

          return (
            <Link
              key={href}
              href={linkHref}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium',
                active
                  ? 'bg-brand-green text-brand-purple'
                  : 'text-white/70 hover:text-white hover:bg-white/10',
                collapsed ? 'justify-center' : ''
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-white/10 p-3 space-y-1">
        <Link
          href="/"
          target="_blank"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs',
            collapsed ? 'justify-center' : ''
          )}
          title={collapsed ? 'View Site' : undefined}
        >
          <Zap className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'View Site'}
        </Link>

        <button
          onClick={async () => {
            await fetch('/api/admin/auth/logout', { method: 'POST' })
            window.location.href = `/${adminPath}`
          }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/50 hover:text-error hover:bg-error/10 transition-all text-xs',
            collapsed ? 'justify-center' : ''
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-brand-purple border-r border-white/10 transition-all duration-300 flex-shrink-0',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-brand-purple border border-white/20 flex items-center justify-center text-white/50 hover:text-white transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-brand-purple border-b border-white/10 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-green flex items-center justify-center">
            <Zap className="w-4 h-4 text-brand-purple fill-current" />
          </div>
          <span className="font-display font-bold text-white">FPL123 Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white p-1.5 rounded-lg hover:bg-white/10"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-brand-purple shadow-xl">
            <div className="pt-14">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
