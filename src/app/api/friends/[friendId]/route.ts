// src/app/api/friends/[friendId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const { friendId } = await params

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

    if (!friendId) {
      return NextResponse.json(
        { error: 'معرف الصديق مطلوب' },
        { status: 400 }
      )
    }

    if (userId === friendId) {
      return NextResponse.json(
        { error: 'لا يمكن إزالة نفسك' },
        { status: 400 }
      )
    }

    // البحث عن علاقة الصداقة
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: friendId },
          { user1Id: friendId, user2Id: userId }
        ],
        status: 'ACCEPTED'
      }
    })

    if (!friendship) {
      return NextResponse.json(
        { error: 'علاقة الصداقة غير موجودة' },
        { status: 404 }
      )
    }

    // حذف علاقة الصداقة
    await prisma.friendship.delete({
      where: { id: friendship.id }
    })

    // حذف أي طلبات صداقة مرتبطة
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId }
        ]
      }
    })

    return NextResponse.json({
      message: 'تم إزالة الصديق بنجاح'
    }, { status: 200 })

  } catch (error) {
    console.error('Remove friend error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إزالة الصديق' },
      { status: 500 }
    )
  }
}
