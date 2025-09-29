// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // استخراج params باستخدام await
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
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
        settings: true,
        _count: {
          select: {
            friendshipsAsUser1: true,
            friendshipsAsUser2: true,
            chats: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      )
    }

    const userWithStats = {
      ...user,
      friendsCount: user._count.friendshipsAsUser1 + user._count.friendshipsAsUser2,
      chatsCount: user._count.chats
    }

    return NextResponse.json({
      message: 'تم جلب بيانات المستخدم بنجاح',
      user: userWithStats
    }, { status: 200 })

  } catch (error) {
    console.error('Get user by ID error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب بيانات المستخدم' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // استخراج params باستخدام await
    const { id } = await params
    const { name, username, bio, avatar, password, status } = await request.json()

    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      )
    }

    if (username && username !== existingUser.username) {
      const usernameExists = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id }
        }
      })

      if (usernameExists) {
        return NextResponse.json(
          { error: 'اسم المستخدم هذا مستخدم بالفعل' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {
      name: name || existingUser.name,
      username: username || existingUser.username,
      bio: bio !== undefined ? bio : existingUser.bio,
      avatar: avatar || existingUser.avatar,
      status: status || existingUser.status
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
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
        updatedAt: true
      }
    })

    return NextResponse.json({
      message: 'تم تحديث بيانات المستخدم بنجاح',
      user: updatedUser
    }, { status: 200 })

  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث بيانات المستخدم' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // استخراج params باستخدام await
    const { id } = await params

    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      )
    }

    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'تم حذف المستخدم بنجاح'
    }, { status: 200 })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف المستخدم' },
      { status: 500 }
    )
  }
}