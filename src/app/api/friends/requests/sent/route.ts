// src/app/api/friends/requests/sent/[requestId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    // استخراج params باستخدام await
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

    // التحقق من أن المستخدم هو المرسل
    if (friendRequest.senderId !== userId) {
      return NextResponse.json(
        { error: 'غير مصرح لك بإلغاء هذا الطلب' },
        { status: 403 }
      )
    }

    // حذف طلب الصداقة
    await prisma.friendRequest.delete({
      where: { id: requestId }
    })

    return NextResponse.json({
      message: 'تم إلغاء طلب الصداقة بنجاح'
    }, { status: 200 })

  } catch (error) {
    console.error('Cancel friend request error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إلغاء طلب الصداقة' },
      { status: 500 }
    )
  }
}