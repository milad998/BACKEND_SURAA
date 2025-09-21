// src/server/socket/index.ts
import { IncomingMessage, Server as NetServer, Server, ServerResponse } from 'http'
import { NextApiRequest } from 'next'
import { Server as SocketIOServer } from 'socket.io'
import { NextApiResponseServerIO } from '@/types'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function socketHandler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (!res.socket.server.io) {
    const path = '/api/socket/io'
    const httpServer = res.socket.server as unknown as Server<typeof IncomingMessage, typeof ServerResponse>



    const io = new SocketIOServer(httpServer, {
      path: path,
      addTrailingSlash: false,
    })

    // معالجة الأحداث
    io.on('connection', (socket) => {
      console.log('User connected:', socket.id)

      // انضمام المستخدم إلى غرفة
      socket.on('join-room', (userId: string) => {
        socket.join(userId)
        socket.broadcast.emit('user-online', userId)
      })

      // إرسال رسالة
      socket.on('send-message', async (data) => {
        // حفظ الرسالة في قاعدة البيانات
        // ثم إرسالها إلى المستلم
        socket.to(data.receiverId).emit('receive-message', data)
      })

      // تحديث حالة القراءة
      socket.on('mark-as-read', (data) => {
        socket.to(data.senderId).emit('messages-read', {
          chatId: data.chatId,
          readerId: data.readerId
        })
      })

      // تحديث حالة المستخدم
      socket.on('user-status', (data) => {
        socket.broadcast.emit('status-changed', data)
      })

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
        socket.broadcast.emit('user-offline', socket.id)
      })
    })

    res.socket.server.io = io
  }
  res.end()
}
