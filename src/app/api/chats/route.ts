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

    const chats = await prisma.chat.findMany({
      where: {
        users: {
          some: { userId: user.id }
        }
      },
      include: {
        users: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, status: true }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, name: true, avatar: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
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

// دالة POST لإنشاء محادثة جديدة - تأكد من وجود هذا التصدير
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

    // إضافة المستخدم الحالي إلى المحادثة
    const allUserIds = [user.id, ...userIds]

    // التحقق من محادثة خاصة مكررة
    if (type === 'PRIVATE' && userIds.length === 1) {
      const existingChat = await prisma.chat.findFirst({
        where: {
          type: 'PRIVATE',
          users: {
            every: {
              userId: { in: allUserIds }
            }
          }
        },
        include: {
          users: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
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
        name: type === 'GROUP' ? name : null,
        type,
        users: {
          create: allUserIds.map(userId => ({
            user: { connect: { id: userId } }
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
                status: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return NextResponse.json(chat, { status: 201 })

  } catch (error) {
    console.error('Chat creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}