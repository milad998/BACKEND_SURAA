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
  const [groupName, setGroupName] = useState('')
  const [modalSearchTerm, setModalSearchTerm] = useState('')

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
      const response = await fetch('/api/auth/register', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // استبعاد المستخدم الحالي من القائمة
        const filteredUsers = data.filter((u: User) => u.id !== user?.id)
        setUsers(filteredUsers)
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
        setModalSearchTerm('')
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

  const filteredModalUsers = users.filter(userItem =>
    userItem.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
    userItem.email.toLowerCase().includes(modalSearchTerm.toLowerCase())
  )

  const getLastMessage = (chat: Chat) => {
    const lastMessage = chat.messages[0]
    if (!lastMessage) return 'لا توجد رسائل بعد'
    
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

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleUserSelect = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId))
    } else {
      setSelectedUsers(prev => [...prev, userId])
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
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-primary rounded-circle p-2"
                    onClick={() => setShowNewChatModal(true)}
                    title="محادثة جديدة"
                    style={{width: '44px', height: '44px'}}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button 
                    className="btn btn-outline-danger rounded-circle p-2"
                    onClick={handleLogout}
                    title="تسجيل الخروج"
                    style={{width: '44px', height: '44px'}}
                  >
                    <i className="fas fa-sign-out-alt"></i>
                  </button>
                </div>
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

            {/* قائمة المحادثات */}
            <div className="flex-grow-1 overflow-auto px-3 py-3">
              {filteredChats.length === 0 ? (
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
                      selectedChat?.id === chat.id ? 'active bg-primary text-white' : 'dark-surface'
                    }`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <div className="d-flex align-items-center">
                      <div className={`icon-wrapper me-3 ${selectedChat?.id === chat.id ? 'text-white' : 'text-primary'}`} style={{width: '48px', height: '48px'}}>
                        <i className={getChatIcon(chat)}></i>
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <h6 className="mb-0 fw-bold truncate">{getChatDisplayName(chat)}</h6>
                          <small className={selectedChat?.id === chat.id ? 'text-light' : 'dark-text-muted'}>
                            {formatTime(chat.updatedAt)}
                          </small>
                        </div>
                        <p className={`mb-0 truncate small ${selectedChat?.id === chat.id ? 'text-light' : 'dark-text-muted'}`}>
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
              )}
            </div>

            {/* تذييل الشريط الجانبي */}
            <div className="p-3 border-top border-dark">
              <div className="d-flex align-items-center">
                <div className="position-relative me-3">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                    style={{
                      width: '44px',
                      height: '44px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      fontSize: '1.1rem'
                    }}
                  >
                    {getUserInitials(user.name)}
                  </div>
                  <span className="position-absolute bottom-0 start-0 status-online"></span>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-0 fw-bold dark-text">{user.name}</h6>
                  <small className="dark-text-muted">متصل الآن</small>
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
            
              <p className="mb-0">اختر محادثة من القائمة لبدء المحادثة</p>
              
          )}
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
                    setModalSearchTerm('')
                  }}
                ></button>
              </div>
              
              <div className="modal-body p-4">
                {/* شريط البحث في المودال */}
                <div className="mb-4">
                  <div className="search-box p-2 border border-dark rounded-2">
                    <div className="input-group border-0">
                      <span className="input-group-text bg-transparent border-0">
                        <i className="fas fa-search dark-text-muted"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control bg-transparent border-0 dark-text"
                        placeholder="ابحث عن مستخدمين..."
                        value={modalSearchTerm}
                        onChange={(e) => setModalSearchTerm(e.target.value)}
                        style={{outline: 'none', boxShadow: 'none'}}
                      />
                      {modalSearchTerm && (
                        <button 
                          className="input-group-text bg-transparent border-0"
                          onClick={() => setModalSearchTerm('')}
                        >
                          <i className="fas fa-times dark-text-muted"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* قائمة المستخدمين المحددين */}
                {selectedUsers.length > 0 && (
                  <div className="mb-4">
                    <label className="form-label dark-text fw-medium mb-2">المستخدمون المحددون ({selectedUsers.length})</label>
                    <div className="d-flex flex-wrap gap-2">
                      {selectedUsers.map(userId => {
                        const userItem = users.find(u => u.id === userId)
                        return userItem ? (
                          <span key={userId} className="badge bg-primary d-flex align-items-center gap-2 p-2">
                            {userItem.name}
                            <button 
                              type="button" 
                              className="btn-close btn-close-white btn-close-sm"
                              onClick={() => handleUserSelect(userId)}
                            ></button>
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

                {/* قائمة جميع المستخدمين */}
                <div className="mb-4">
                  <label className="form-label dark-text fw-medium mb-3">
                    جميع المستخدمين ({filteredModalUsers.length})
                  </label>
                  <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                    {filteredModalUsers.length === 0 ? (
                      <div className="text-center dark-text-muted p-4">
                        <i className="fas fa-users fa-2x mb-3 opacity-50"></i>
                        <p>لا توجد مستخدمين مطابقين للبحث</p>
                      </div>
                    ) : (
                      filteredModalUsers.map(userItem => (
                        <div 
                          key={userItem.id} 
                          className={`d-flex align-items-center py-3 px-2 rounded-2 cursor-pointer ${
                            selectedUsers.includes(userItem.id) ? 'bg-primary text-white' : 'border-bottom border-dark'
                          }`}
                          onClick={() => handleUserSelect(userItem.id)}
                        >
                          <div className="position-relative me-3">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                              style={{
                                width: '44px',
                                height: '44px',
                                background: selectedUsers.includes(userItem.id) 
                                  ? 'rgba(255,255,255,0.2)' 
                                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: selectedUsers.includes(userItem.id) ? 'white' : 'white',
                                fontSize: '1rem'
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
                            <div className="fw-medium">{userItem.name}</div>
                            <small className={selectedUsers.includes(userItem.id) ? 'text-light' : 'dark-text-muted'}>
                              {userItem.email}
                            </small>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={selectedUsers.includes(userItem.id)}
                              onChange={() => handleUserSelect(userItem.id)}
                              style={{width: '20px', height: '20px'}}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                {/* حقل اسم المجموعة */}
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
                    setModalSearchTerm('')
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
