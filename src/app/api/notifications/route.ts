// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// GET - جلب إشعارات المستخدم غير المقروءة فقط
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.userId

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // بناء شرط البحث - الإشعارات غير المقروءة فقط
    const whereCondition: any = {
      receiverId: userId,
      isRead: false // فقط الإشعارات غير المقروءة
    }

    if (type) {
      whereCondition.type = type
    }

    const [notifications, totalCount] = await Promise.all([
      // جلب الإشعارات غير المقروءة فقط
      prisma.notification.findMany({
        where: whereCondition,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      // عدد الإشعارات غير المقروءة الإجمالي
      prisma.notification.count({
        where: whereCondition
      })
    ])

    // إحصائيات الإشعارات غير المقروءة فقط
    const stats = await prisma.notification.groupBy({
      by: ['type'],
      where: { 
        receiverId: userId,
        isRead: false 
      },
      _count: true
    })

    return NextResponse.json({
      message: 'Unread notifications retrieved successfully',
      notifications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit)
      },
      stats: {
        total: totalCount,
        byType: stats.reduce((acc, stat) => {
          acc[stat.type] = stat._count
          return acc
        }, {} as any)
      }
    })
  } catch (error) {
    console.error('Get unread notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - إنشاء إشعار جديد
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.userId
    const { receiverId, type, title, message, data } = await request.json()

    // التحقق من البيانات المطلوبة
    if (!receiverId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Receiver ID, type, title, and message are required' },
        { status: 400 }
      )
    }

    // التحقق من وجود المستلم
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    })

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      )
    }

    // إنشاء الإشعار
    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        data: data || null,
        senderId: userId,
        receiverId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Notification created successfully',
      notification
    }, { status: 201 })
  } catch (error) {
    console.error('Create notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - تحديث إشعارات (تحديد كمقروءة)
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.userId
    const { notificationIds, markAll } = await request.json()

    if (markAll) {
      // تحديد جميع الإشعارات كمقروءة
      const result = await prisma.notification.updateMany({
        where: {
          receiverId: userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      })

      return NextResponse.json({
        message: `Marked ${result.count} notifications as read`
      })
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'Notification IDs are required' },
        { status: 400 }
      )
    }

    // تحديث إشعارات محددة
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        receiverId: userId // التأكد من أن المستخدم هو المستقبل
      },
      data: {
        isRead: true
      }
    })

    return NextResponse.json({
      message: `Marked ${result.count} notifications as read`
    })
  } catch (error) {
    console.error('Update notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - حذف إشعارات
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.userId
    const { notificationIds, deleteAllRead } = await request.json()

    if (deleteAllRead) {
      // حذف جميع الإشعارات المقروءة
      const result = await prisma.notification.deleteMany({
        where: {
          receiverId: userId,
          isRead: true
        }
      })

      return NextResponse.json({
        message: `Deleted ${result.count} read notifications`
      })
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'Notification IDs are required' },
        { status: 400 }
      )
    }

    // حذف إشعارات محددة
    const result = await prisma.notification.deleteMany({
      where: {
        id: { in: notificationIds },
        receiverId: userId // التأكد من أن المستخدم هو المستقبل
      }
    })

    return NextResponse.json({
      message: `Deleted ${result.count} notifications`
    })
  } catch (error) {
    console.error('Delete notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
