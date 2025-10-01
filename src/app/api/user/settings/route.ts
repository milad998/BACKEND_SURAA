// src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// GET - جلب إعدادات المستخدم
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

    // جلب إعدادات المستخدم
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true
          }
        }
      }
    })

    // إذا لم تكن هناك إعدادات، إنشاء إعدادات افتراضية
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          theme: 'light',
          language: 'ar',
          notifications: true,
          sound: true,
          twoFactorAuth: false,
          privacyProfile: 'PUBLIC'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              avatar: true
            }
          }
        }
      })
    }

    return NextResponse.json({
      message: 'User settings retrieved successfully',
      settings
    })
  } catch (error) {
    console.error('Get user settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - تحديث إعدادات المستخدم
export async function PUT(request: NextRequest) {
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
    const updates = await request.json()

    // الحقول المسموح بتحديثها
    const allowedFields = [
      'theme',
      'language', 
      'notifications',
      'sound',
      'twoFactorAuth',
      'privacyProfile'
    ]

    // تصفية الحقول المسموح بها فقط
    const filteredUpdates: any = {}
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key]
      }
    })

    // التحقق من القيم الصحيحة لـ privacyProfile
    if (filteredUpdates.privacyProfile && 
        !['PUBLIC', 'PRIVATE', 'FRIENDS_ONLY'].includes(filteredUpdates.privacyProfile)) {
      return NextResponse.json(
        { error: 'Invalid privacy profile value' },
        { status: 400 }
      )
    }

    // تحديث الإعدادات
    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...filteredUpdates,
        lastUpdated: new Date()
      },
      create: {
        userId,
        theme: filteredUpdates.theme || 'light',
        language: filteredUpdates.language || 'ar',
        notifications: filteredUpdates.notifications !== undefined ? filteredUpdates.notifications : true,
        sound: filteredUpdates.sound !== undefined ? filteredUpdates.sound : true,
        twoFactorAuth: filteredUpdates.twoFactorAuth !== undefined ? filteredUpdates.twoFactorAuth : false,
        privacyProfile: filteredUpdates.privacyProfile || 'PUBLIC'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'User settings updated successfully',
      settings: updatedSettings
    })
  } catch (error) {
    console.error('Update user settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
