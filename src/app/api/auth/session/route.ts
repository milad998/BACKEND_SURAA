// src/app/api/auth/session/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      },
      accessToken: session.user.accessToken
    }, { status: 200 })

  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التحقق من الجلسة' },
      { status: 500 }
    )
  }
}
