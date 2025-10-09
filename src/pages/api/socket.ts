import { NextApiRequest, NextApiResponse } from 'next'
import { initializeSocketIO } from '@/lib/socket-server'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // التحقق الآمن من وجود socket و server
  if (res.socket && res.socket.server && !res.socket.server.io) {
    console.log('🔧 Initializing Socket.io server...')
    initializeSocketIO(res.socket.server)
  } else if (res.socket && res.socket.server && res.socket.server.io) {
    console.log('✅ Socket.io server already running')
  } else {
    console.log('❌ Socket not available')
  }
  
  res.end()
}
