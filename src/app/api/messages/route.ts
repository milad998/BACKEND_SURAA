// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/utils'
import { getUserFromToken } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      )
    }

    // التحقق من أن المستخدم عضو في المحادثة
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        users: {
          some: {
            userId: user.id
          }
        }
      }
    })

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found or access denied' },
        { status: 404 }
      )
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        ...(cursor && { id: { lt: cursor } })
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    })

    // فك تشفير الرسائل
    const decryptedMessages = messages.map(message => ({
      ...message,
      content: message.encrypted ? decrypt(JSON.parse(message.content)) : message.content
    }))

    return NextResponse.json({
      messages: decryptedMessages.reverse(),
      nextCursor: messages.length === limit ? messages[messages.length - 1].id : null
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, chatId, type = 'TEXT', receiverId, encrypted = true } = await request.json()

    // التحقق من البيانات المطلوبة
    if (!content || !chatId) {
      return NextResponse.json(
        { error: 'Content and Chat ID are required' },
        { status: 400 }
      )
    }

    // التحقق من أن المستخدم عضو في المحادثة
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        users: {
          some: {
            userId: user.id
          }
        }
      }
    })

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found or access denied' },
        { status: 404 }
      )
    }

    // استخدام let بدلاً من const للتحكم في التشفير
    let shouldEncrypt = encrypted
    let finalContent = content

    if (shouldEncrypt) {
      try {
        const encryptedData = encrypt(content)
        finalContent = JSON.stringify(encryptedData)
      } catch (error) {
        console.error('Encryption failed, sending as plain text:', error)
        shouldEncrypt = false  // ← الآن يمكن التعديل لأنه let
        finalContent = content
      }
    }

    // إنشاء الرسالة
    const message = await prisma.message.create({
      data: {
        content: finalContent,
        type,
        encrypted: shouldEncrypt,  // ← استخدام المتغير المعدل
        senderId: user.id,
        receiverId: receiverId || null,
        chatId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    // تحديث وقت آخر تعديل للمحادثة
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    })

    // إرجاع الرسالة مع المحتوى الأصلي (غير مشفر) للعرض الفوري
    const responseMessage = {
      ...message,
      content: shouldEncrypt ? content : message.content
    }

    return NextResponse.json(responseMessage, { status: 201 })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageId } = await request.json()

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    // البحث عن الرسالة والتحقق من أن المستخدم عضو في المحادثة
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId
      },
      include: {
        chat: {
          include: {
            users: {
              where: {
                userId: user.id
              }
            }
          }
        }
      }
    })

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // التحقق من أن المستخدم عضو في المحادثة
    if (existingMessage.chat.users.length === 0) {
      return NextResponse.json(
        { error: 'You are not a member of this chat' },
        { status: 403 }
      )
    }

    // تحديث الرسالة لجعل isRead = true
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        updatedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    // فك تشفير المحتوى للعرض
    const decryptedContent = updatedMessage.encrypted ? 
      decrypt(JSON.parse(updatedMessage.content)) : updatedMessage.content

    const responseMessage = {
      ...updatedMessage,
      content: decryptedContent
    }

    return NextResponse.json(responseMessage)
  } catch (error) {
    console.error('Error updating message read status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
      }

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    // البحث عن الرسالة والتحقق من الملكية أو صلاحيات المشرف
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId
      },
      include: {
        chat: {
          include: {
            users: {
              where: {
                userId: user.id
              },
              include: {
                user: true
              }
            }
          }
        },
        sender: true
      }
    })

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // التحقق من أن المستخدم عضو في المحادثة
    if (existingMessage.chat.users.length === 0) {
      return NextResponse.json(
        { error: 'You are not a member of this chat' },
        { status: 403 }
      )
    }

    // التحقق من الصلاحيات: إما المرسل أو مشرف في المجموعة
    const isSender = existingMessage.senderId === user.id
    const isAdmin = existingMessage.chat.type === 'GROUP' && 
      existingMessage.chat.users[0]?.user.role === 'ADMIN'

    if (!isSender && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this message' },
        { status: 403 }
      )
    }

    // حذف الرسالة
    await prisma.message.delete({
      where: { id: messageId }
    })

    // تحديث وقت آخر تعديل للمحادثة
    await prisma.chat.update({
      where: { id: existingMessage.chatId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Message deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
