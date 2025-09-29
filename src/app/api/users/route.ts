// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // التحقق من التوكن لمعرفة المستخدم الحالي
    const authHeader = request.headers.get('authorization')
    let currentUserId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = verifyToken(token)
      if (decoded) {
        currentUserId = decoded.userId
      }
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const skip = (page - 1) * limit

    // بناء query البحث مع استبعاد المستخدم الحالي
    const where = {
      AND: [
        search ? {
          OR: [
            { 
              name: { 
                contains: search,
                mode: 'insensitive' as const
              } 
            },
            { 
              email: { 
                contains: search,
                mode: 'insensitive' as const
              } 
            },
            { 
              username: { 
                contains: search,
                mode: 'insensitive' as const
              } 
            }
          ]
        } : {},
        // استبعاد المستخدم الحالي إذا كان مسجلاً دخوله
        currentUserId ? { id: { not: currentUserId } } : {}
      ].filter(condition => Object.keys(condition).length > 0) // إزالة الشروط الفارغة
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          avatar: true,
          bio: true,
          status: true,
          isVerified: true,
          lastSeen: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              friendshipsAsUser1: true,
              friendshipsAsUser2: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ 
        where: Object.keys(where).length > 0 ? where : undefined 
      })
    ])

    // حساب عدد الأصدقاء لكل مستخدم
    const usersWithFriendsCount = users.map(user => ({
      ...user,
      friendsCount: user._count.friendshipsAsUser1 + user._count.friendshipsAsUser2
    }))

    return NextResponse.json({
      message: 'تم جلب المستخدمين بنجاح',
      users: usersWithFriendsCount,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب المستخدمين' },
      { status: 500 }
    )
  }
}