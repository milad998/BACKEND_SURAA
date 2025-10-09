import { NextApiRequest, NextApiResponse } from 'next'
import { initializeSocketIO } from '@/lib/socket-server'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // التأكد من أن السيرفر مشغول
  if (!res.socket.server.io) {
    console.log('🔧 Initializing Socket.io server...')
    initializeSocketIO(res.socket.server)
  } else {
    console.log('✅ Socket.io server already running')
  }
  
  res.end()
}
