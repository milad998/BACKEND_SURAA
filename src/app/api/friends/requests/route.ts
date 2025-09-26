// src/app/api/friends/requests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    // التحقق من المستخدم المسجل دخوله
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    const { receiverId, message } = await request.json()

    if (!receiverId) {
      return NextResponse.json(
        { error: 'معرف المستلم مطلوب' },
        { status: 400 }
      )
    }

    // التحقق من عدم إرسال طلب إلى النفس
    if (session.user.id === receiverId) {
      return NextResponse.json(
        { error: 'لا يمكن إرسال طلب صداقة إلى نفسك' },
        { status: 400 }
      )
    }

    // التحقق من وجود المستلم
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    })

    if (!receiver) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      )
    }

    // التحقق من وجود طلب صداقة مسبق
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: session.user.id, receiverId },
          { senderId: receiverId, receiverId: session.user.id }
        ]
      }
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'طلب الصداقة موجود مسبقاً' },
        { status: 400 }
      )
    }

    // التحقق من إذا كانا صديقين بالفعل
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: session.user.id, user2Id: receiverId },
          { user1Id: receiverId, user2Id: session.user.id }
        ]
      }
    })

    if (existingFriendship) {
      return NextResponse.json(
        { error: 'أنتم أصدقاء بالفعل' },
        { status: 400 }
      )
    }

    // إنشاء طلب الصداقة
    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId: session.user.id,
        receiverId,
        message: message || null
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    })

    // إنشاء إشعار للمستلم
    await prisma.notification.create({
      data: {
        type: 'FRIEND_REQUEST',
        title: 'طلب صداقة جديد',
        message: `ارسل لك ${friendRequest.sender.name} طلب صداقة`,
        senderId: session.user.id,
        receiverId: receiverId,
        data: {
          requestId: friendRequest.id,
          senderName: friendRequest.sender.name
        }
      }
    })

    return NextResponse.json({
      message: 'تم إرسال طلب الصداقة بنجاح',
      request: friendRequest
    }, { status: 201 })

  } catch (error) {
    console.error('Send friend request error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إرسال طلب الصداقة' },
      { status: 500 }
    )
  }
}
