import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'غير مصرح بالوصول' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // جلب جميع الرسائل غير المقروءة للمستخدم الحالي
    const unreadMessages = await prisma.message.findMany({
      where: {
        receiverId: userId,
        isRead: false
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true
          }
        },
        chat: {
          select: {
            id: true,
            type: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // تغيير من timestamp إلى createdAt
      }
    })

    // تجميع الرسائل حسب المرسل
    const messagesBySender = unreadMessages.reduce((acc, message) => {
      const senderId = message.senderId
      if (!acc[senderId]) {
        acc[senderId] = {
          sender: message.sender,
          messages: [],
          count: 0
        }
      }
      acc[senderId].messages.push(message)
      acc[senderId].count += 1
      return acc
    }, {} as any)

    return NextResponse.json({
      success: true,
      unreadMessages: unreadMessages,
      groupedBySender: messagesBySender,
      totalUnread: unreadMessages.length
    })

  } catch (error) {
    console.error('Error fetching unread messages:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الرسائل غير المقروءة' },
      { status: 500 }
    )
  }
}
