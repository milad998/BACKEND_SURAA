// src/app/api/friends/requests/[requestId]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

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
      where: { id: requestId }
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
        { error: 'غير مصرح لك برفض هذا الطلب' },
        { status: 403 }
      )
    }

    // التحقق من حالة الطلب
    if (friendRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'لا يمكن رفض طلب صداقة تمت معالجته مسبقاً' },
        { status: 400 }
      )
    }

    // تحديث حالة طلب الصداقة إلى REJECTED
    const updatedRequest = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' }
    })

    return NextResponse.json({
      message: 'تم رفض طلب الصداقة بنجاح',
      request: updatedRequest
    }, { status: 200 })

  } catch (error) {
    console.error('Reject friend request error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء رفض طلب الصداقة' },
      { status: 500 }
    )
  }
}