// src/app/api/friends/block/route.ts
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
    const { userId: userToBlockId } = await request.json()

    if (!userToBlockId) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      )
    }

    if (userId === userToBlockId) {
      return NextResponse.json(
        { error: 'لا يمكن حظر نفسك' },
        { status: 400 }
      )
    }

    // التحقق من وجود المستخدم المراد حظره
    const userToBlock = await prisma.user.findUnique({
      where: { id: userToBlockId }
    })

    if (!userToBlock) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      )
    }

    // استخدام transaction لضمان تكامل البيانات
    const result = await prisma.$transaction(async (tx) => {
      // البحث عن أي علاقة صداقة موجودة
      const existingFriendship = await tx.friendship.findFirst({
        where: {
          OR: [
            { user1Id: userId, user2Id: userToBlockId },
            { user1Id: userToBlockId, user2Id: userId }
          ]
        }
      })

      let friendship

      if (existingFriendship) {
        // تحديث حالة الصداقة إلى محظور
        friendship = await tx.friendship.update({
          where: { id: existingFriendship.id },
          data: { status: 'BLOCKED' }
        })
      } else {
        // إنشاء علاقة محظورة جديدة
        friendship = await tx.friendship.create({
          data: {
            user1Id: userId,
            user2Id: userToBlockId,
            status: 'BLOCKED'
          }
        })
      }

      // إلغاء أي طلبات صداقة pending بين المستخدمين
      await tx.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: userId, receiverId: userToBlockId },
            { senderId: userToBlockId, receiverId: userId }
          ]
        }
      })

      return friendship
    })

    return NextResponse.json({
      message: 'تم حظر المستخدم بنجاح'
    }, { status: 200 })

  } catch (error) {
    console.error('Block user error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حظر المستخدم' },
      { status: 500 }
    )
  }
}
