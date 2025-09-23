'use client'
import { useState, useEffect, useRef } from 'react'

interface User {
  id: string
  name: string
  avatar?: string
}

interface ChatUser {
  user: User
}

interface Message {
  id: string
  content: string
  senderId: string
  type: string
  encrypted: boolean
  createdAt: string
  read?: boolean // أضفنا هذه الخاصية
  sender: User
}

interface Chat {
  id: string
  name?: string
  type: string
  users: ChatUser[]
}

interface ChatWindowProps {
  chat: Chat
  currentUser: User
  onBack: () => void
}

export default function ChatWindow({ chat, currentUser, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [lastMessageId, setLastMessageId] = useState<string | null>(null)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)

  // تحميل الصوت عند بدء التشغيل
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3')
    audioRef.current.preload = 'auto'
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // جلب الرسائل وتحديثها كل 5 ثواني
  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [chat.id])

  // التمرير إلى الأسفل عند تغيير الرسائل
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // تشغيل الصوت عند وصول رسالة جديدة
  useEffect(() => {
    if (messages.length > 0 && audioRef.current && isSoundEnabled) {
      const lastMessage = messages[messages.length - 1]
      
      // إذا كانت الرسالة جديدة وليست من المستخدم الحالي
      if (lastMessage.id !== lastMessageId && lastMessage.senderId !== currentUser.id) {
        playNotificationSound()
        setLastMessageId(lastMessage.id)
      }
    }
  }, [messages, lastMessageId, currentUser.id, isSoundEnabled])

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch((error) => {
        console.log('Failed to play notification sound:', error)
      })
    }
  }

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/messages?chatId=${chat.id}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newMessage,
          chatId: chat.id,
          type: 'TEXT'
        })
      })

      if (response.ok) {
        const message = await response.json()
        setMessages(prev => [...prev, message])
        setNewMessage('')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getChatName = (): string => {
    if (chat.type === 'PRIVATE') {
      const otherUser = chat.users.find((u: ChatUser) => u.user.id !== currentUser.id)
      return otherUser?.user.name || 'محادثة خاصة'
    }
    return chat.name || `مجموعة (${chat.users.length})`
  }

  const getChatAvatar = (): string => {
    if (chat.type === 'PRIVATE') {
      const otherUser = chat.users.find((u: ChatUser) => u.user.id !== currentUser.id)
      return otherUser?.user.avatar || '/default-avatar.png'
    }
    return '/group-avatar.png'
  }

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/default-avatar.png'
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage()
    }
  }

  return (
    <div className="d-flex flex-column h-100 bg-light">
      {/* رأس المحادثة */}
      <div className="p-3 border-bottom bg-white shadow-sm">
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-light btn-sm me-3 d-md-none"
            onClick={onBack}
            aria-label="العودة"
          >
            <i className="fas fa-arrow-right"></i>
          </button>
          
          <div className="flex-grow-1 d-flex align-items-center">
            <img 
              src={getChatAvatar()} 
              alt={getChatName()}
              className="rounded-circle me-3"
              width="40"
              height="40"
              onError={handleImageError}
            />
            <div>
              <h6 className="mb-0 fw-bold">{getChatName()}</h6>
              <small className="text-muted">
                {chat.type === 'PRIVATE' ? 
                  'محادثة خاصة' : 
                  `${chat.users.length} أعضاء في المجموعة`
                }
              </small>
            </div>
          </div>

          {/* زر التحكم بالإشعارات الصوتية */}
          <button 
            className="btn btn-light btn-sm me-2"
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            aria-label={isSoundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
          >
            <i className={isSoundEnabled ? "fas fa-bell" : "fas fa-bell-slash"}></i>
          </button>

          <div className="dropdown">
            <button 
              className="btn btn-light btn-sm dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="خيارات المحادثة"
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button className="dropdown-item">
                  <i className="fas fa-users me-2"></i>معلومات المجموعة
                </button>
              </li>
              <li>
                <button className="dropdown-item">
                  <i className="fas fa-bell me-2"></i>إعدادات الإشعارات
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item text-danger">
                  <i className="fas fa-sign-out-alt me-2"></i>مغادرة المحادثة
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-grow-1 p-3 overflow-auto">
        <div className="d-flex flex-column">
          {messages.length === 0 ? (
            <div className="text-center text-muted my-5">
              <i className="fas fa-comments fa-3x mb-3"></i>
              <p>لا توجد رسائل بعد. ابدأ المحادثة الآن!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isMe = message.senderId === currentUser.id
              const showAvatar = chat.type === 'GROUP' && !isMe
              const showDate = index === 0 || 
                new Date(message.createdAt).toDateString() !== 
                new Date(messages[index - 1].createdAt).toDateString()

              return (
                <div key={message.id}>
                  {/* تاريخ جديد */}
                  {showDate && (
                    <div className="text-center my-3">
                      <span className="badge bg-secondary px-3 py-2">
                        {new Date(message.createdAt).toLocaleDateString('ar-EG', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}

                  {/* الرسالة */}
                  <div className={`d-flex mb-3 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                    {showAvatar && (
                      <img 
                        src={message.sender.avatar || '/default-avatar.png'} 
                        alt={message.sender.name}
                        className="rounded-circle me-2 align-self-end"
                        width="32"
                        height="32"
                        onError={handleImageError}
                      />
                    )}
                    
                    <div className={`message-bubble p-3 position-relative rounded-3 ${
                      isMe ? 'message-sent bg-primary text-white' : 'message-received bg-white border'
                    }`} style={{ maxWidth: '70%' }}>
                      {chat.type === 'GROUP' && !isMe && (
                        <div className="message-sender fw-bold mb-1 small">
                          {message.sender.name}
                        </div>
                      )}
                      
                      <div className="message-content">{message.content}</div>
                      
                      <div className={`message-time mt-1 small ${isMe ? 'text-light' : 'text-muted'}`}>
                        <span className="opacity-75">
                          {formatTime(message.createdAt)}
                        </span>
                        {isMe && (
                          <i className="fas fa-check ms-1"></i> {/* تم إصلاح هذا السطر */}
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* منطقة إرسال الرسالة */}
      <div className="p-3 border-top bg-white">
        <div className="input-group">
          <button className="btn btn-light border" type="button" aria-label="إرفاق ملف">
            <i className="fas fa-paperclip"></i>
          </button>
          
          <button className="btn btn-light border" type="button" aria-label="إرسال صورة">
            <i className="fas fa-image"></i>
          </button>
          
          <input
            type="text"
            className="form-control border-0"
            placeholder="اكتب رسالتك هنا..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            aria-label="نص الرسالة"
          />
          
          <button
            className="btn btn-primary px-4"
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            aria-label="إرسال الرسالة"
          >
            {sending ? (
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">جاري الإرسال...</span>
              </div>
            ) : (
              <i className="fas fa-paper-plane"></i>
            )}
          </button>
        </div>
        
        <div className="mt-2 text-muted text-center">
          <small>اضغط Enter للإرسال</small>
        </div>
      </div>
    </div>
  )
}
