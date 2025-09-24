// src/pages/api/socket.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as SocketIOServer } from 'socket.io'

export default function SocketHandler(
  req: NextApiRequest,
  res: any // استخدام any لتجنب مشاكل الأنواع
) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (res.socket.server.io) {
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
      console.log('User connected:', socket.id)

      socket.on('join-room', (userId: string) => {
        socket.join(userId)
        socket.broadcast.emit('user-online', userId)
      })

      socket.on('user-status', (data: { userId: string; status: string }) => {
        socket.broadcast.emit('status-changed', data)
      })

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
      })
    })

    res.socket.server.io = io
    res.status(200).json({ message: 'Socket started successfully' })
    
  } catch (error) {
    console.error('Socket error:', error)
    res.status(500).json({ error: 'Socket initialization failed' })
  }
}