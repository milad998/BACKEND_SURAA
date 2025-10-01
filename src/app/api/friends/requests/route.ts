// src/app/api/friends/requests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
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
    const { receiverId, message } = await request.json()

    if (!receiverId) {
      return NextResponse.json(
        { error: 'معرف المستلم مطلوب' },
        { status: 400 }
      )
    }

    if (userId === receiverId) {
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
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId }
        ]
      }
    })

    if (existingRequest) {
      let errorMessage = 'طلب الصداقة موجود مسبقاً'
      
      if (existingRequest.status === 'PENDING') {
        if (existingRequest.senderId === userId) {
          errorMessage = 'لقد أرسلت طلب صداقة مسبقاً'
        } else {
          errorMessage = 'لديك طلب صداقة وارد من هذا المستخدم'
        }
      } else if (existingRequest.status === 'ACCEPTED') {
        errorMessage = 'تم قبول طلب الصداقة مسبقاً'
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    // التحقق من إذا كانا صديقين بالفعل
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: userId }
        ],
        status: 'ACCEPTED'
      }
    })

    if (existingFriendship) {
      return NextResponse.json(
        { error: 'أنتم أصدقاء بالفعل' },
        { status: 400 }
      )
    }

    // التحقق من إذا كان المستخدم محظور
    const blockedFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: receiverId, status: 'BLOCKED' },
          { user1Id: receiverId, user2Id: userId, status: 'BLOCKED' }
        ]
      }
    })

    if (blockedFriendship) {
      return NextResponse.json(
        { error: 'لا يمكن إرسال طلب صداقة إلى مستخدم محظور' },
        { status: 400 }
      )
    }

    // إنشاء طلب الصداقة
    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId: userId,
        receiverId,
        message: message?.trim() || null
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            status: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            status: true
          }
        }
      }
    })

    // إنشاء إشعار للمستلم
    await prisma.notification.create({
      data: {
        type: 'FRIEND_REQUEST',
        title: 'طلب صداقة جديد',
        message: `أرسل لك ${friendRequest.sender.name} طلب صداقة`,
        senderId: userId,
        receiverId: receiverId,
        data: {
          requestId: friendRequest.id,
          senderName: friendRequest.sender.name,
          senderId: friendRequest.sender.id
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
    const type = searchParams.get('type') || 'received'

    let whereCondition = {}

    if (type === 'sent') {
      whereCondition = { 
        senderId: userId,
        status: 'PENDING'
      }
    } else {
      whereCondition = { 
        receiverId: userId,
        status: 'PENDING'
      }
    }

    const requests = await prisma.friendRequest.findMany({
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
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      message: 'تم جلب طلبات الصداقة بنجاح',
      requests,
      count: requests.length
    }, { status: 200 })

  } catch (error) {
    console.error('Get friend requests error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب طلبات الصداقة' },
      { status: 500 }
    )
  }
}
