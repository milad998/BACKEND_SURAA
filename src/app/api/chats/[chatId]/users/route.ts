// src/app/api/chats/[chatId]/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// GET - جلب أعضاء المحادثة
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.userId

    // التحقق من أن المستخدم عضو في المحادثة
    const chatMember = await prisma.chatUser.findFirst({
      where: {
        chatId,
        userId
      }
    })

    if (!chatMember) {
      return NextResponse.json(
        { error: 'Chat not found or access denied' },
        { status: 404 }
      )
    }

    // جلب أعضاء المحادثة
    const chatUsers = await prisma.chatUser.findMany({
      where: { chatId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            status: true,
            lastSeen: true,
            bio: true,
            isVerified: true
          }
        }
      },
      orderBy: [
        { role: 'desc' }, // OWNER أولاً، ثم ADMIN، ثم MEMBER
        { joinedAt: 'asc' }
      ]
    })

    return NextResponse.json({
      message: 'Chat users retrieved successfully',
      users: chatUsers
    })
  } catch (error) {
    console.error('Get chat users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - إضافة أعضاء جدد للمحادثة
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.userId
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs are required' },
        { status: 400 }
      )
    }

    // التحقق من أن المستخدم لديه صلاحية إضافة أعضاء
    const chatMember = await prisma.chatUser.findFirst({
      where: {
        chatId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] }
      },
      include: {
        chat: {
          select: {
            type: true,
            name: true
          }
        }
      }
    })

    if (!chatMember) {
      return NextResponse.json(
        { error: 'You do not have permission to add users to this chat' },
        { status: 403 }
      )
    }

    // جلب بيانات المستخدم الحالي للحصول على الاسم
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    })

    // التحقق من وجود المستخدمين
    const existingUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: { id: true, name: true }
    })

    if (existingUsers.length !== userIds.length) {
      return NextResponse.json(
        { error: 'One or more users not found' },
        { status: 404 }
      )
    }

    // التحقق من أن المستخدمين ليسوا أعضاء بالفعل
    const existingMembers = await prisma.chatUser.findMany({
      where: {
        chatId,
        userId: { in: userIds }
      },
      select: { userId: true }
    })

    const existingUserIds = existingMembers.map(member => member.userId)
    const newUserIds = userIds.filter(id => !existingUserIds.includes(id))

    if (newUserIds.length === 0) {
      return NextResponse.json(
        { error: 'All users are already members of this chat' },
        { status: 400 }
      )
    }

    // إضافة المستخدمين الجدد
    const addedUsers = await prisma.$transaction(
      newUserIds.map(userId => 
        prisma.chatUser.create({
          data: {
            chatId,
            userId,
            role: 'MEMBER'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                status: true
              }
            }
          }
        })
      )
    )

    // إنشاء إشعارات للمستخدمين المضافين
    if (chatMember.chat.type === 'GROUP') {
      await prisma.notification.createMany({
        data: newUserIds.map(userId => ({
          type: 'GROUP_INVITE',
          title: 'تمت إضافتك إلى مجموعة',
          message: `تمت إضافتك إلى مجموعة "${chatMember.chat.name || 'بدون اسم'}"`,
          senderId: userId,
          receiverId: userId,
          data: {
            chatId,
            chatName: chatMember.chat.name,
            inviterName: currentUser?.name || 'مستخدم'
          }
        }))
      })
    }

    return NextResponse.json({
      message: `Added ${addedUsers.length} users to the chat`,
      addedUsers
    }, { status: 201 })
  } catch (error) {
    console.error('Add chat users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - إزالة أعضاء من المحادثة
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.userId
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs are required' },
        { status: 400 }
      )
    }

    // التحقق من أن المستخدم لديه صلاحية إزالة أعضاء
    const requesterMember = await prisma.chatUser.findFirst({
      where: {
        chatId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    })

    if (!requesterMember) {
      return NextResponse.json(
        { error: 'You do not have permission to remove users from this chat' },
        { status: 403 }
      )
    }

    // منع إزالة المالك
    if (userIds.includes(userId) && requesterMember.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'You cannot remove yourself as an admin' },
        { status: 400 }
      )
    }

    // إزالة الأعضاء
    const result = await prisma.chatUser.deleteMany({
      where: {
        chatId,
        userId: { in: userIds },
        // منع إزالة المالك إلا إذا كان هو نفسه
        ...(requesterMember.role !== 'OWNER' && {
          role: { not: 'OWNER' }
        })
      }
    })

    return NextResponse.json({
      message: `Removed ${result.count} users from the chat`
    })
  } catch (error) {
    console.error('Remove chat users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
