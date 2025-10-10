// src/app/api/messages/unread/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'
import { decrypt } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'مطلوب توكن مصادقة' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { error: 'توكن غير صالح أو منتهي الصلاحية' },
        { status: 401 }
      )
    }

    const userId = decoded.userId

    // جلب جميع المحادثات التي يشارك فيها المستخدم
    const userChats = await prisma.chatUser.findMany({
      where: {
        userId: userId
      },
      select: {
        chatId: true
      }
    })

    const chatIds = userChats.map(chat => chat.chatId)

    // جلب الرسائل غير المقروءة في محادثات المستخدم
    const unreadMessages = await prisma.message.findMany({
      where: {
        chatId: {
          in: chatIds
        },
        isRead: false,
        senderId: {
          not: userId // استبعاد الرسائل التي أرسلها المستخدم نفسه
        }
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            status: true,
            username: true
          }
        },
        chat: {
          select: {
            id: true,
            name: true,
            type: true,
            users: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            }
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
      orderBy: {
        createdAt: 'desc'
      }
    })

    // فك تشفير محتوى الرسائل
    const decryptedMessages = unreadMessages.map(message => ({
      ...message,
      content: message.encrypted ? decrypt(JSON.parse(message.content)) : message.content,
      replyTo: message.replyTo ? {
        ...message.replyTo,
        content: message.replyTo.encrypted ? decrypt(JSON.parse(message.replyTo.content)) : message.replyTo.content
      } : null
    }))

    // تجميع الرسائل حسب المرسل أو المحادثة
    const messagesByChat = decryptedMessages.reduce((acc, message) => {
      const chatId = message.chatId
      if (!acc[chatId]) {
        acc[chatId] = {
          chat: message.chat,
          messages: [],
          count: 0,
          lastMessage: message.createdAt
        }
      }
      acc[chatId].messages.push(message)
      acc[chatId].count += 1
      
      // تحديث آخر رسالة إذا كانت أحدث
      if (message.createdAt > acc[chatId].lastMessage) {
        acc[chatId].lastMessage = message.createdAt
      }
      
      return acc
    }, {} as any)

    // تجميع الرسائل حسب المرسل
    const messagesBySender = decryptedMessages.reduce((acc, message) => {
      const senderId = message.senderId
      if (!acc[senderId]) {
        acc[senderId] = {
          sender: message.sender,
          messages: [],
          count: 0
        }
      }
      acc[senderId].messages.push(message)
      acc[senderId].count += 1
      return acc
    }, {} as any)

    return NextResponse.json({
      success: true,
      unreadMessages: decryptedMessages,
      groupedByChat: messagesByChat,
      groupedBySender: messagesBySender,
      totalUnread: decryptedMessages.length,
      summary: {
        totalChats: Object.keys(messagesByChat).length,
        totalSenders: Object.keys(messagesBySender).length
      }
    })

  } catch (error) {
    console.error('Error fetching unread messages:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الرسائل غير المقروءة' },
      { status: 500 }
    )
  }
}

// دالة POST لتحديث حالة القراءة للرسائل
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'مطلوب توكن مصادقة' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { error: 'توكن غير صالح أو منتهي الصلاحية' },
        { status: 401 }
      )
    }

    const userId = decoded.userId
    const { messageIds, chatId } = await request.json()

    if (!messageIds && !chatId) {
      return NextResponse.json(
        { error: 'يجب توفير معرفات الرسائل أو معرف المحادثة' },
        { status: 400 }
      )
    }

    let whereCondition = {}

    if (messageIds && Array.isArray(messageIds)) {
      // تحديث رسائل محددة
      whereCondition = {
        id: { in: messageIds },
        chat: {
          users: {
            some: {
              userId: userId
            }
          }
        },
        senderId: { not: userId } // لا تحديث الرسائل المرسلة من المستخدم
      }
    } else if (chatId) {
      // تحديث جميع الرسائل غير المقروءة في محادثة معينة
      whereCondition = {
        chatId: chatId,
        isRead: false,
        senderId: { not: userId },
        chat: {
          users: {
            some: {
              userId: userId
            }
          }
        }
      }
    }

    // تحديث حالة القراءة
    const result = await prisma.message.updateMany({
      where: whereCondition,
      data: {
        isRead: true,
        updatedAt: new Date()
      }
    })

    // إذا كان تحديث لمحادثة معينة، قم بتحديث lastRead للمستخدم
    if (chatId) {
      await prisma.chatUser.updateMany({
        where: {
          chatId: chatId,
          userId: userId
        },
        data: {
          lastRead: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `تم تحديث ${result.count} رسالة كمقروءة`,
      updatedCount: result.count
    })

  } catch (error) {
    console.error('Error marking messages as read:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث حالة القراءة' },
      { status: 500 }
    )
  }
}
// دالة PUT/PATCH لتحديد جميع الرسائل غير المقروءة كمقروءة
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'مطلوب توكن مصادقة' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { error: 'توكن غير صالح أو منتهي الصلاحية' },
        { status: 401 }
      )
    }

    const userId = decoded.userId

    // جلب جميع المحادثات التي يشارك فيها المستخدم
    const userChats = await prisma.chatUser.findMany({
      where: {
        userId: userId
      },
      select: {
        chatId: true
      }
    })

    const chatIds = userChats.map(chat => chat.chatId)

    // تحديث جميع الرسائل غير المقروءة في جميع محادثات المستخدم
    const result = await prisma.message.updateMany({
      where: {
        chatId: {
          in: chatIds
        },
        isRead: false,
        senderId: {
          not: userId // استبعاد الرسائل التي أرسلها المستخدم نفسه
        }
      },
      data: {
        isRead: true,
        updatedAt: new Date()
      }
    })

    // تحديث lastRead في جميع محادثات المستخدم
    await prisma.chatUser.updateMany({
      where: {
        userId: userId,
        chatId: {
          in: chatIds
        }
      },
      data: {
        lastRead: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: `تم تحديد جميع الرسائل (${result.count}) كمقروءة`,
      updatedCount: result.count
    })

  } catch (error) {
    console.error('Error marking all messages as read:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديد جميع الرسائل كمقروءة' },
      { status: 500 }
    )
  }
      }
