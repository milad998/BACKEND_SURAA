'use client'
import { useState, useEffect, useRef, useCallback, memo } from 'react'

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
  isRead?: boolean
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

const MessageItem = memo(({ 
  message, 
  isMe, 
  showAvatar, 
  showDate, 
  chatType,
  formatTime 
}: { 
  message: Message
  isMe: boolean
  showAvatar: boolean
  showDate: boolean
  chatType: string
  formatTime: (dateString: string) => string
}) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/default-avatar.png'
  }

  return (
    <div>
      {showDate && (
        <div className="text-center my-3 ">
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

      <div className={`d-flex mb-3 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
        {!isMe && showAvatar && (
          <img 
            src={message.sender.avatar || '/default-avatar.png'} 
            alt={message.sender.name}
            className="rounded-circle me-2 align-self-end"
            width="32"
            height="32"
            onError={handleImageError}
          />
        )}
        
        <div className={`message-bubble p-2 rounded-5 d-flex flex-row gap-2 ${
          isMe ? 'message-sent bg-primary text-white' : 'message-received bg-white border'
        }`} style={{ maxWidth: '70%',fontSize:14}}>
          {chatType === 'GROUP' && !isMe && (
            <div className="message-sender fw-bold mb-1 small">
              {message.sender.name}
            </div>
          )}
          
          <div className="message-content">{message.content}</div>
          
          <div className={`message-time mt-1 small ${isMe ? 'text-light' : 'text-muted'}`}>
            <span className="opacity-75 " style={{fontSize:10}}>
              {formatTime(message.createdAt)}
            </span>
            {isMe && (
              <span className="ms-1">
                {message.isRead ? (
                  <i className="fas fa-check-double text-info"></i>
                ) : (
                  <i className="fas fa-check"></i>
                )}
              </span>
            )}
          </div>
        </div>

        {isMe && showAvatar && (
          <img 
            src={message.sender.avatar || '/default-avatar.png'} 
            alt={message.sender.name}
            className="rounded-circle ms-2 align-self-end"
            width="32"
            height="32"
            onError={handleImageError}
          />
        )}
      </div>
    </div>
  )
})

MessageItem.displayName = 'MessageItem'

export default function ChatWindow({ chat, currentUser, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected')
  const [showScrollButton, setShowScrollButton] = useState(false)

  // جلب الرسائل من API
  const fetchMessages = useCallback(async () => {
    if (!isPolling) return
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/messages?chatId=${chat.id}&limit=100&timestamp=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-cache'
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setConnectionStatus('disconnected')
    }
  }, [chat.id, isPolling])

  // جلب الرسائل بشكل دوري
  useEffect(() => {
    fetchMessages()
    
    const interval = setInterval(fetchMessages, 2000)
    
    return () => {
      clearInterval(interval)
    }
  }, [fetchMessages])

  // التمرير إلى الأسفل عند وجود رسائل جديدة
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // مراقبة التمرير لإظهار/إخفاء زر الانتقال
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom)
    }
  }, [])

  // إضافة مستمع حدث التمرير
  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // تحديد الرسائل كمقروءة
  const markMessagesAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const unreadMessages = messages.filter(msg => 
        !msg.isRead && msg.senderId !== currentUser.id
      )

      if (unreadMessages.length === 0) return

      await Promise.all(
        unreadMessages.map(async (message) => {
          const response = await fetch(`/api/messages/`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messageId: message.id
            })
          })

          if (response.ok) {
            setMessages(prev => prev.map(msg =>
              msg.id === message.id ? { ...msg, isRead: true } : msg
            ))
          }
        })
      )
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }, [messages, currentUser.id])

  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead()
    }
  }, [messages, markMessagesAsRead])

  // إرسال رسالة جديدة
  const sendMessage = useCallback(async () => {
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
  }, [newMessage, sending, chat.id])

  // التمرير إلى أحدث رسالة
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
      setShowScrollButton(false)
    }
  }, [])

  // الحصول على اسم الدردشة
  const getChatName = useCallback((currentChat?: Chat): string => {
    const chatToUse = currentChat || chat
    if (chatToUse.type === 'PRIVATE') {
      const otherUser = chatToUse.users.find((u: ChatUser) => u.user.id !== currentUser.id)
      return otherUser?.user.name || 'محادثة خاصة'
    }
    return chatToUse.name || `مجموعة (${chatToUse.users.length})`
  }, [chat, currentUser.id])

  // الحصول على صورة الدردشة
  const getChatAvatar = useCallback((): string => {
    if (chat.type === 'PRIVATE') {
      const otherUser = chat.users.find((u: ChatUser) => u.user.id !== currentUser.id)
      return otherUser?.user.avatar || '/default-avatar.png'
    }
    return '/group-avatar.png'
  }, [chat, currentUser.id])

  // تنسيق الوقت
  const formatTime = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  // معالجة خطأ تحميل الصورة
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/default-avatar.png'
  }, [])

  // إرسال الرسالة عند الضغط على Enter
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  // التحكم في التحديث التلقائي عند تبديل النوافذ
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPolling(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <div className="d-flex flex-column h-100 bg-light">
      {/* الهيدر الثابت في الأعلى */}
      <div className="fixed-top p-3 border-bottom bg-white shadow-sm" style={{flexShrink: 0, zIndex: 1000}}>
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
              <small className={`text-${connectionStatus === 'connected' ? 'success' : 'danger'}`}>
                <i className={`fas fa-circle me-1`} style={{fontSize: '8px'}}></i>
                {connectionStatus === 'connected' ? 'متصل' : 'غير متصل'}
              </small>
            </div>
          </div>

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
                  <i className="fas fa-users me-2"></i>معلومات {chat.type === 'GROUP' ? 'المجموعة' : 'المحادثة'}
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item text-danger">
                  <i className="fas fa-sign-out-alt me-2"></i>
                  {chat.type === 'GROUP' ? 'مغادرة المجموعة' : 'حذف المحادثة'}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* منطقة الرسائل - قابلة للتمرير */}
      <div 
        ref={messagesContainerRef}
        className="flex-grow-1 overflow-auto position-relative"
        style={{minHeight: 0, marginBottom: 100, marginTop: 80}}
      >
        <div className="d-flex flex-column p-3">
          {messages.length === 0 ? (
            <div className="text-center text-muted my-5 mb-5">
              <i className="fas fa-comments fa-3x mb-3 opacity-50"></i>
              <p>لا توجد رسائل بعد. ابدأ المحادثة الآن!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isMe = message.senderId === currentUser.id
              const showAvatar = chat.type === 'GROUP'
              const showDate = index === 0 || 
                new Date(message.createdAt).toDateString() !== 
                new Date(messages[index - 1].createdAt).toDateString()

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  isMe={isMe}
                  showAvatar={showAvatar}
                  showDate={showDate}
                  chatType={chat.type}
                  formatTime={formatTime}
                />
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* زر الانتقال لآخر رسالة */}
        {showScrollButton && (
          <button
            className="btn btn-primary shadow-sm"
            onClick={scrollToBottom}
            style={{
              position: 'fixed',
              bottom: '120px',
              right: '20px',
              borderRadius: '50%',
              width: '45px',
              height: '45px',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="الانتقال لآخر رسالة"
            title="الانتقال لآخر رسالة"
          >
            <i className="fas fa-chevron-down"></i>
          </button>
        )}
      </div>

      {/* الفوتر الثابت في الأسفل */}
      <div className="fixed-bottom p-3 border-top bg-white" style={{zIndex: 1000}}>
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
