import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth-utils"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { friendId: string } }
) {
  try {
    // التحقق من التوكن مباشرة
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
    const { friendId } = params

    // باقي الكود بنفس الشكل...
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

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: friendId },
          { user1Id: friendId, user2Id: userId }
        ]
      }
    })

    if (!friendship) {
      return NextResponse.json(
        { error: 'علاقة الصداقة غير موجودة' },
        { status: 404 }
      )
    }

    await prisma.friendship.delete({
      where: { id: friendship.id }
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