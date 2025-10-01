// src/app/api/chats/[chatId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// GET - جلب معلومات محادثة محددة
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

    // جلب معلومات المحادثة
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                status: true,
                lastSeen: true,
                bio: true
              }
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Chat retrieved successfully',
      chat
    })
  } catch (error) {
    console.error('Get chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - تحديث معلومات المحادثة
export async function PUT(
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
    const { name, description, background } = await request.json()

    // التحقق من أن المستخدم هو مالك أو مشرف في المحادثة
    const chatMember = await prisma.chatUser.findFirst({
      where: {
        chatId,
        userId,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    })

    if (!chatMember) {
      return NextResponse.json(
        { error: 'You do not have permission to update this chat' },
        { status: 403 }
      )
    }

    // تحديث المحادثة
    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(background && { background })
      },
      include: {
        users: {
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
        }
      }
    })

    return NextResponse.json({
      message: 'Chat updated successfully',
      chat: updatedChat
    })
  } catch (error) {
    console.error('Update chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - حذف المحادثة
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

    // التحقق من أن المستخدم هو المالك
    const chatMember = await prisma.chatUser.findFirst({
      where: {
        chatId,
        userId,
        role: 'OWNER'
      }
    })

    if (!chatMember) {
      return NextResponse.json(
        { error: 'Only the owner can delete this chat' },
        { status: 403 }
      )
    }

    // حذف المحادثة (سيتم حذف جميع الرسائل والأعضاء تلقائياً بسبب onDelete: Cascade)
    await prisma.chat.delete({
      where: { id: chatId }
    })

    return NextResponse.json({
      message: 'Chat deleted successfully'
    })
  } catch (error) {
    console.error('Delete chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
