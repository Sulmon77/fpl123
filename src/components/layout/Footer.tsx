'use client'
// src/components/layout/Footer.tsx

import Link from 'next/link'

interface FooterProps {
  whatsapp?: string
  instagram?: string
  tiktok?: string
  email?: string
  facebook?: string
  x?: string
  platformName?: string
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )
}
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
    </svg>
  )
}
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}
function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  )
}

export function Footer({ whatsapp, instagram, tiktok, email, facebook, x, platformName = 'FPL123' }: FooterProps) {
  const socialLinks = [
    whatsapp  && { href: `https://wa.me/${whatsapp}`, icon: WhatsAppIcon, label: 'WhatsApp', color: '#25D366' },
    instagram && { href: `https://instagram.com/${instagram}`, icon: InstagramIcon, label: 'Instagram', color: '#E1306C' },
    tiktok    && { href: `https://tiktok.com/@${tiktok}`, icon: TikTokIcon, label: 'TikTok', color: '#ffffff' },
    email     && { href: `mailto:${email}`, icon: MailIcon, label: 'Email', color: '#04F5FF' },
    facebook  && { href: facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}`, icon: FacebookIcon, label: 'Facebook', color: '#1877F2' },
    x         && { href: `https://x.com/${x}`, icon: XIcon, label: 'X', color: '#ffffff' },
  ].filter(Boolean) as Array<{ href: string; icon: React.ComponentType<{ className?: string }>; label: string; color: string }>

  return (
    <footer id="contact" className="bg-brand-purple relative overflow-hidden">
      {/* subtle grid bg */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex flex-col items-center gap-10">

          {/* Brand mark */}
          <div className="text-center">
            <p className="font-display font-bold text-3xl text-white tracking-tight mb-1">{platformName}</p>
            <p className="text-[13px] text-white/35 font-medium">Your FPL Performance, Finally Recognised</p>
          </div>

          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="flex flex-col items-center gap-5 w-full">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/25">Connect</p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {socialLinks.map(({ href, icon: Icon, label, color }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    style={{ '--hover-color': color } as React.CSSProperties}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-xl
                               bg-white/[0.05] border border-white/[0.08]
                               hover:bg-white/[0.1] hover:border-white/20
                               transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <Icon className="w-4 h-4 text-white/40 group-hover:text-white/80 transition-colors" />
                    <span className="text-[13px] font-semibold text-white/40 group-hover:text-white/70 transition-colors">
                      {label}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Divider + links */}
          <div className="w-full max-w-sm border-t border-white/[0.08] pt-8 flex items-center justify-center gap-6 flex-wrap">
            {[
              { href: '/terms', label: 'Terms' },
              { href: '/enter', label: 'Enter' },
              { href: '/standings', label: 'Standings' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[13px] font-medium text-white/30 hover:text-white/70 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          <p className="text-[11px] text-white/15 text-center max-w-sm leading-relaxed">
            Not affiliated with Fantasy Premier League or the Premier League.
          </p>
        </div>
      </div>
    </footer>
  )
}