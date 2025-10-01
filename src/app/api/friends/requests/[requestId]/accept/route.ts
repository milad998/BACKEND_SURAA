// src/app/api/friends/requests/[requestId]/accept/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'مطلوب توكن مصادقة' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const user = await getUserFromToken(token)
    
    if (!user) {
      return NextResponse.json(
        { error: 'توكن غير صالح أو منتهي الصلاحية' },
        { status: 401 }
      )
    }

    const userId = user.id

    // البحث عن طلب الصداقة مع تضمين بيانات المرسل والمستقبل
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true
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

    // التحقق من أن المستخدم هو المستقبل للطلب
    if (friendRequest.receiverId !== userId) {
      return NextResponse.json(
        { error: 'غير مصرح لك بقبول هذا الطلب' },
        { status: 403 }
      )
    }

    // التحقق من حالة الطلب
    if (friendRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'لا يمكن قبول طلب صداقة تمت معالجته مسبقاً' },
        { status: 400 }
      )
    }

    // بدء transaction لضمان تكامل البيانات
    const result = await prisma.$transaction(async (tx) => {
      // تحديث حالة طلب الصداقة إلى ACCEPTED
      const updatedRequest = await tx.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' }
      })

      // إنشاء علاقة صداقة في جدول Friendship
      const friendship = await tx.friendship.create({
        data: {
          user1Id: friendRequest.senderId,
          user2Id: friendRequest.receiverId,
          status: 'ACCEPTED'
        }
      })

      // حذف أي طلبات صداقة مكررة بين المستخدمين
      await tx.friendRequest.deleteMany({
        where: {
          OR: [
            {
              senderId: friendRequest.senderId,
              receiverId: friendRequest.receiverId,
              status: 'PENDING'
            },
            {
              senderId: friendRequest.receiverId,
              receiverId: friendRequest.senderId,
              status: 'PENDING'
            }
          ],
          id: { not: requestId } // استثناء الطلب الحالي
        }
      })

      // إنشاء إشعار للمرسل
      await tx.notification.create({
        data: {
          type: 'FRIEND_REQUEST',
          title: 'تم قبول طلب الصداقة',
          message: `قبل ${friendRequest.receiver.name} طلب صداقتك`, // الآن receiver موجود
          senderId: userId,
          receiverId: friendRequest.senderId,
          data: {
            requestId: friendRequest.id,
            friendshipId: friendship.id
          }
        }
      })

      return { updatedRequest, friendship }
    })

    return NextResponse.json({
      message: 'تم قبول طلب الصداقة بنجاح',
      friendship: {
        id: result.friendship.id,
        user1: friendRequest.sender,
        user2: friendRequest.receiver,
        friendsSince: result.friendship.createdAt
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Accept friend request error:', error)
    
    // معالجة الأخطاء المختلفة
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'أنتما صديقان بالفعل' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'حدث خطأ أثناء قبول طلب الصداقة' },
      { status: 500 }
    )
  }
}
