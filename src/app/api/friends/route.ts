// src/app/api/friends/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // التحقق من التوكن من الهيدر
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'مطلوب توكن مصادقة' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'توكن غير صالح أو منتهي الصلاحية' },
        { status: 401 }
      )
    }

    const userId = decoded.userId

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // الحصول على الأصدقاء من كلا الجانبين
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ],
        status: 'ACCEPTED'
      },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            status: true,
            lastSeen: true,
            bio: true
          }
        },
        user2: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            status: true,
            lastSeen: true,
            bio: true
          }
        }
      }
    })

    // استخراج معلومات الأصدقاء
    const friends = friendships.map(friendship => {
      const friend = friendship.user1Id === userId ? friendship.user2 : friendship.user1
      return {
        ...friend,
        friendshipId: friendship.id,
        friendsSince: friendship.createdAt
      }
    })

    // البحث إذا كان هناك بحث
    const filteredFriends = search ? friends.filter(friend =>
      friend.name.toLowerCase().includes(search.toLowerCase()) ||
      friend.username?.toLowerCase().includes(search.toLowerCase())
    ) : friends

    return NextResponse.json({
      message: 'تم جلب قائمة الأصدقاء بنجاح',
      friends: filteredFriends,
      count: filteredFriends.length
    }, { status: 200 })

  } catch (error) {
    console.error('Get friends error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب قائمة الأصدقاء' },
      { status: 500 }
    )
  }
}