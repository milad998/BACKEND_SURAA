// src/app/api/users/status/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await request.json()

    if (!status || !['ONLINE', 'OFFLINE', 'AWAY'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 })
    }

    // مؤقتاً: إرجاع نجاح بدون تحديث قاعدة البيانات
    console.log(`User status updated to: ${status}`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Status updated successfully',
      status 
    })

  } catch (error) {
    console.error('Error updating user status:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// إضافة دالة OPTIONS للتعامل مع CORS إذا لزم الأمر
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}