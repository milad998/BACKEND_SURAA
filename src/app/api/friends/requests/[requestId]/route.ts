// src/app/api/friends/requests/[requestId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

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
        sender: true,
        receiver: true
      }
    })

    if (!friendRequest) {
      return NextResponse.json(
        { error: 'طلب الصداقة غير موجود' },
        { status: 404 }
      )
    }

    // التحقق من أن المستخدم هو المستلم
    if (friendRequest.receiverId !== session.user.id) {
      return NextResponse.json(
        { error: 'غير مصرح لك بالرد على هذا الطلب' },
        { status: 403 }
      )
    }

    // تحديث حالة الطلب
    const updatedRequest = await prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'
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
      }

      // إنشاء إشعار للمرسل
      await prisma.notification.create({
        data: {
          type: 'FRIEND_REQUEST',
          title: 'تم قبول طلب الصداقة',
          message: `قبل ${friendRequest.receiver.name} طلب صداقتك`,
          senderId: session.user.id,
          receiverId: friendRequest.senderId,
          data: {
            friendId: friendRequest.receiverId,
            friendName: friendRequest.receiver.name
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
