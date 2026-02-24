import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ghost Ship — Private Package Routing',
  description: 'Receive packages from fans and brands without ever exposing your real address.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}
