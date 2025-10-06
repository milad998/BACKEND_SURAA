import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

// هذا الكود يعمل على مستوى الخادم وليس في route
let io: SocketIOServer | null = null

export function initializeSocketIO(httpServer: NetServer) {
  if (io) {
    return io
  }

  io = new SocketIOServer(httpServer, {
    path: '/api/socket/io',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  })

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id)

    socket.on('join-room', (userId: string) => {
      console.log(`🎯 User ${userId} joined room with socket ${socket.id}`)
      socket.join(userId)
      socket.broadcast.emit('user-online', userId)
    })

    socket.on('user-status', (data: { userId: string; status: string }) => {
      console.log(`🔄 User ${data.userId} status changed to ${data.status}`)
      socket.broadcast.emit('status-changed', data)
    })

    socket.on('send-message', (data) => {
      console.log('📨 Message sent to:', data.receiverId)
      if (data.receiverId) {
        socket.to(data.receiverId).emit('receive-message', data)
      }
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ User disconnected:', socket.id, 'Reason:', reason)
    })

    socket.on('error', (error) => {
      console.error('💥 Socket error:', error)
    })
  })

  console.log('🚀 Socket.io server initialized')
  return io
}

export function getSocketIO() {
  return io
}
