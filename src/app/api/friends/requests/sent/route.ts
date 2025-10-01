// src/app/api/friends/requests/sent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // التحقق من صحة الحالة
    const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'حالة الطلب غير صحيحة' },
        { status: 400 }
      )
    }

    const [requests, totalCount] = await Promise.all([
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
              bio: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
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
      pagination: {
        page,
        limit,
        totalCount,
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
    const { requestId } = await request.json()

    if (!requestId) {
      return NextResponse.json(
        { error: 'معرف الطلب مطلوب' },
        { status: 400 }
      )
    }

    // البحث عن الطلب والتأكد من أن المستخدم هو المرسل
    const friendRequest = await prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        senderId: userId,
        status: 'PENDING'
      }
    })

    if (!friendRequest) {
      return NextResponse.json(
        { error: 'طلب الصداقة غير موجود أو لا يمكن إلغاؤه' },
        { status: 404 }
      )
    }

    // حذف طلب الصداقة
    await prisma.friendRequest.delete({
      where: { id: requestId }
    })

    return NextResponse.json({
      message: 'تم إلغاء طلب الصداقة بنجاح'
    }, { status: 200 })

  } catch (error) {
    console.error('Cancel friend request error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إلغاء طلب الصداقة' },
      { status: 500 }
    )
  }
}
