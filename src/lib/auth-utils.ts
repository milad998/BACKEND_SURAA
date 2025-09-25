// src/lib/auth-utils.ts
import { prisma } from './prisma'

export interface DecodedToken {
  userId: string
  iat: number
  exp: number
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    // إضافة التحقق من صحة base64
    if (!token || token.trim() === '') {
      return null
    }

    // التحقق من أن التوكن صيغة base64 صالحة
    const decodedString = Buffer.from(token, 'base64').toString('utf-8')
    const decoded: DecodedToken = JSON.parse(decodedString)
    
    // التحقق من انتهاء الصلاحية
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return null
    }
    
    // التحقق من وجود userId
    if (!decoded.userId) {
      return null
    }
    
    return { userId: decoded.userId }
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

export async function getUserFromToken(token: string) {
  try {
    const decoded = verifyToken(token)
    if (!decoded) return null

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        status: true,
        lastSeen: true,
        statusUpdatedAt: true
      }
    })

    return user
  } catch (error) {
    console.error('Error getting user from token:', error)
    return null
  }
}

export function generateToken(userId: string): string {
  const payload = {
    userId: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 يوم
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

// دالة مساعدة للتحقق من صلاحية التوكن
export function isTokenValid(token: string): boolean {
  return verifyToken(token) !== null
}
