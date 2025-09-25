'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

// تعريف النوع المحلي مع status
interface ChatUser {
  id: string
  name: string
  email: string
  status: 'ONLINE' | 'OFFLINE' | 'AWAY'
  lastSeen?: string
  avatar?: string
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
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [currentUserStatus, setCurrentUserStatus] = useState<'ONLINE' | 'OFFLINE' | 'AWAY'>('ONLINE')
  const [unreadMessages, setUnreadMessages] = useState<Map<string, number>>(new Map()) // Map<userId, unreadCount>
  const [notifications, setNotifications] = useState<Message[]>([])
  const socketRef = useRef<any>(null)
  
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
            status: u.status || 'OFFLINE',
            lastSeen: u.lastSeen,
            avatar: u.avatar,
            unreadCount: 0
          }))

        setUsers(formattedUsers)
        
        // تحديث حالة المستخدمين المتصلين
        const onlineSet = new Set<string>()
        formattedUsers.forEach((u: ChatUser) => {
          if (u.status === 'ONLINE') {
            onlineSet.add(u.id)
          }
        })
        setOnlineUsers(onlineSet)
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
      initializeSocket()
      fetchUsers()
      fetchUnreadMessages() // جلب الرسائل غير المقروءة
      // تحديث حالة المستخدم إلى ONLINE عند الدخول
      updateUserStatusOnServer('ONLINE')
    }

    return () => {
      if (socketRef.current) {
        // تحديث الحالة إلى OFFLINE عند الخروج
        updateUserStatusOnServer('OFFLINE')
        socketRef.current.disconnect()
      }
    }
  }, [authUser, loading, router])

  const initializeSocket = async () => {
    if (!authUser || socketRef.current) return

    try {
      const { default: io } = await import('socket.io-client')
      
      socketRef.current = io({
        path: '/api/socket/io',
        query: { userId: authUser.id },
        transports: ['websocket', 'polling']
      })

      socketRef.current.on('connect', () => {
        console.log('Connected to server')
        socketRef.current?.emit('join-room', authUser.id)
        setCurrentUserStatus('ONLINE')
      })

      socketRef.current.on('user-online', (userId: string) => {
        setOnlineUsers(prev => new Set(prev.add(userId)))
        updateUserStatus(userId, 'ONLINE')
      })

      socketRef.current.on('user-offline', (userId: string) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(userId)
          return newSet
        })
        updateUserStatus(userId, 'OFFLINE')
      })

      socketRef.current.on('status-changed', (data: { userId: string; status: 'ONLINE' | 'OFFLINE' | 'AWAY' }) => {
        updateUserStatus(data.userId, data.status)
      })

      // استقبال رسالة جديدة
      socketRef.current.on('new-message', (message: Message) => {
        if (message.receiverId === authUser.id) {
          // زيادة عدد الرسائل غير المقروءة للمرسل
          setUnreadMessages(prev => {
            const newMap = new Map(prev)
            const currentCount = newMap.get(message.senderId) || 0
            newMap.set(message.senderId, currentCount + 1)
            return newMap
          })

          // تحديث واجهة المستخدمين
          setUsers(prevUsers => 
            prevUsers.map(user => 
              user.id === message.senderId 
                ? { ...user, unreadCount: (user.unreadCount || 0) + 1 }
                : user
            )
          )

          // إظهار إشعار للمستخدم
          showNotification(message)
        }
      })

      // حدث عندما يتم قراءة الرسائل
      socketRef.current.on('messages-read', (data: { senderId: string, readerId: string }) => {
        if (data.readerId === authUser.id) {
          // إعادة تعيين عدد الرسائل غير المقروءة للمرسل
          setUnreadMessages(prev => {
            const newMap = new Map(prev)
            newMap.set(data.senderId, 0)
            return newMap
          })

          setUsers(prevUsers => 
            prevUsers.map(user => 
              user.id === data.senderId 
                ? { ...user, unreadCount: 0 }
                : user
            )
          )
        }
      })

      socketRef.current.on('error', (error: any) => {
        console.error('Socket error:', error)
      })

      socketRef.current.on('disconnect', () => {
        setCurrentUserStatus('OFFLINE')
      })

    } catch (error) {
      console.error('Failed to initialize socket:', error)
    }
  }

  // دالة لإظهار الإشعارات
  const showNotification = (message: Message) => {
    // إضافة الرسالة إلى قائمة الإشعارات
    setNotifications(prev => [...prev, message])
    
    // إشعار المتصفح (إذا كان مدعومًا)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('رسالة جديدة من ' + getSenderName(message.senderId), {
        body: message.content.length > 50 
          ? message.content.substring(0, 50) + '...' 
          : message.content,
        icon: '/favicon.ico',
        tag: 'chat-message'
      })
    }
    
    // إشعار صوتي (اختياري)
    playNotificationSound()
    
    // إزالة الإشعار تلقائيًا بعد 5 ثواني
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== message.id))
    }, 5000)
  }

  // دالة لتشغيل صوت الإشعار
  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3') // تأكد من وجود الملف
    audio.play().catch(() => console.log('تعذر تشغيل صوت الإشعار'))
  }

  // طلب إذن الإشعارات
  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('تم منح إذن الإشعارات')
        }
      })
    }
  }

  const getSenderName = (senderId: string) => {
    const user = users.find(u => u.id === senderId)
    return user?.name || 'مستخدم'
  }

  const updateUserStatus = (userId: string, status: 'ONLINE' | 'OFFLINE' | 'AWAY') => {
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u.id === userId ? { ...u, status } : u
      )
    )
  }

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
        router.push(`/?chatId=${newChat.id}`)
      } else {
        router.push(`/chat/${receiverId}`)
      }
    } catch (error) {
      console.error('Error starting private chat:', error)
      router.push(`/chat/${receiverId}`)
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

        // إرسال حدث عبر Socket
        if (socketRef.current) {
          socketRef.current.emit('mark-messages-read', {
            senderId,
            readerId: authUser?.id
          })
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const updateUserStatusOnServer = async (status: 'ONLINE' | 'OFFLINE' | 'AWAY') => {
    if (!authUser) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        if (socketRef.current) {
          socketRef.current.emit('user-status', {
            userId: authUser.id,
            status
          })
        }
        setCurrentUserStatus(status)
      } else {
        console.error('Failed to update status:', response.status)
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleStatusChange = async (status: 'ONLINE' | 'OFFLINE' | 'AWAY') => {
    await updateUserStatusOnServer(status)
  }

  const handleLogout = async () => {
    try {
      await updateUserStatusOnServer('OFFLINE')
      await logout()
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const getStatusBadge = (userItem: ChatUser) => {
    const isOnline = onlineUsers.has(userItem.id) || userItem.status === 'ONLINE'
    
    if (isOnline) {
      return <span className="badge">🟢</span>
    } else if (userItem.status === 'AWAY') {
      return <span className="badge">🟡</span>
    } else {
      return <span className="badge">⚫</span>
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
                <button 
                  className="btn btn-outline-primary btn-sm ms-3"
                  onClick={requestNotificationPermission}
                  
                >
                  <i className="fas fa-bell"></i>
                </button>
              </div>
              
              <div className="d-flex align-items-center">
                <select 
                  className="form-select me-2"
                  onChange={(e) => handleStatusChange(e.target.value as 'ONLINE' | 'OFFLINE' | 'AWAY')}
                  value={currentUserStatus}
                  style={{width: 'auto'}}
                >
                  <option value="ONLINE">🟢</option>
                  <option value="AWAY">🟡</option>
                  <option value="OFFLINE">⚫</option>
                </select>
                
                <button 
                  className="btn btn-outline-danger rounded-pill px-3"
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt me-2"></i>
                  تسجيل الخروج
                </button>
              </div>
            </div>
            
            {/* منطقة الإشعارات */}
            <div className="position-fixed top-0 end-0 p-3" style={{zIndex: 1050}}>
              {notifications.map(notification => (
                <div key={notification.id} className="alert alert-info alert-dismissible fade show mb-2 shadow">
                  <strong>رسالة جديدة من {getSenderName(notification.senderId)}</strong>
                  <br />
                  <small>{notification.content}</small>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  ></button>
                </div>
              ))}
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
                          {(onlineUsers.has(userItem.id) || userItem.status === 'ONLINE') && (
                            <span className="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle">
                              <span className="visually-hidden">متصل</span>
                            </span>
                          )}
                        </div>
                        <div>
                          <h6 className="dark-text mb-1 d-flex align-items-center">
                            {userItem.name}
                            {getUnreadBadge(userItem)}
                          </h6>
                          <small className="dark-text-muted">{userItem.status}</small>
                        </div>
                      </div>
                      
                      <div>
                        {getStatusBadge(userItem)}
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
