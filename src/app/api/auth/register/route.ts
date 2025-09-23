import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// POST - إنشاء مستخدم جديد
export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    // التحقق من وجود البيانات المطلوبة
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني وكلمة المرور والاسم مطلوبة' },
        { status: 400 }
      )
    }

    // التحقق من إذا كان المستخدم موجود بالفعل
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'هذا البريد الإلكتروني مستخدم بالفعل' },
        { status: 400 }
      )
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 12)

    // إنشاء المستخدم في قاعدة البيانات
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      }
    })

    return NextResponse.json(
      { 
        message: 'تم إنشاء الحساب بنجاح',
        user 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إنشاء الحساب' },
      { status: 500 }
    )
  }
}

// GET - جلب جميع المستخدمين
export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(
      { 
        message: 'تم جلب المستخدمين بنجاح',
        users,
        count: users.length
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب المستخدمين' },
      { status: 500 }
    )
  }
      }
