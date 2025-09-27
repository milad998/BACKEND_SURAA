// src/app/api/friends/block/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    // التحقق من المصادقة باستخدام التوكن
    const authResult = authenticateRequest(request)
    if (!authResult) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    const userId = authResult.userId
    const { userId: userToBlockId } = await request.json()

    if (!userToBlockId) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      )
    }

    // التحقق من عدم محاولة حظر النفس
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

    // البحث عن أي علاقة صداقة موجودة
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: userToBlockId },
          { user1Id: userToBlockId, user2Id: userId }
        ]
      }
    })

    if (existingFriendship) {
      // تحديث حالة الصداقة إلى محظور
      await prisma.friendship.update({
        where: { id: existingFriendship.id },
        data: { status: 'BLOCKED' }
      })
    } else {
      // إنشاء علاقة محظورة جديدة
      await prisma.friendship.create({
        data: {
          user1Id: userId,
          user2Id: userToBlockId,
          status: 'BLOCKED'
        }
      })
    }

    // إلغاء أي طلبات صداقة pending بين المستخدمين
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: userToBlockId },
          { senderId: userToBlockId, receiverId: userId }
        ]
      }
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