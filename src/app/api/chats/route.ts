// src/app/api/chats/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromToken } from '@/lib/auth-utils'

// دالة GET لجلب المحادثات الموجودة
export async function GET(request: Request) {
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

    // تحسين استعلام جلب المحادثات
    const chats = await prisma.chat.findMany({
      where: {
        users: {
          some: { userId: user.id }
        },
        isActive: true // المحادثات النشطة فقط
      },
      include: {
        users: {
          include: {
            user: {
              select: { 
                id: true, 
                name: true, 
                email: true, 
                avatar: true, 
                status: true,
                username: true
              }
            }
          }
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
      },
      orderBy: { 
        updatedAt: 'desc' 
      }
    })

    return NextResponse.json(chats)
  } catch (error) {
    console.error('Chats fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// دالة POST لإنشاء محادثة جديدة
export async function POST(request: Request) {
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

    const { userIds, name, type = 'PRIVATE' } = await request.json()

    // التحقق من البيانات
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'User IDs are required and must be an array' },
        { status: 400 }
      )
    }

    // منع المستخدم من إضافة نفسه
    const filteredUserIds = userIds.filter(id => id !== user.id)
    const allUserIds = [user.id, ...filteredUserIds]

    if (filteredUserIds.length === 0) {
      return NextResponse.json(
        { error: 'Cannot create chat with yourself only' },
        { status: 400 }
      )
    }

    // التحقق من وجود المستخدمين
    const existingUsers = await prisma.user.findMany({
      where: {
        id: { in: allUserIds }
      },
      select: { id: true }
    })

    if (existingUsers.length !== allUserIds.length) {
      return NextResponse.json(
        { error: 'One or more users not found' },
        { status: 404 }
      )
    }

    // للمحادثات الجماعية، تأكد من وجود اسم
    if (type === 'GROUP' && (!name || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }

    // التحقق من محادثة خاصة مكررة
    if (type === 'PRIVATE' && filteredUserIds.length === 1) {
      const existingChat = await prisma.chat.findFirst({
        where: {
          type: 'PRIVATE',
          AND: [
            {
              users: {
                some: { userId: user.id }
              }
            },
            {
              users: {
                some: { userId: filteredUserIds[0] }
              }
            }
          ]
        },
        include: {
          users: {
            include: {
              user: {
                select: { 
                  id: true, 
                  name: true, 
                  email: true,
                  username: true 
                }
              }
            }
          }
        }
      })

      if (existingChat) {
        return NextResponse.json(existingChat)
      }
    }

    // إنشاء المحادثة الجديدة
    const chat = await prisma.chat.create({
      data: {
        name: type === 'PRIVATE' ? null : name,
        type,
        users: {
          create: allUserIds.map(userId => ({
            userId,
            role: userId === user.id ? 'OWNER' : 'MEMBER'
          }))
        }
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                status: true,
                username: true
              }
            }
          }
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

    // إنشاء إشعارات للمستخدمين المضافين للمحادثة
    if (type === 'GROUP') {
      try {
        await prisma.notification.createMany({
          data: filteredUserIds.map(userId => ({
            type: 'GROUP_INVITE',
            title: 'دعوة لمجموعة جديدة',
            message: `تمت إضافتك إلى مجموعة "${name}"`,
            receiverId: userId,
            senderId: user.id,
            data: {
              chatId: chat.id,
              chatName: name,
              inviterName: user.name
            }
          }))
        })
      } catch (notificationError) {
        console.error('Failed to create notifications:', notificationError)
        // لا نعيد خطأ هنا لأن المحادثة أنشئت بنجاح
      }
    }

    return NextResponse.json(chat, { status: 201 })

  } catch (error) {
    console.error('Chat creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
