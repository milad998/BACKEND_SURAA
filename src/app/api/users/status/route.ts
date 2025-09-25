// src/app/api/users/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth-utils'

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // التحقق من صحة التوكن والحصول على بيانات المستخدم
    const user = await getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    const { status } = await request.json()

    if (!status || !['ONLINE', 'OFFLINE', 'AWAY'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 })
    }

    // تحديث حالة المستخدم في قاعدة البيانات
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        status: status,
        lastSeen: status === 'OFFLINE' ? new Date() : undefined, // استخدام undefined بدلاً من null
        
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        lastSeen: true,
        
      }
    })

    console.log(`User ${user.email} status updated to: ${status}`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Status updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error updating user status:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// إضافة دالة OPTIONS للتعامل مع CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}
