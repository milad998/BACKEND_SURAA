'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import LoadingScreen from './components/LoadingScreen'
import './globals.css'

export default function Home() {
  const { user, logout, loading } = useAuth()
  const router = useRouter()

  // عرض شاشة التحميل إذا كان جاري التحقق من تسجيل الدخول
  if (loading) {
    return <LoadingScreen />
  }

  // إعادة التوجيه إذا لم يكن المستخدم مسجل دخول
  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold">تطبيق المحادثة</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">مرحباً، {user.name}</span>
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-6 bg-white shadow">
            <h2 className="text-2xl font-semibold mb-4">لوحة التحكم</h2>
            <p className="text-gray-600 mb-4">
              مرحباً بك في تطبيق المحادثة، {user.name}!
            </p>
            <div className="space-y-2">
              <p><strong>ID المستخدم:</strong> {user.id}</p>
              <p><strong>البريد الإلكتروني:</strong> {user.email}</p>
              <p><strong>الاسم:</strong> {user.name}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
