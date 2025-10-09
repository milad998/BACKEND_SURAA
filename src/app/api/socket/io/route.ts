import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // This route is just for initializing the socket connection
  return new Response(JSON.stringify({ status: 'Socket.IO Ready' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function POST(request: NextRequest) {
  return new Response(JSON.stringify({ status: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
