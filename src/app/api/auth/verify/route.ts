// src/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await getUserFromToken(token)

    return NextResponse.json({
      user: user,
      authenticated: !!user
    }, { status: 200 })

  } catch (error) {
    return NextResponse.json({ user: null }, { status: 500 })
  }
}