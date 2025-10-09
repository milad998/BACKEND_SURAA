// pages/api/socket.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { initializeSocketIO } from '@/lib/socket-server'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // استخدام any لتجاوز تحقق TypeScript
  const responseWithSocket = res as any;
  
  if (responseWithSocket.socket?.server?.io) {
    console.log('✅ Socket.io server already running');
  } else if (responseWithSocket.socket?.server) {
    console.log('🔧 Initializing Socket.io server...');
    initializeSocketIO(responseWithSocket.socket.server);
  } else {
    console.log('❌ Socket server not available');
  }
  
  res.status(200).json({ status: 'Socket server handled' });
}
