// src/app/api/friends/requests/sent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // التحقق من التوكن
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'مطلوب توكن مصادقة' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'توكن غير صالح أو منتهي الصلاحية' },
        { status: 401 }
      )
    }

    const userId = decoded.userId

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // التحقق من أن حالة الطلب صحيحة
    const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'حالة الطلب غير صحيحة' },
        { status: 400 }
      )
    }

    const [requests, totalCount] = await Promise.all([
      // جلب الطلبات المرسلة
      prisma.friendRequest.findMany({
        where: {
          senderId: userId,
          status: status as any
        },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              status: true,
              lastSeen: true,
              bio: true,
              isVerified: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      // عدد الطلبات الإجمالي
      prisma.friendRequest.count({
        where: {
          senderId: userId,
          status: status as any
        }
      })
    ])

    return NextResponse.json({
      message: 'تم جلب الطلبات المرسلة بنجاح',
      requests,
      count: requests.length,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Get sent requests error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الطلبات المرسلة' },
      { status: 500 }
    )
  }
}

// دالة DELETE لحذف طلبات الصداقة المرسلة
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'مطلوب توكن مصادقة' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'توكن غير صالح أو منتهي الصلاحية' },
        { status: 401 }
      )
    }

    const userId = decoded.userId
    const { requestIds } = await request.json()

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: 'معرفات الطلبات مطلوبة' },
        { status: 400 }
      )
    }

    // التحقق من أن المستخدم هو مرسل هذه الطلبات
    const userRequests = await prisma.friendRequest.findMany({
      where: {
        id: { in: requestIds },
        senderId: userId,
        status: 'PENDING' // يمكن حذف الطلبات pending فقط
      }
    })

    if (userRequests.length !== requestIds.length) {
      return NextResponse.json(
        { error: 'بعض الطلبات غير موجودة أو لا يمكن حذفها' },
        { status: 400 }
      )
    }

    // حذف الطلبات
    await prisma.friendRequest.deleteMany({
      where: {
        id: { in: requestIds },
        senderId: userId
      }
    })

    return NextResponse.json({
      message: `تم حذف ${requestIds.length} طلب صداقة بنجاح`
    }, { status: 200 })

  } catch (error) {
    console.error('Delete sent requests error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف الطلبات المرسلة' },
      { status: 500 }
    )
  }
}