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
  unreadCount?: number
}

export default function ChatPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
      setIsLoading(true)
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
        
        // جلب عدد الرسائل غير المقروءة لكل مستخدم
        const usersWithUnreadCount = await Promise.all(
          filteredUsers.map(async (userItem: User) => {
            try {
              const unreadCount = await getUnreadCount(userItem.id)
              return { ...userItem, unreadCount }
            } catch (error) {
              console.error(`Error fetching unread count for user ${userItem.id}:`, error)
              return { ...userItem, unreadCount: 0 }
            }
          })
        )
        
        setUsers(usersWithUnreadCount)
      } else {
        console.error('Failed to fetch users:', response.status)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getUnreadCount = async (userId: string): Promise<number> => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/chats/unread-count?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        console.log("لم تجل رقم الرسائل")
      }

      const data = await response.json()
      return data.unreadCount
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  }

  const refreshUnreadCounts = async () => {
    if (!user || users.length === 0) return

    try {
      const updatedUsers = await Promise.all(
        users.map(async (userItem) => {
          try {
            const unreadCount = await getUnreadCount(userItem.id)
            return { ...userItem, unreadCount }
          } catch (error) {
            console.error(`Error refreshing unread count for user ${userItem.id}:`, error)
            return userItem
          }
        })
      )
      setUsers(updatedUsers)
    } catch (error) {
      console.error('Error refreshing unread counts:', error)
    }
  }

  useEffect(() => {
    if (user && users.length > 0) {
      // تحديث عدد الرسائل غير المقروءة كل 10 ثواني
      const interval = setInterval(refreshUnreadCounts, 10000)
      return () => clearInterval(interval)
    }
  }, [user, users.length])

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
        
        // إعادة تعيين عدد الرسائل غير المقروءة عند فتح المحادثة
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === userId ? { ...u, unreadCount: 0 } : u
          )
        )
        
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

  if (loading || isLoading) {
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
            
            <div className="list-group">
              {users.length === 0 ? (
                <div className="text-center p-5">
                  <p className="dark-text-muted">لا يوجد مستخدمون متاحون للدردشة</p>
                </div>
              ) : (
                users.map(userItem => (
                  <div 
                    key={userItem.id}
                    className="list-group-item dark-surface border-dark cursor-pointer mb-2 shadow-sm p-3 bg-body-tertiary rounded position-relative"
                    onClick={() => startPrivateChat(userItem.id)}
                    style={{
                      backgroundColor: "#6586f432",
                      backdropFilter: 'blur(75px)',
                      border: "None",
                      transition: 'background-color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#4190ff75'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#6586f432'
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <div className="mx-3 position-relative">
                        <i className="fas fa-user fa-2x text-primary"></i>
                        {/* عرض عدد الرسائل غير المقروءة فقط إذا كانت أكبر من صفر
                        {userItem.unreadCount && userItem.unreadCount > 0 && (
                          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                            {userItem.unreadCount > 99 ? '99+' : userItem.unreadCount}
                            <span className="visually-hidden">رسائل غير مقروءة</span>
                          </span>
                        )} */}
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="dark-text mb-1">{userItem.name}</h6>
                        <small className="dark-text-muted d-block">{userItem.email}</small>
                        
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