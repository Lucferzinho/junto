import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Juntô',
  description: 'Corra junto. É muito melhor.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%231D9E75'/><text y='.9em' font-size='75' x='12'>🏃</text></svg>",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, background: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  )
}