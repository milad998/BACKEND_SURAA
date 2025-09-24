// src/types/index.ts
import { Server as NetServer, Socket } from 'net'
import { NextApiResponse } from 'next'
import { Server as SocketIOServer } from 'socket.io'

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io: SocketIOServer
    }
  }
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  status: 'ONLINE' | 'OFFLINE' | 'AWAY'
  lastSeen?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Chat {
  id: string
  name?: string
  type: 'PRIVATE' | 'GROUP'
  background?: string
  createdAt: Date
  updatedAt: Date
  users: ChatUser[]
  messages: Message[]
}

export interface ChatUser {
  id: string
  userId: string
  chatId: string
  joinedAt: Date
  user: User
}

export interface Message {
  id: string
  content: string
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VOICE'
  encrypted: boolean
  isRead: boolean
  senderId: string
  receiverId?: string
  chatId: string
  createdAt: Date
  updatedAt: Date
  sender: User
  receiver?: User
}

export interface SocketEvents {
  // الأحداث المرسلة من العميل إلى الخادم
  'join-room': (userId: string) => void
  'send-message': (data: {
    content: string
    chatId: string
    type: Message['type']
    receiverId?: string
    encrypted?: boolean
  }) => void
  'mark-as-read': (data: {
    messageIds: string[]
    chatId: string
    readerId: string
  }) => void
  'user-status': (data: {
    userId: string
    status: User['status']
  }) => void

  // الأحداث المرسلة من الخادم إلى العميل
  'receive-message': (message: Message) => void
  'messages-read': (data: {
    chatId: string
    readerId: string
  }) => void
  'user-online': (userId: string) => void
  'user-offline': (userId: string) => void
  'status-changed': (data: {
    userId: string
    status: User['status']
  }) => void
}
// أضف هذا إلى ملف types/index.ts
export interface ChatUser {
  id: string
  name: string
  email: string
  status: 'ONLINE' | 'OFFLINE' | 'AWAY'
  lastSeen?: string
  avatar?: string
}