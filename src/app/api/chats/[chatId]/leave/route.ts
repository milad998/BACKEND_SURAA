// src/app/api/chats/[chatId]/leave/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

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

    // البحث عن عضوية المستخدم في المحادثة
    const chatMember = await prisma.chatUser.findFirst({
      where: {
        chatId,
        userId
      },
      include: {
        chat: {
          select: {
            type: true,
            name: true,
            users: {
              where: {
                role: 'OWNER'
              },
              select: {
                userId: true
              }
            }
          }
        }
      }
    })

    if (!chatMember) {
      return NextResponse.json(
        { error: 'You are not a member of this chat' },
        { status: 404 }
      )
    }

    // التحقق إذا كان المالك يحاول مغادرة المحادثة
    const isOwner = chatMember.role === 'OWNER'
    if (isOwner) {
      // البحث عن مشرف لتحويل الملكية إليه
      const adminMember = await prisma.chatUser.findFirst({
        where: {
          chatId,
          userId: { not: userId },
          role: 'ADMIN'
        },
        orderBy: { joinedAt: 'asc' }
      })

      if (adminMember) {
        // تحويل الملكية إلى المشرف
        await prisma.chatUser.update({
          where: { id: adminMember.id },
          data: { role: 'OWNER' }
        })
      } else {
        // البحث عن أي عضو عادي
        const regularMember = await prisma.chatUser.findFirst({
          where: {
            chatId,
            userId: { not: userId },
            role: 'MEMBER'
          },
          orderBy: { joinedAt: 'asc' }
        })

        if (regularMember) {
          // تحويل الملكية إلى العضو العادي
          await prisma.chatUser.update({
            where: { id: regularMember.id },
            data: { role: 'OWNER' }
          })
        } else {
          // إذا لم يبقى أي أعضاء، احذف المحادثة
          await prisma.chat.delete({
            where: { id: chatId }
          })

          return NextResponse.json({
            message: 'Chat deleted as you were the only member'
          })
        }
      }
    }

    // مغادرة المحادثة
    await prisma.chatUser.delete({
      where: {
        id: chatMember.id
      }
    })

    return NextResponse.json({
      message: 'You have left the chat successfully'
    })
  } catch (error) {
    console.error('Leave chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
