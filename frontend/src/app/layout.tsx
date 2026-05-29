import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Writing OS',
  description: 'AI Writing Operating System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body
        className="antialiased"
        style={{
          fontFamily: 'system-ui, sans-serif',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {children}
      </body>
    </html>
  )
}
