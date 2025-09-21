'use client'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>جاري التحميل...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container">
      <div className="hero">
        <h1 className="hero-title">مرحباً بك في تطبيق المحادثة</h1>
        <p className="hero-subtitle">تواصل مع أصدقائك بأمان وسهولة</p>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h3 className="card-header">محادثاتي</h3>
          <ul className="chat-list">
            <li className="chat-item">
              <div className="chat-name">أحمد محمد</div>
              <div className="chat-last-message">مرحباً! كيف حالك؟</div>
              <span className="status-online">● متصل</span>
            </li>
            <li className="chat-item">
              <div className="chat-name">فريق العمل</div>
              <div className="chat-last-message">علي: تم الانتهاء من المهمة</div>
              <span className="status-offline">● غير متصل</span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h3 className="card-header">الإحصاءات</h3>
          <div style={{ padding: '20px 0' }}>
            <p>عدد المحادثات: <strong>12</strong></p>
            <p>الرسائل المرسلة: <strong>156</strong></p>
            <p>الأصدقاء النشطين: <strong>8</strong></p>
          </div>
        </div>

        <div className="card">
          <h3 className="card-header">الوسائط الحديثة</h3>
          <div className="media-grid">
            <div className="media-item">
              <img src="/api/placeholder/150/100" alt="صورة" />
            </div>
            <div className="media-item">
              <img src="/api/placeholder/150/100" alt="صورة" />
            </div>
            <div className="media-item">
              <img src="/api/placeholder/150/100" alt="صورة" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-header">بدء محادثة جديدة</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary">محادثة فردية</button>
          <button className="btn btn-secondary">إنشاء مجموعة</button>
        </div>
      </div>
    </div>
  )
}