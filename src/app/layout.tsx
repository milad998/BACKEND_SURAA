import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import 'bootstrap/dist/css/bootstrap.min.css';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'تطبيق المحادثة',
  description: 'تطبيق محادثة آمن',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}