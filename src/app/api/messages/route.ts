// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
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
        },
        receiver: {
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, chatId, type, receiverId, encrypted = true } = await request.json()

    let encryptedContent = content
    if (encrypted) {
      encryptedContent = JSON.stringify(encrypt(content))
    }

    const message = await prisma.message.create({
      data: {
        content: encryptedContent,
        type,
        encrypted,
        senderId: session.user.id,
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
        },
        receiver: {
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

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
