import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // هذا الـ route فقط لتفعيل السوكيت سيرفر
  // الاتصال الحقيقي يتم من العميل مباشرة
  
  return NextResponse.json({
    status: 'success',
    message: 'Socket server is available',
    note: 'Connect using socket.io client to /api/socket'
  });
}
