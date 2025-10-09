// pages/api/socket/io.ts (أنشئ هذا الملف)
import { NextApiRequest, NextApiResponse } from 'next'
import { initializeSocketIO } from '@/lib/socket-server'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const serverResponse = res as any;
  
  // تهيئة Socket.io
  if (!serverResponse.socket?.server?.io) {
    console.log('🚀 Initializing Socket.io server in Pages Router...');
    initializeSocketIO(serverResponse.socket.server);
  }
  
  res.status(200).json({ 
    status: 'Socket.IO server ready',
    initialized: true
  });
}
