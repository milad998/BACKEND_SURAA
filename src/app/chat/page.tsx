'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

// تعريف النوع المحلي بدون status
interface ChatUser {
  id: string
  name: string
  email: string
  unreadCount?: number // إضافة عدد الرسائل غير المقروءة
}

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  timestamp: string
  read: boolean
  chatId?: string
}

export default function ChatPage() {
  const { user: authUser, loading, logout } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<ChatUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadMessages, setUnreadMessages] = useState<Map<string, number>>(new Map()) // Map<userId, unreadCount>
  
  // دالة لجلب المستخدمين من API الصحيح
  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      
      // استخدام API صحيح لجلب المستخدمين
      const response = await fetch('/api/auth/register', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const usersData = data.users || data
        
        const formattedUsers: ChatUser[] = usersData
          .filter((u: any) => u.id !== authUser?.id)
          .map((u: any) => ({
            id: u.id,
            name: u.name || u.email?.split('@')[0] || 'مستخدم',
            email: u.email,
            unreadCount: 0
          }))

        setUsers(formattedUsers)
      } else {
        console.error('Failed to fetch users:', response.status)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // دالة لجلب الرسائل غير المقروءة
  const fetchUnreadMessages = async () => {
    if (!authUser) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/messages/unread', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const unreadMessagesData = await response.json()
        
        // تحديث خريطة الرسائل غير المقروءة
        const newUnreadMap = new Map<string, number>()
        unreadMessagesData.forEach((msg: Message) => {
          const senderId = msg.senderId
          const currentCount = newUnreadMap.get(senderId) || 0
          newUnreadMap.set(senderId, currentCount + 1)
        })
        
        setUnreadMessages(newUnreadMap)
        
        // تحديث عدد الرسائل غير المقروءة لكل مستخدم
        setUsers(prevUsers => 
          prevUsers.map(user => ({
            ...user,
            unreadCount: newUnreadMap.get(user.id) || 0
          }))
        )
      }
    } catch (error) {
      console.error('Error fetching unread messages:', error)
    }
  }

  useEffect(() => {
    if (!loading && !authUser) {
      router.push('/login')
      return
    }

    if (authUser) {
      fetchUsers()
      fetchUnreadMessages() // جلب الرسائل غير المقروءة
    }
  }, [authUser, loading, router])

  const startPrivateChat = async (receiverId: string) => {
    try {
      const token = localStorage.getItem('token')
      
      // وضع علامة على الرسائل كمقروءة قبل فتح المحادثة
      await markMessagesAsRead(receiverId)

      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userIds: [receiverId],
          type: 'PRIVATE'
        })
      })

      if (response.ok) {
        const newChat = await response.json()

        router.push(`/?chatid=${newChat.id}`)
      } else {
        // إذا فشل إنشاء المحادثة، انتقل إلى صفحة محادثة افتراضية
        router.push(`/?chatid=${receiverId}`)
      }
    } catch (error) {
      console.error('Error starting private chat:', error)
      // في حالة الخطأ، انتقل إلى صفحة محادثة افتراضية
      router.push(`/chat${receiverId}`)

    }
  }

  // دالة لوضع علامة على الرسائل كمقروءة
  const markMessagesAsRead = async (senderId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/messages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ senderId })
      })

      if (response.ok) {
        // تحديث الحالة المحلية
        setUnreadMessages(prev => {
          const newMap = new Map(prev)
          newMap.set(senderId, 0)
          return newMap
        })

        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === senderId 
              ? { ...user, unreadCount: 0 }
              : user
          )
        )
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
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

  // إظهار عدد الرسائل غير المقروءة
  const getUnreadBadge = (userItem: ChatUser) => {
    const unreadCount = userItem.unreadCount || 0
    if (unreadCount > 0) {
      return (
        <span className="badge bg-danger rounded-pill ms-2">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )
    }
    return null
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

  if (!authUser) return null

  return (
    <div className="container-fluid vh-100 dark-theme">
      <div className="row h-100">
        <div className="col-12">
          <div>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3 shadow-sm p-3 bg-body-tertiary rounded"
              style={{backdropFilter:'blur(27px)'}}
            >
              <div className="d-flex align-items-center">
                <h4 className="mb-0 fw-bold dark-text">SURAACHAT</h4>
              </div>
              
              <div className="d-flex align-items-center">
                <button 
                  className="btn btn-outline-danger rounded-pill px-3"
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt me-2"></i>
                  تسجيل الخروج
                </button>
              </div>
            </div>
            
            {/* Users List */}
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
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#4190ff75'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#6586f432'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <div className="mx-3 position-relative">
                          <i className="fas fa-user fa-2x text-primary"></i>
                        </div>
                        <div>
                          <h6 className="dark-text mb-1 d-flex align-items-center">
                            {userItem.name}
                            {getUnreadBadge(userItem)}
                          </h6>
                          <small className="dark-text-muted">اضغط لبدء المحادثة</small>
                        </div>
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
