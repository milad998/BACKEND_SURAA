'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  status: string
  lastSeen?: string
}

export default function ChatPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchUsers()
    }
  }, [user, loading, router])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/auth/register', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const filteredUsers = (data.users || data).filter((u: User) => u.id !== user?.id)
        setUsers(filteredUsers)
      } else {
        console.error('Failed to fetch users:', response.status)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const startPrivateChat = async (userId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userIds: [userId],
          type: 'PRIVATE'
        })
      })

      if (response.ok) {
        const newChat = await response.json()
        router.push(`/?chatId=${newChat.id}`)
      }
    } catch (error) {
      console.error('Error starting private chat:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 dark-theme">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
            <span className="visually-hidden">جاري التحميل...</span>
          </div>
          <p className="dark-text-muted">جاري تحميل المحادثات...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container-fluid vh-100 dark-theme">
      <div className="row h-100">
        <div className="col-12">
          <div className="p-3">
            <div className="d-flex justify-content-between align-items-center mb-4 shadow-sm p-3 mb-5 bg-body-tertiary rounded"
              style={{backdropFilter:'blur(27px)'}}
            >
              <h4 className="mb-0 fw-bold dark-text">المستخدمون المتاحون</h4>
              <button 
                className="btn btn-outline-danger rounded-pill px-3"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt me-2"></i>
                تسجيل الخروج
              </button>
            </div>
            
            {/* تغيير من grid إلى rows */}
            <div className="list-group">
              {users.length === 0 ? (
                <div className="text-center p-5">
                  <p className="dark-text-muted">لا يوجد مستخدمون متاحون للدردشة</p>
                </div>
              ) : (
                users.map(userItem => (
                  <div 
                    key={userItem.id}
                    className="list-group-item dark-surface border-dark cursor-pointer mb-2 shadow-sm p-3 mb-5 bg-body-tertiary rounded"
                    onClick={() => startPrivateChat(userItem.id)}
                    style={{backgroundColor:"#6586f432",backdropFilter:'blur(75px)' ,border:"None"}}
                    onMouseMove={(e) => {
  e.currentTarget.style.backgroundColor = '#fff';
}}

                  >
                    <div className="d-flex align-items-center">
                      <div className="mx-3">
                        <i className="fas fa-user fa-2x text-primary"></i>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1 dark-text">{userItem.name}</h6>
                        <small className="dark-text-muted">{userItem.email}</small>
                      </div>
                      <div>
                        <span className={`badge ${userItem.status === 'online' ? 'bg-success' : 'bg-secondary'}`}>
                          {userItem.status === 'online' ? 'متصل' : 'غير متصل'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}