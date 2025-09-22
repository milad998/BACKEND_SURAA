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