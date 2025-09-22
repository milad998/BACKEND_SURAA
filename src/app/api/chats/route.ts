import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // جلب جميع المحادثات الخاصة بالمستخدم
    const chats = await prisma.chat.findMany({
      where: {
        users: {
          some: {
            userId: session.user.id
          }
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
          orderBy: {
            createdAt: 'desc'
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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userIds, name, type = 'PRIVATE' } = await request.json()

    // التحقق من وجود البيانات المطلوبة
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'User IDs are required and must be an array' },
        { status: 400 }
      )
    }

    // إضافة المستخدم الحالي إلى قائمة المستخدمين
    const allUserIds = [session.user.id, ...userIds]

    // التحقق من عدم وجود محادثة مكررة (للمحادثات الخاصة)
    if (type === 'PRIVATE' && userIds.length === 1) {
      const existingChat = await prisma.chat.findFirst({
        where: {
          type: 'PRIVATE',
          users: {
            every: {
              userId: {
                in: allUserIds
              }
            }
          }
        },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
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
          orderBy: {
            createdAt: 'desc'
          }
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
