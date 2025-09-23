'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface Chat {
  id: string
  name?: string
  type: string
  users: any[]
}

interface ChatContextType {
  currentChat: Chat | null
  setCurrentChat: (chat: Chat | null) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)

  return (
    <ChatContext.Provider value={{ currentChat, setCurrentChat }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    // throw new Error('useChat must be used within a ChatProvider')
    console.log("d")
  }
  return context
}