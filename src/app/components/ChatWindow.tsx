'use client'
import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  content: string
  senderId: string
  type: string
  encrypted: boolean
  createdAt: string
  sender: {
    id: string
    name: string
    avatar?: string
  }
}

interface Chat {
  id: string
  name?: string
  type: string
  users: any[]
}

interface ChatWindowProps {
  chat: Chat
  currentUser: any
  onBack: () => void
}

export default function ChatWindow({ chat, currentUser, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    // تحديث الرسائل كل 5 ثواني
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [chat.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

  const getChatName = () => {
    if (chat.type === 'PRIVATE') {
      const otherUser = chat.users.find((u: any) => u.user.id !== currentUser.id)
      return otherUser?.user.name || 'محادثة خاصة'
    }
    return chat.name || `مجموعة (${chat.users.length})`
  }

  const getChatAvatar = () => {
    if (chat.type === 'PRIVATE') {
      const otherUser = chat.users.find((u: any) => u.user.id !== currentUser.id)
      return otherUser?.user.avatar || '/default-avatar.png'
    }
    return '/group-avatar.png'
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="d-flex flex-column h-100 bg-light">
      {/* رأس المحادثة */}
      <div className="p-3 border-bottom bg-white shadow-sm">
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-light btn-sm me-3 d-md-none"
            onClick={onBack}
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
              onError={(e) => {
                e.currentTarget.src = '/default-avatar.png'
              }}
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

          <div className="dropdown">
            <button 
              className="btn btn-light btn-sm dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><a className="dropdown-item" href="#"><i className="fas fa-users me-2"></i>معلومات المجموعة</a></li>
              <li><a className="dropdown-item" href="#"><i className="fas fa-bell me-2"></i>إعدادات الإشعارات</a></li>
              <li><hr className="dropdown-divider" /></li>
              <li><a className="dropdown-item text-danger" href="#"><i className="fas fa-sign-out-alt me-2"></i>مغادرة المحادثة</a></li>
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
                      />
                    )}
                    
                    <div className={`message-bubble p-3 position-relative ${
                      isMe ? 'message-sent' : 'message-received'
                    }`}>
                      {chat.type === 'GROUP' && !isMe && (
                        <div className="message-sender fw-bold mb-1">
                          {message.sender.name}
                        </div>
                      )}
                      
                      <div className="message-content">{message.content}</div>
                      
                      <div className="message-time text-end mt-1">
                        <small className="opacity-75">
                          {formatTime(message.createdAt)}
                        </small>
                        {isMe && (
                          <i className={`fas fa-check${message ? '-double text-info' : ''} ms-1`}></i>
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
          <button className="btn btn-light border" type="button">
            <i className="fas fa-paperclip"></i>
          </button>
          
          <button className="btn btn-light border" type="button">
            <i className="fas fa-image"></i>
          </button>
          
          <input
            type="text"
            className="form-control border-0"
            placeholder="اكتب رسالتك هنا..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={sending}
          />
          
          <button
            className="btn btn-primary px-4"
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
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