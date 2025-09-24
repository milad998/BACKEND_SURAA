// src/pages/api/socket.ts (إذا كنت تستخدم Pages Router)
// أو src/app/api/socket/route.ts (إذا كنت تستخدم App Router)

import { NextApiRequest, NextApiResponse } from 'next'
import { Server as SocketIOServer } from 'socket.io'

export default function handler(req: NextApiRequest, res: any) {
  // إذا كان السوكيت يعمل بالفعل
  if (res.socket.server.io) {
    console.log('Socket is already running')
    res.status(200).json({ message: 'Socket is already running' })
    return
  }

  console.log('Initializing Socket.io server...')

  try {
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket/io',
      addTrailingSlash: false,
    })

    io.on('connection', (socket) => {
      console.log('✅ User connected:', socket.id)

      socket.on('join-room', (userId: string) => {
        console.log(`🎯 User ${userId} joined room`)
        socket.join(userId)
        // إرسال حدث للمستخدمين الآخرين
        socket.broadcast.emit('user-online', userId)
        
        // تأكيد للمستخدم الحالي
        socket.emit('joined-room', { userId, success: true })
      })

      socket.on('user-status', (data: { userId: string; status: string }) => {
        console.log(`🔄 Status update: ${data.userId} -> ${data.status}`)
        socket.broadcast.emit('status-changed', data)
      })

      socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id)
      })

      // حدث لاختبار الاتصال
      socket.on('ping', () => {
        socket.emit('pong', { message: 'Server is alive!', timestamp: Date.now() })
      })
    })

    res.socket.server.io = io
    console.log('🚀 Socket.io server initialized successfully')
    res.status(200).json({ message: 'Socket started successfully' })

  } catch (error) {
    console.error('❌ Socket initialization error:', error)
    res.status(500).json({ error: 'Socket initialization failed' })
  }
}