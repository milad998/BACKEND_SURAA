'use client'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ChatPageProps {
  params: Promise<{ id: string }>
}

export default function ChatPage({ params }: ChatPageProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [chatId, setChatId] = useState('')
  const [messages, setMessages] = useState([
    { id: 1, text: 'مرحباً! كيف حالك؟', sender: 'other', time: '10:30' },
    { id: 2, text: 'أنا بخير، شكراً لك!', sender: 'me', time: '10:31' },
    { id: 3, text: 'كيف سارت الأمور اليوم؟', sender: 'other', time: '10:32' }
  ])
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    // حل الـ Promise للحصول على params
    params.then(resolvedParams => {
      setChatId(resolvedParams.id)
    }).catch(error => {
      console.error('Error resolving params:', error)
    })
  }, [params])

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  const sendMessage = () => {
    if (newMessage.trim()) {
      setMessages([...messages, {
        id: messages.length + 1,
        text: newMessage,
        sender: 'me',
        time: new Date().toLocaleTimeString()
      }])
      setNewMessage('')
    }
  }

  if (!user) return null

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <button 
            onClick={() => router.back()}
            style={{ marginLeft: '10px', background: '#f3f4f6', border: 'none', padding: '8px', borderRadius: '50%' }}
          >
            ←
          </button>
          <h2 style={{ margin: 0 }}>المحادثة {chatId}</h2>
        </div>

        <div style={{ height: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                marginBottom: '15px',
                textAlign: message.sender === 'me' ? 'left' : 'right'
              }}
            >
              <div
                style={{
                  background: message.sender === 'me' ? '#3b82f6' : '#e5e7eb',
                  color: message.sender === 'me' ? 'white' : '#374151',
                  padding: '10px 15px',
                  borderRadius: '18px',
                  display: 'inline-block',
                  maxWidth: '70%'
                }}
              >
                {message.text}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
                {message.time}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتب رسالة..."
            className="form-input"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage} className="btn btn-primary">
            إرسال
          </button>
        </div>
      </div>
    </div>
  )
}