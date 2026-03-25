import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Noto_Sans_JP } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PWAInstall } from '@/components/pwa-install'
import './globals.css'

const _geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const _geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const _notoSansJP = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-noto-sans-jp", weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: 'Clean Ambassador',
  description: 'Have a clean day!!! — 掃除当番管理アプリ',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clean Ambassador',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: '/icon-192.png',
  },
}

export const viewport = {
  themeColor: '#1e293b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`${_notoSansJP.variable} font-sans antialiased`}>
        <PWAInstall />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
