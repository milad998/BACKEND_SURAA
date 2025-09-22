// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني وكلمة المرور مطلوبان' },
        { status: 400 }
      )
    }

    // استخدام signIn من NextAuth
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      )
    }

    // الحصول على الجلسة بعد تسجيل الدخول الناجح
    const { auth } = await import('@/lib/auth')
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'فشل في إنشاء الجلسة' },
        { status: 500 }
      )
    }

    // إرجاع بيانات المستخدم مع Token
    return NextResponse.json({
      message: 'تم تسجيل الدخول بنجاح',
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      },
      accessToken: session.user.accessToken || generateSimpleToken(session.user.id),
      expiresIn: '30d'
    }, { status: 200 })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الدخول' },
      { status: 500 }
    )
  }
}

// دالة مساعدة لتوليد Token بسيط (للاختبار)
function generateSimpleToken(userId: string): string {
  const tokenData = {
    userId: userId,
    timestamp: Date.now(),
    type: 'access'
  }
  return Buffer.from(JSON.stringify(tokenData)).toString('base64')
        }
