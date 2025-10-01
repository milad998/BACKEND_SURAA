// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'مطلوب توكن مصادقة' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { error: 'توكن غير صالح أو منتهي الصلاحية' },
        { status: 401 }
      )
    }

    const userId = decoded.userId

    // جلب بيانات المستخدم من قاعدة البيانات
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        status: true,
        lastSeen: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        settings: {
          select: {
            theme: true,
            language: true,
            notifications: true,
            sound: true,
            privacyProfile: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      )
    }

    // إحصائيات المستخدم
    const [friendsCount, chatsCount, unreadMessagesCount, pendingRequestsCount] = await Promise.all([
      // عدد الأصدقاء
      prisma.friendship.count({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId }
          ],
          status: 'ACCEPTED'
        }
      }),

      // عدد المحادثات
      prisma.chatUser.count({
        where: { userId }
      }),

      // عدد الرسائل غير المقروءة
      prisma.message.count({
        where: {
          chat: {
            users: {
              some: { userId }
            }
          },
          isRead: false,
          senderId: { not: userId }
        }
      }),

      // عدد طلبات الصداقة الواردة
      prisma.friendRequest.count({
        where: {
          receiverId: userId,
          status: 'PENDING'
        }
      })
    ])

    return NextResponse.json({
      message: 'تم جلب بيانات المستخدم بنجاح',
      user: {
        ...user,
        stats: {
          friends: friendsCount,
          chats: chatsCount,
          unreadMessages: unreadMessagesCount,
          pendingFriendRequests: pendingRequestsCount
        }
      }
    })

  } catch (error) {
    console.error('Get user profile error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب بيانات المستخدم' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'مطلوب توكن مصادقة' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { error: 'توكن غير صالح أو منتهي الصلاحية' },
        { status: 401 }
      )
    }

    const userId = decoded.userId
    const updates = await request.json()

    // الحقول المسموح بتحديثها
    const allowedFields = ['name', 'username', 'avatar', 'bio', 'status']
    const filteredUpdates: any = {}

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key]
      }
    })

    // التحقق من أن username فريد إذا تم تحديثه
    if (filteredUpdates.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: filteredUpdates.username,
          id: { not: userId }
        }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'اسم المستخدم موجود مسبقاً' },
          { status: 400 }
        )
      }
    }

    // التحقق من صحة الحالة إذا تم تحديثها
    if (filteredUpdates.status && !['ONLINE', 'OFFLINE', 'AWAY', 'BUSY', 'DO_NOT_DISTURB'].includes(filteredUpdates.status)) {
      return NextResponse.json(
        { error: 'حالة المستخدم غير صحيحة' },
        { status: 400 }
      )
    }

    // تحديث بيانات المستخدم
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: filteredUpdates,
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        status: true,
        lastSeen: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        settings: {
          select: {
            theme: true,
            language: true,
            notifications: true,
            sound: true,
            privacyProfile: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'تم تحديث بيانات المستخدم بنجاح',
      user: updatedUser
    })

  } catch (error) {
    console.error('Update user profile error:', error)
    
    // معالجة أخطاء Prisma المحددة
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'اسم المستخدم موجود مسبقاً' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث بيانات المستخدم' },
      { status: 500 }
    )
  }
}
