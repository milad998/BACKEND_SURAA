import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-utils"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    // استخراج params باستخدام await
    const { requestId } = await params

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

    // التحقق من وجود requestId
    if (!requestId) {
      return NextResponse.json(
        { error: 'معرف الطلب مطلوب' },
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

    // التحقق من أن المستخدم هو المستقبل للطلب
    if (friendRequest.receiverId !== userId) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية لقبول هذا الطلب' },
        { status: 403 }
      )
    }

    const { action } = await request.json()

    if (action === 'accept') {
      // قبول طلب الصداقة
      await prisma.$transaction([
        // حذف طلب الصداقة
        prisma.friendRequest.delete({
          where: { id: requestId }
        }),
        // إنشاء علاقة صداقة جديدة
        prisma.friendship.create({
          data: {
            user1Id: friendRequest.senderId,
            user2Id: friendRequest.receiverId
          }
        })
      ])

      return NextResponse.json({
        message: 'تم قبول طلب الصداقة بنجاح'
      }, { status: 200 })

    } else if (action === 'reject') {
      // رفض طلب الصداقة
      await prisma.friendRequest.delete({
        where: { id: requestId }
      })

      return NextResponse.json({
        message: 'تم رفض طلب الصداقة بنجاح'
      }, { status: 200 })

    } else {
      return NextResponse.json(
        { error: 'إجراء غير صالح. يجب أن يكون "accept" أو "reject"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Friend request action error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء معالجة طلب الصداقة' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    // استخراج params باستخدام await
    const { requestId } = await params

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

    // التحقق من وجود requestId
    if (!requestId) {
      return NextResponse.json(
        { error: 'معرف الطلب مطلوب' },
        { status: 400 }
      )
    }

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

    // التحقق من أن المستخدم هو المرسل أو المستقبل
    if (friendRequest.senderId !== userId && friendRequest.receiverId !== userId) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية لحذف هذا الطلب' },
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    // استخراج params باستخدام await
    const { requestId } = await params

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

    // البحث عن طلب الصداقة
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true
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

    // التحقق من أن المستخدم له علاقة بالطلب
    if (friendRequest.senderId !== userId && friendRequest.receiverId !== userId) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية لعرض هذا الطلب' },
        { status: 403 }
      )
    }

    return NextResponse.json(friendRequest, { status: 200 })

  } catch (error) {
    console.error('Get friend request error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب طلب الصداقة' },
      { status: 500 }
    )
  }
}