// src/app/layout.tsx
import type { Metadata } from 'next'
import { Barlow, Barlow_Condensed, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const barlow = Barlow({
  subsets:['latin'],
  weight:['400', '500', '600', '700'],
  variable: '--font-barlow',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight:['600', '700', '800'],
  variable: '--font-barlow-condensed',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight:['400', '500', '600', '700'],
  variable: '--font-jetbrains',
})

export const metadata: Metadata = {
  title: 'FPL123',
  description:
    'Enter each gameweek, get grouped with other managers, and compete for prizes based on your Fantasy Premier League points.',
  keywords:['FPL', 'Fantasy Premier League', 'Kenya', 'FPL giveaway', 'FPL competition'],
  openGraph: {
    title: 'FPL123',
    description: 'Your FPL Performance, Finally Recognised',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${barlow.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-text-primary`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}