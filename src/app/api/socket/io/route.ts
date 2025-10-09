import { NextRequest } from 'next/server';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import { Socket } from 'net';

export const dynamic = 'force-dynamic';

// For GET requests
export async function GET(request: NextRequest) {
  try {
    // Your socket.io initialization logic here
    if (!global.io) {
      const httpServer: NetServer = (request as any).socket?.server;
      
      if (httpServer) {
        const io = new ServerIO(httpServer, {
          path: '/api/socket/io',
          addTrailingSlash: false,
        });

        io.on('connection', (socket) => {
          console.log('New client connected');
          
          socket.on('disconnect', () => {
            console.log('Client disconnected');
          });
        });

        global.io = io;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// For POST requests
export async function POST(request: NextRequest) {
  // Handle POST requests if needed
  return new Response(JSON.stringify({ message: 'POST method' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
