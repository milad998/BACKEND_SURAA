// src/app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'all' // all, users, chats, messages
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters long' },
        { status: 400 }
      )
    }

    const searchQuery = query.trim().toLowerCase()
    const results: any = {}

    // البحث في المستخدمين
    if (type === 'all' || type === 'users') {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { username: { contains: searchQuery, mode: 'insensitive' } },
            { email: { contains: searchQuery, mode: 'insensitive' } }
          ],
          id: { not: userId } // استبعاد المستخدم الحالي
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
          status: true,
          bio: true,
          isVerified: true,
          lastSeen: true
        },
        take: limit
      })

      // التحقق من علاقات الصداقة
      const usersWithFriendship = await Promise.all(
        users.map(async (user) => {
          const friendship = await prisma.friendship.findFirst({
            where: {
              OR: [
                { user1Id: userId, user2Id: user.id },
                { user1Id: user.id, user2Id: userId }
              ]
            }
          })

          const friendRequest = await prisma.friendRequest.findFirst({
            where: {
              OR: [
                { senderId: userId, receiverId: user.id },
                { senderId: user.id, receiverId: userId }
              ],
              status: 'PENDING'
            }
          })

          return {
            ...user,
            friendshipStatus: friendship?.status || null,
            friendRequestStatus: friendRequest?.status || null
          }
        })
      )

      results.users = usersWithFriendship
    }

    // البحث في المحادثات
    if (type === 'all' || type === 'chats') {
      const chats = await prisma.chat.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: searchQuery, mode: 'insensitive' } },
                { description: { contains: searchQuery, mode: 'insensitive' } }
              ]
            },
            {
              users: {
                some: { userId }
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
                  avatar: true,
                  status: true
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
        take: limit
      })

      results.chats = chats
    }

    // البحث في الرسائل
    if (type === 'all' || type === 'messages') {
      // الحصول على محادثات المستخدم أولاً
      const userChats = await prisma.chatUser.findMany({
        where: { userId },
        select: { chatId: true }
      })

      const chatIds = userChats.map(chat => chat.chatId)

      const messages = await prisma.message.findMany({
        where: {
          chatId: { in: chatIds },
          content: { contains: searchQuery, mode: 'insensitive' }
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          chat: {
            select: {
              id: true,
              name: true,
              type: true
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
        orderBy: { createdAt: 'desc' },
        take: limit
      })

      results.messages = messages
    }

    // إحصائيات النتائج
    const stats = {
      users: results.users?.length || 0,
      chats: results.chats?.length || 0,
      messages: results.messages?.length || 0,
      total: (results.users?.length || 0) + 
             (results.chats?.length || 0) + 
             (results.messages?.length || 0)
    }

    return NextResponse.json({
      message: 'Search completed successfully',
      query: searchQuery,
      type,
      results,
      stats
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
