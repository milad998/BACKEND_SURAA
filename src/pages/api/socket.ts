// src/pages/api/socket.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as SocketIOServer } from 'socket.io'

export default function handler(req: NextApiRequest, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (res.socket.server.io) {
    console.log('Socket is already running')
    return res.status(200).json({ message: 'Socket is already running' })
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
        socket.broadcast.emit('user-online', userId)
        socket.emit('joined-room', { userId, success: true })
      })

      socket.on('user-status', (data: { userId: string; status: string }) => {
        console.log(`🔄 Status update: ${data.userId} -> ${data.status}`)
        socket.broadcast.emit('status-changed', data)
      })

      socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id)
      })

      socket.on('ping', () => {
        socket.emit('pong', { message: 'Server is alive!', timestamp: Date.now() })
      })
    })

    res.socket.server.io = io
    console.log('🚀 Socket.io server initialized successfully')
    return res.status(200).json({ message: 'Socket started successfully' })

  } catch (error) {
    console.error('❌ Socket initialization error:', error)
    return res.status(500).json({ error: 'Socket initialization failed' })
  }
}