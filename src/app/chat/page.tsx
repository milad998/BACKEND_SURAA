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
}

export default function ChatPage() {
  const { user: authUser, loading, logout } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<ChatUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [currentUserStatus, setCurrentUserStatus] = useState<'ONLINE' | 'OFFLINE' | 'AWAY'>('ONLINE')
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
            avatar: u.avatar
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
        // استخدام بيانات وهمية للاختبار إذا فشل الاتصال
        
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      // استخدام بيانات وهمية في حالة الخطأ
      
    } finally {
      setIsLoading(false)
    }
  }

  // بيانات وهمية للاختبار
  

  useEffect(() => {
    if (!loading && !authUser) {
      router.push('/login')
      return
    }

    if (authUser) {
      initializeSocket()
      fetchUsers()
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
        // إذا فشل إنشاء المحادثة، انتقل إلى صفحة محادثة افتراضية
        router.push(`/chat/${receiverId}`)
      }
    } catch (error) {
      console.error('Error starting private chat:', error)
      router.push(`/chat/${receiverId}`)
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
      return <span className="badge bg-success">🟢</span>
    } else if (userItem.status === 'AWAY') {
      return <span className="badge bg-warning">🟡</span>
    } else {
      return <span className="badge bg-secondary">⚫</span>
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

  if (!authUser) return null

  return (
    <div className="container-fluid vh-100 dark-theme">
      <div className="row h-100">
        <div className="col-12">
          <div ">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3 shadow-sm p-3 bg-body-tertiary rounded"
              style={{backdropFilter:'blur(27px)'}}
            >
              <div className="d-flex align-items-center">
                <h4 className="mb-0 fw-bold dark-text ">SURAACHAT</h4>
                <span className="badge bg-primary">
                  
                </span>
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
                          {(onlineUsers.has(userItem.id) || userItem.status === 'ONLINE') && (
                            <span className="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle">
                              <span className="visually-hidden">متصل</span>
                            </span>
                          )}
                        </div>
                        <div>
                          <h6 className="dark-text mb-1">{userItem.name}</h6>
                          <small className="dark-text-muted">{getStatusText(userItem.status)}</small>
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
