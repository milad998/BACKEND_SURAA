// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/utils'
import { verifyToken } from '@/lib/auth-utils'
import { NotificationService } from '@/lib/notification-service'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.userId

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

    // جلب الرسائل مع دعم الردود
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
            avatar: true,
            status: true
          }
        },
        replyTo: {
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
      },
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    })

    // فك تشفير الرسائل
    const decryptedMessages = messages.map(message => ({
      ...message,
      content: message.encrypted ? decrypt(JSON.parse(message.content)) : message.content,
      // فك تشفير محتوى الرسالة المردود عليها أيضاً
      replyTo: message.replyTo ? {
        ...message.replyTo,
        content: message.replyTo.encrypted ? decrypt(JSON.parse(message.replyTo.content)) : message.replyTo.content
      } : null
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
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.userId
    const { content, chatId, type = 'TEXT', replyToId, encrypted = true } = await request.json()

    // التحقق من البيانات المطلوبة
    if (!content || !chatId) {
      return NextResponse.json(
        { error: 'Content and Chat ID are required' },
        { status: 400 }
      )
    }

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

    // التحقق من صحة الرد إذا تم إرساله
    if (replyToId) {
      const replyToMessage = await prisma.message.findFirst({
        where: {
          id: replyToId,
          chatId
        }
      })

      if (!replyToMessage) {
        return NextResponse.json(
          { error: 'Reply message not found' },
          { status: 404 }
        )
      }
    }

    let shouldEncrypt = encrypted
    let finalContent = content

    if (shouldEncrypt) {
      try {
        const encryptedData = encrypt(content)
        finalContent = JSON.stringify(encryptedData)
      } catch (error) {
        console.error('Encryption failed, sending as plain text:', error)
        shouldEncrypt = false
        finalContent = content
      }
    }

    // جلب معلومات المرسل
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true
      }
    })

    if (!sender) {
      return NextResponse.json(
        { error: 'Sender not found' },
        { status: 404 }
      )
    }

    // جلب معلومات المحادثة والأعضاء
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                settings: {
                  select: {
                    notifications: true
                  }
                }
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

    // إنشاء الرسالة
    const message = await prisma.message.create({
      data: {
        content: finalContent,
        type,
        encrypted: shouldEncrypt,
        senderId: userId,
        chatId,
        replyToId: replyToId || null
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true
          }
        },
        replyTo: {
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

    // تحديث وقت آخر تعديل للمحادثة
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    })

    // تحديث lastRead للمستخدم في المحادثة
    await prisma.chatUser.update({
      where: {
        id: chatMember.id
      },
      data: {
        lastRead: new Date()
      }
    })

    // إنشاء إشعارات للمستخدمين الآخرين في المحادثة
    const otherChatUsers = chat.users.filter(chatUser => chatUser.userId !== userId)
    
    for (const chatUser of otherChatUsers) {
      // التحقق من إعدادات الإشعارات للمستخدم (إذا كانت الإشعارات مفعلة)
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId: chatUser.userId },
        select: { notifications: true }
      })

      const shouldSendNotification = userSettings?.notifications !== false

      if (shouldSendNotification) {
        try {
          await NotificationService.createNewMessageNotification(
            sender,
            chatUser.userId,
            chatId,
            content, // المحتوى الأصلي قبل التشفير
            chat.type
          )
        } catch (error) {
          console.error(`Failed to create notification for user ${chatUser.userId}:`, error)
          // نستمر في محاولة إنشاء إشعارات للمستخدمين الآخرين حتى لو فشل أحدهم
        }
      }
    }

    // إرجاع الرسالة مع المحتوى الأصلي للعرض الفوري
    const responseMessage = {
      ...message,
      content: shouldEncrypt ? content : message.content,
      replyTo: message.replyTo ? {
        ...message.replyTo,
        content: message.replyTo.encrypted ? decrypt(JSON.parse(message.replyTo.content)) : message.replyTo.content
      } : null
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
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.userId
    const { messageId } = await request.json()

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    // البحث عن الرسالة والتحقق من أن المستخدم عضو في المحادثة
    const message = await prisma.message.findFirst({
      where: {
        id: messageId
      },
      include: {
        chat: {
          include: {
            users: {
              where: {
                userId: userId
              }
            }
          }
        }
      }
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // التحقق من أن المستخدم عضو في المحادثة
    if (!message.chat.users.length) {
      return NextResponse.json(
        { error: 'You are not a member of this chat' },
        { status: 403 }
      )
    }

    // تحديث حالة القراءة للرسالة
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
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.userId

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    // البحث عن الرسالة والتحقق من الملكية
    const message = await prisma.message.findFirst({
      where: {
        id: messageId
      },
      include: {
        chat: {
          include: {
            users: {
              where: {
                userId: userId
              }
            }
          }
        },
        sender: true
      }
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // التحقق من أن المستخدم عضو في المحادثة
    if (!message.chat.users.length) {
      return NextResponse.json(
        { error: 'You are not a member of this chat' },
        { status: 403 }
      )
    }

    // التحقق من الصلاحيات: فقط المرسل يمكنه حذف الرسالة
    const isSender = message.senderId === userId

    if (!isSender) {
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
      where: { id: message.chatId },
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
