import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

// src/app/api/friends/route.ts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // الحصول على الأصدقاء من كلا الجانبين
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: session.user.id },
          { user2Id: session.user.id }
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
      const friend = friendship.user1Id === session.user.id ? friendship.user2 : friendship.user1
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
