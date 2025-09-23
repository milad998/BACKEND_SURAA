'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import ChatWindow from '../components/ChatWindow'

interface User {
  id: string
  name: string
  email: string
  status: string
  lastSeen?: string
}

interface Chat {
  id: string
  name?: string
  type: string
  users: any[]
  messages: any[]
  updatedAt: string
  unreadCount?: number
}

export default function ChatPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats')
  const [groupName, setGroupName] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchChats()
      fetchUsers()
    }
  }, [user, loading, router])

  const fetchChats = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setChats(data)
      }
    } catch (error) {
      console.error('Error fetching chats:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const createNewChat = async (userIds: string[], chatName?: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userIds,
          name: chatName || groupName,
          type: userIds.length === 1 ? 'PRIVATE' : 'GROUP'
        })
      })

      if (response.ok) {
        const newChat = await response.json()
        setChats(prev => [newChat, ...prev])
        setSelectedChat(newChat)
        setShowNewChatModal(false)
        setSelectedUsers([])
        setGroupName('')
        setActiveTab('chats')
      }
    } catch (error) {
      console.error('Error creating chat:', error)
    }
  }

  const filteredChats = chats.filter(chat => {
    if (chat.type === 'PRIVATE') {
      const otherUser = chat.users.find((u: any) => u.user.id !== user?.id)
      return otherUser?.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return chat.name?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const filteredUsers = users.filter(userItem =>
    userItem.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getLastMessage = (chat: Chat) => {
    const lastMessage = chat.messages[0]
    if (!lastMessage) return 'لا توجد رسائل بعد'
    
    // تقصير الرسالة الطويلة
    return lastMessage.content.length > 30 
      ? lastMessage.content.substring(0, 30) + '...' 
      : lastMessage.content
  }

  const getUnreadCount = (chat: Chat) => {
    return chat.unreadCount || 0
  }

  const getChatDisplayName = (chat: Chat) => {
    if (chat.type === 'PRIVATE') {
      const otherUser = chat.users.find((u: any) => u.user.id !== user?.id)
      return otherUser?.user.name || 'مستخدم'
    }
    return chat.name || `مجموعة (${chat.users.length})`
  }

  const getChatIcon = (chat: Chat) => {
    return chat.type === 'PRIVATE' ? 'fas fa-user' : 'fas fa-users'
  }

  const getUserInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'أمس'
    } else if (days < 7) {
      return date.toLocaleDateString('ar-EG', { weekday: 'long' })
    } else {
      return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
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
        {/* الشريط الجانبي */}
        <div className="col-md-4 col-lg-3 dark-surface border-end border-dark p-0">
          <div className="d-flex flex-column h-100">
            {/* رأس الشريط الجانبي */}
            <div className="p-4 border-bottom border-dark">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0 fw-bold dark-text">المحادثات</h4>
                <button 
                  className="btn btn-primary rounded-circle p-2"
                  onClick={() => setShowNewChatModal(true)}
                  title="محادثة جديدة"
                  style={{width: '44px', height: '44px'}}
                >
                  <i className="fas fa-edit"></i>
                </button>
              </div>
              
              {/* شريط البحث */}
              <div className="search-box p-2">
                <div className="input-group input-group-lg border-0">
                  <span className="input-group-text bg-transparent border-0">
                    <i className="fas fa-search dark-text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control bg-transparent border-0 dark-text"
                    placeholder="ابحث في المحادثات..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{outline: 'none', boxShadow: 'none'}}
                  />
                  {searchTerm && (
                    <button 
                      className="input-group-text bg-transparent border-0"
                      onClick={() => setSearchTerm('')}
                    >
                      <i className="fas fa-times dark-text-muted"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ألسنة التبويب */}
            <div className="px-4 pt-3">
              <div className="nav nav-pills nav-fill gap-2">
                <button 
                  className={`nav-link rounded-pill ${activeTab === 'chats' ? 'active bg-primary' : 'dark-text-muted'}`}
                  onClick={() => setActiveTab('chats')}
                >
                  <i className="fas fa-comments me-2"></i>
                  المحادثات
                </button>
                <button 
                  className={`nav-link rounded-pill ${activeTab === 'contacts' ? 'active bg-primary' : 'dark-text-muted'}`}
                  onClick={() => setActiveTab('contacts')}
                >
                  <i className="fas fa-users me-2"></i>
                  جهات الاتصال
                </button>
              </div>
            </div>

            {/* قائمة المحادثات/جهات الاتصال */}
            <div className="flex-grow-1 overflow-auto px-3 py-3">
              {activeTab === 'chats' ? (
                filteredChats.length === 0 ? (
                  <div className="text-center dark-text-muted p-5">
                    <div className="icon-wrapper mx-auto mb-3" style={{width: '80px', height: '80px'}}>
                      <i className="fas fa-comments fa-2x"></i>
                    </div>
                    <p className="mb-3">لا توجد محادثات بعد</p>
                    <button 
                      className="btn btn-primary rounded-pill px-4"
                      onClick={() => setShowNewChatModal(true)}
                    >
                      <i className="fas fa-plus me-2"></i>
                      بدء محادثة جديدة
                    </button>
                  </div>
                ) : (
                  filteredChats.map(chat => (
                    <div 
                      key={chat.id}
                      className={`chat-item p-3 mb-2 rounded-3 cursor-pointer ${
                        selectedChat?.id === chat.id ? 'active' : 'dark-surface'
                      }`}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="d-flex align-items-center">
                        <div className="icon-wrapper me-3" style={{width: '48px', height: '48px'}}>
                          <i className={getChatIcon(chat)}></i>
                        </div>
                        <div className="flex-grow-1 min-w-0">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <h6 className="mb-0 fw-bold truncate">{getChatDisplayName(chat)}</h6>
                            <small className="dark-text-muted chat-time">
                              {formatTime(chat.updatedAt)}
                            </small>
                          </div>
                          <p className="mb-0 truncate dark-text-muted small">
                            {getLastMessage(chat)}
                          </p>
                        </div>
                        {getUnreadCount(chat) > 0 && (
                          <span className="badge bg-danger rounded-pill ms-2">
                            {getUnreadCount(chat)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )
              ) : (
                filteredUsers.length === 0 ? (
                  <div className="text-center dark-text-muted p-5">
                    <div className="icon-wrapper mx-auto mb-3" style={{width: '80px', height: '80px'}}>
                      <i className="fas fa-users fa-2x"></i>
                    </div>
                    <p>لا توجد جهات اتصال</p>
                  </div>
                ) : (
                  filteredUsers.map(userItem => (
                    <div 
                      key={userItem.id}
                      className="chat-item p-3 mb-2 rounded-3 cursor-pointer dark-surface"
                      onClick={() => createNewChat([userItem.id])}
                    >
                      <div className="d-flex align-items-center">
                        <div className="position-relative me-3">
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{
                              width: '48px',
                              height: '48px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              fontSize: '1.1rem'
                            }}
                          >
                            {getUserInitials(userItem.name)}
                          </div>
                          <span className={`position-absolute bottom-0 start-0 user-status ${
                            userItem.status === 'ONLINE' ? 'status-online' :
                            userItem.status === 'AWAY' ? 'status-away' : 'status-offline'
                          }`}></span>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-0 fw-bold dark-text">{userItem.name}</h6>
                          <small className="dark-text-muted">{userItem.email}</small>
                        </div>
                        <i className="fas fa-chevron-left dark-text-muted"></i>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

            {/* معلومات المستخدم */}
            <div className="p-3 border-top border-dark">
              <div className="d-flex align-items-center">
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-3"
                  style={{
                    width: '44px',
                    height: '44px',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    fontSize: '1rem'
                  }}
                >
                  {getUserInitials(user.name)}
                </div>
                
                <div className="dropdown">
                  <button 
                    className="btn btn-link dark-text dropdown-toggle p-0"
                    type="button"
                    data-bs-toggle="dropdown"
                    style={{width: '32px', height: '32px'}}
                  >
                    <i className="fas fa-ellipsis-v"></i>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-dark dropdown-menu-end">
                    <li>
                      <button className="dropdown-item" onClick={logout}>
                        <i className="fas fa-sign-out-alt me-2"></i>
                        تسجيل الخروج
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* منطقة المحادثة */}
        <div className="col-md-8 col-lg-9 p-0">
          {selectedChat ? (
            <ChatWindow 
              chat={selectedChat} 
              currentUser={user}
              onBack={() => setSelectedChat(null)}
            />
          ) : (
            <div className="d-flex justify-content-center align-items-center h-100 dark-surface">
              <div className="text-center dark-text-muted">
                <div className="icon-wrapper mx-auto mb-4" style={{width: '120px', height: '120px'}}>
                  <i className="fas fa-comments fa-3x"></i>
                </div>
                <h3 className="dark-text mb-3">مرحباً في تطبيق المحادثة</h3>
                <p className="mb-4">اختر محادثة من القائمة لبدء الدردشة أو ابدأ محادثة جديدة</p>
                <button 
                  className="btn btn-primary rounded-pill px-4 py-2"
                  onClick={() => setShowNewChatModal(true)}
                >
                  <i className="fas fa-plus me-2"></i>
                  بدء محادثة جديدة
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal إنشاء محادثة جديدة */}
      {showNewChatModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(15, 23, 42, 0.8)'}}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content dark-surface border border-dark rounded-3 shadow-medium">
              <div className="modal-header border-dark p-4">
                <h4 className="modal-title dark-text fw-bold">إنشاء محادثة جديدة</h4>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowNewChatModal(false)
                    setSelectedUsers([])
                    setGroupName('')
                  }}
                ></button>
              </div>
              
              <div className="modal-body p-4">
                <div className="mb-4">
                  <label className="form-label dark-text fw-medium mb-3">اختر المستخدمين</label>
                  <div className="max-h-300 overflow-auto">
                    {users.map(userItem => (
                      <div key={userItem.id} className="form-check py-3 border-bottom border-dark">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selectedUsers.includes(userItem.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(prev => [...prev, userItem.id])
                            } else {
                              setSelectedUsers(prev => prev.filter(id => id !== userItem.id))
                            }
                          }}
                        />
                        <label className="form-check-label d-flex align-items-center w-100">
                          <div className="position-relative me-3">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                              style={{
                                width: '44px',
                                height: '44px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              }}
                            >
                              {getUserInitials(userItem.name)}
                            </div>
                            <span className={`position-absolute bottom-0 start-0 user-status ${
                              userItem.status === 'ONLINE' ? 'status-online' :
                              userItem.status === 'AWAY' ? 'status-away' : 'status-offline'
                            }`}></span>
                          </div>
                          <div className="flex-grow-1">
                            <div className="dark-text fw-medium">{userItem.name}</div>
                            <small className="dark-text-muted">{userItem.email}</small>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedUsers.length > 1 && (
                  <div className="mb-4">
                    <label className="form-label dark-text fw-medium mb-2">اسم المجموعة</label>
                    <input 
                      type="text" 
                      className="form-control dark-surface border-dark dark-text rounded-2 p-3"
                      placeholder="أدخل اسمًا للمجموعة..."
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                    />
                  </div>
                )}
              </div>
              
              <div className="modal-footer border-dark p-4">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary rounded-2 px-4"
                  onClick={() => {
                    setShowNewChatModal(false)
                    setSelectedUsers([])
                    setGroupName('')
                  }}
                >
                  إلغاء
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary rounded-2 px-4"
                  onClick={() => createNewChat(selectedUsers, groupName)}
                  disabled={selectedUsers.length === 0 || (selectedUsers.length > 1 && !groupName.trim())}
                >
                  <i className="fas fa-plus me-2"></i>
                  إنشاء محادثة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
