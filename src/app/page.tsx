'use client'
import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import ChatWindow from './components/ChatWindow'

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

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])

  const chatId = searchParams.get('chatId')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchChats()
      
      if (chatId) {
        fetchChat(chatId)
      } else {
        setCurrentChat(null)
        // إذا لم يكن هناك chatId، نتحقق من localStorage
        const savedChatId = localStorage.getItem('currentChatId')
        if (savedChatId) {
          fetchChat(savedChatId)
        }
      }
    }
  }, [user, loading, router, chatId])

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
        
        // إذا كان هناك chatId في URL، نبحث عنه في القائمة المحملة
        if (chatId) {
          const foundChat = data.find((chat: Chat) => chat.id === chatId)
          if (foundChat && !currentChat) {
            setCurrentChat(foundChat)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error)
    }
  }

  const fetchChat = async (id: string) => {
    setChatLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/chats/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const chat = await response.json()
        setCurrentChat(chat)
        localStorage.setItem('currentChatId', id)
      } else {
        // البحث في قائمة المحادثات المحملة
        const foundChat = chats.find(chat => chat.id === id)
        if (foundChat) {
          setCurrentChat(foundChat)
          localStorage.setItem('currentChatId', id)
        } else {
          setCurrentChat(null)
          localStorage.removeItem('currentChatId')
        }
      }
    } catch (error) {
      console.error('Error fetching chat:', error)
      // البحث في قائمة المحادثات المحملة كبديل
      const foundChat = chats.find(chat => chat.id === id)
      if (foundChat) {
        setCurrentChat(foundChat)
        localStorage.setItem('currentChatId', id)
      } else {
        setCurrentChat(null)
        localStorage.removeItem('currentChatId')
      }
    } finally {
      setChatLoading(false)
    }
  }

  const handleBack = () => {
    // العودة إلى الصفحة الرئيسية بدون chatId
    router.push('/')
    localStorage.removeItem('currentChatId')
  }

  const goToChats = () => {
    router.push('/chat')
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 dark-theme">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
            <span className="visually-hidden">جاري التحميل...</span>
          </div>
          <p className="dark-text-muted">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  // إذا كان هناك chatId ولكن المحادثة لم تحمل بعد
  if (chatId && chatLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 dark-theme">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
            <span className="visually-hidden">جاري التحميل...</span>
          </div>
          <p className="dark-text-muted">جاري تحميل المحادثة...</p>
        </div>
      </div>
    )
  }

  // إذا كان هناك chatId ولكن لم يتم العثور على المحادثة
  if (chatId && !currentChat) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center vh-100 dark-surface">
        <div className="text-center dark-text-muted">
          <i className="fas fa-comments fa-4x mb-4 opacity-50"></i>
          <h4 className="mb-3">لم يتم العثور على المحادثة</h4>
          <p className="mb-4">المحادثة مع المعرف {chatId} غير موجودة</p>
          <div className="d-flex gap-3">
            <button 
              className="btn btn-primary rounded-pill px-4"
              onClick={handleBack}
            >
              <i className="fas fa-home me-2"></i>
              الصفحة الرئيسية
            </button>
            <button 
              className="btn btn-outline-primary rounded-pill px-4"
              onClick={goToChats}
            >
              <i className="fas fa-comments me-2"></i>
              جميع المحادثات
            </button>
          </div>
        </div>
      </div>
    )
  }

  // إذا كانت هناك محادثة حالية، عرض نافذة المحادثة
  if (currentChat) {
    return (
      <div className="container-fluid vh-100 dark-theme">
        <div className="row h-100">
          {/* زر العودة للشاشات الصغيرة */}
          <div className="col-12 d-md-none p-3 border-bottom border-dark bg-dark">
            <button 
              className="btn btn-light btn-sm"
              onClick={handleBack}
              aria-label="العودة إلى الصفحة الرئيسية"
            >
              <i className="fas fa-arrow-left me-2"></i>
              العودة
            </button>
          </div>
          
          {/* نافذة المحادثة */}
          <div className="col-12 p-0">
            <ChatWindow 
              chat={currentChat}
              currentUser={user}
              onBack={handleBack}
            />
          </div>
        </div>
      </div>
    )
  }

}