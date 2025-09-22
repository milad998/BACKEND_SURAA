// src/app/api/auth/token/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      )
    }

    // تجديد Token
    const newToken = generateAccessToken(session.user.id)

    return NextResponse.json({
      accessToken: newToken,
      tokenType: 'Bearer',
      expiresIn: '30d'
    }, { status: 200 })

  } catch (error) {
    console.error('Token error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء توليد Token' },
      { status: 500 }
    )
  }
}

function generateAccessToken(userId: string): string {
  const payload = {
    userId: userId,
    timestamp: Date.now(),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
      }
