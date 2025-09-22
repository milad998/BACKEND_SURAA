// src/lib/auth-utils.ts
import { prisma } from './prisma'

export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    
    // التحقق من انتهاء الصلاحية
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return null
    }
    
    return { userId: decoded.userId }
  } catch (error) {
    return null
  }
}

export async function getUserFromToken(token: string) {
  try {
    const decoded = verifyToken(token)
    if (!decoded) return null

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, status: true }
    })

    return user
  } catch (error) {
    return null
  }
}

export function generateToken(userId: string): string {
  const payload = {
    userId: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}