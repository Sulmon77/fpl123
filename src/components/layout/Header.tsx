'use client'
// src/components/layout/Header.tsx

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Trophy, History, BarChart2, Zap, Mail, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  hallOfFameEnabled?: boolean
  historyVisible?: boolean
  groupsAllocated?: boolean
  registrationOpen?: boolean
  platformName?: string
}

export function Header({
  hallOfFameEnabled = false,
  historyVisible = false,
  groupsAllocated = false,
  registrationOpen = false,
  platformName = 'FPL123',
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const contactHref = pathname === '/' ? '#contact' : '/#contact'

  const navLinks = [
    { href: '/rules', label: 'Rules', icon: BookOpen },
    { href: '/standings', label: 'Standings', icon: BarChart2 },
    ...(hallOfFameEnabled ? [{ href: '/hall-of-fame', label: 'Hall of Fame', icon: Trophy }] : []),
    ...(historyVisible ? [{ href: '/history', label: 'History', icon: History }] : []),
  ]

  return (
    <header className={cn(
      'sticky top-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-brand-purple/95 backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.3)]'
        : 'bg-brand-purple'
    )}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[60px] gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center transition-all duration-200 group-hover:scale-105 group-hover:shadow-glow-green-sm">
              <Zap className="w-4.5 h-4.5 text-brand-purple fill-current" />
            </div>
            <span className="font-display font-bold text-[1.2rem] text-white tracking-tight leading-none">
              {platformName}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150',
                  pathname === href
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.07]'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
            <a
              href={contactHref}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold text-white/60 hover:text-white hover:bg-white/[0.07] transition-all duration-150"
            >
              <Mail className="w-3.5 h-3.5" />
              Contact
            </a>
          </nav>

          {/* Registration pill */}
          <div className="hidden md:flex items-center flex-shrink-0">
            <div className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold border transition-all',
              registrationOpen
                ? 'bg-brand-green/10 border-brand-green/30 text-brand-green'
                : 'bg-white/[0.05] border-white/10 text-white/30'
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', registrationOpen ? 'bg-brand-green animate-pulse' : 'bg-white/20')} />
              {registrationOpen ? 'Open' : 'Closed'}
            </div>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/[0.07] transition-colors" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-brand-purple animate-slide-down">
          <div className="px-4 py-3 space-y-1">
            <div className={cn('flex items-center justify-center gap-2 px-4 py-2.5 mb-1 rounded-xl text-[13px] font-bold border', registrationOpen ? 'bg-brand-green/10 border-brand-green/20 text-brand-green' : 'bg-white/[0.04] border-white/10 text-white/30')}>
              <span className={cn('w-1.5 h-1.5 rounded-full', registrationOpen ? 'bg-brand-green animate-pulse' : 'bg-white/20')} />
              Registration {registrationOpen ? 'Open' : 'Closed'}
            </div>
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={cn('flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all', pathname === href ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/[0.07]')}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            ))}
            <a href={contactHref} onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/[0.07] transition-all">
              <Mail className="w-4 h-4" />Contact
            </a>
          </div>
        </div>
      )}
    </header>
  )
}