'use client'
import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
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

function HomeContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])

  // Fix: Add null check for searchParams
  const chatId = searchParams?.get('chatId') || null

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
    router.push('/chat')
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

  if (currentChat) {
    return (
      <ChatWindow 
        chat={currentChat}
        currentUser={user}
        onBack={handleBack}
      />
    )
  }

  return null
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="d-flex justify-content-center align-items-center vh-100 dark-theme">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
            <span className="visually-hidden">جاري التحميل...</span>
          </div>
          <p className="dark-text-muted">جاري تحميل الصفحة...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
