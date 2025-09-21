// src/app/api/chats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'
import { prisma } from '../../../src/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json(chats)
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

    const { userIds, name, type } = await request.json()
    const allUserIds = [session.user.id, ...userIds]

    // التحقق من وجود محادثة خاصة بالفعل
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
          users: true
        }
      })

      if (existingChat) {
        return NextResponse.json(existingChat)
      }
    }

    const chat = await prisma.chat.create({
      data: {
        name,
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
        }
      }
    })

    return NextResponse.json(chat, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
