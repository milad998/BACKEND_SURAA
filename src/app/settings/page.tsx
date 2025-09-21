'use client'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState({
    notifications: true,
    sound: true,
    theme: 'light'
  })

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  const handleSave = () => {
    alert('تم حفظ الإعدادات بنجاح!')
  }

  if (!user) return null

  return (
    <div className="container">
      <div className="card">
        <h2 className="card-header">الإعدادات</h2>
        
        <div className="form-group">
          <label className="form-label">الاسم</label>
          <input
            type="text"
            defaultValue={user.name}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">البريد الإلكتروني</label>
          <input
            type="email"
            defaultValue={user.email}
            className="form-input"
            disabled
          />
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
            />
            تشغيل الإشعارات
          </label>
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={settings.sound}
              onChange={(e) => setSettings({ ...settings, sound: e.target.checked })}
            />
            تشغيل الصوت
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">المظهر</label>
          <select
            value={settings.theme}
            onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
            className="form-input"
          >
            <option value="light">فاتح</option>
            <option value="dark">داكن</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
          <button onClick={handleSave} className="btn btn-primary">
            حفظ الإعدادات
          </button>
          <button onClick={logout} className="btn btn-secondary">
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  )
}