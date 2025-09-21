'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون على الأقل 6 أحرف')
      setLoading(false)
      return
    }

    const success = await register(name, email, password)
    
    if (success) {
      router.push('/login?message=تم إنشاء الحساب بنجاح، يرجى تسجيل الدخول')
    } else {
      setError('فشل في إنشاء الحساب، قد يكون البريد الإلكتروني مستخدم بالفعل')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
      <div className="bg-white p-4 rounded shadow w-100" style={{ maxWidth: '24rem' }}>
        <h1 className="h4 fw-bold mb-4 text-center">إنشاء حساب جديد</h1>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="mb-3">
          <div className="mb-3">
            <label className="form-label">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control"
              required
            />
          </div>
          
          <div className="mb-3">
            <label className="form-label">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              required
            />
          </div>
          
          <div className="mb-3">
            <label className="form-label">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              required
              minLength={6}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-100"
          >
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </button>
        </form>
        
        <p className="text-center text-secondary">
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="text-primary text-decoration-none">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  )
}
