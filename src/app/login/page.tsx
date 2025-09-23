'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user, login } = useAuth()

  useEffect(() => {
    if (user) {
      router.push('/chat')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const success = await login(email, password)
    
    if (success) {
      router.push('/chat')
    } else {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
      <div className="bg-white p-4 rounded shadow w-100" style={{ maxWidth: '24rem' }}>
        <h1 className="h4 fw-bold mb-4 text-center">تسجيل الدخول</h1>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="mb-3">
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
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-100"
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
        
        <p className="text-center text-secondary">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-primary text-decoration-none">
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </div>
  )
}
