// src/app/api/friends/requests/[requestId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
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
    const { requestId } = params
    const { action } = await request.json() // 'ACCEPT' or 'REJECT'

    if (!['ACCEPT', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'الإجراء غير صحيح' },
        { status: 400 }
      )
    }

    // البحث عن طلب الصداقة
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    if (!friendRequest) {
      return NextResponse.json(
        { error: 'طلب الصداقة غير موجود' },
        { status: 404 }
      )
    }

    // التحقق من أن المستخدم هو المستلم
    if (friendRequest.receiverId !== userId) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالرد على هذا الطلب' },
        { status: 403 }
      )
    }

    // التحقق من أن الطلب لا يزال pending
    if (friendRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'لا يمكن الرد على هذا الطلب' },
        { status: 400 }
      )
    }

    // تحديث حالة الطلب
    const updatedRequest = await prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    // إذا تم القبول، إنشاء علاقة صداقة
    if (action === 'ACCEPT') {
      // التأكد من عدم وجود صداقة مسبقة
      const existingFriendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { user1Id: friendRequest.senderId, user2Id: friendRequest.receiverId },
            { user1Id: friendRequest.receiverId, user2Id: friendRequest.senderId }
          ]
        }
      })

      if (!existingFriendship) {
        await prisma.friendship.create({
          data: {
            user1Id: friendRequest.senderId,
            user2Id: friendRequest.receiverId,
            status: 'ACCEPTED'
          }
        })

        // إنشاء إشعار للمرسل
        await prisma.notification.create({
          data: {
            type: 'FRIEND_REQUEST',
            title: 'تم قبول طلب الصداقة',
            message: `قبل ${friendRequest.receiver.name} طلب صداقتك`,
            senderId: userId,
            receiverId: friendRequest.senderId,
            data: {
              friendId: friendRequest.receiverId,
              friendName: friendRequest.receiver.name
            }
          }
        })
      }
    } else {
      // إذا تم الرفض، إنشاء إشعار للمرسل
      await prisma.notification.create({
        data: {
          type: 'FRIEND_REQUEST',
          title: 'تم رفض طلب الصداقة',
          message: `رفض ${friendRequest.receiver.name} طلب صداقتك`,
          senderId: userId,
          receiverId: friendRequest.senderId,
          data: {
            requestId: friendRequest.id
          }
        }
      })
    }

    return NextResponse.json({
      message: action === 'ACCEPT' ? 'تم قبول طلب الصداقة' : 'تم رفض طلب الصداقة',
      request: updatedRequest
    }, { status: 200 })

  } catch (error) {
    console.error('Respond to friend request error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء معالجة طلب الصداقة' },
      { status: 500 }
    )
  }
}

// دالة DELETE لحذف طلب الصداقة
export async function DELETE(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
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
    const { requestId } = params

    // البحث عن طلب الصداقة
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId }
    })

    if (!friendRequest) {
      return NextResponse.json(
        { error: 'طلب الصداقة غير موجود' },
        { status: 404 }
      )
    }

    // التحقق من أن المستخدم هو المرسل أو المستلم
    if (friendRequest.senderId !== userId && friendRequest.receiverId !== userId) {
      return NextResponse.json(
        { error: 'غير مصرح لك بحذف هذا الطلب' },
        { status: 403 }
      )
    }

    // حذف طلب الصداقة
    await prisma.friendRequest.delete({
      where: { id: requestId }
    })

    return NextResponse.json({
      message: 'تم حذف طلب الصداقة بنجاح'
    }, { status: 200 })

  } catch (error) {
    console.error('Delete friend request error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف طلب الصداقة' },
      { status: 500 }
    )
  }
}