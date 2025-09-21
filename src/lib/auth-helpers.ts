// src/lib/auth-helpers.ts
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export async function authenticateUser(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { 
        email: email.toLowerCase() 
      }
    })

    if (!user) return null

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export async function getCurrentUser() {
  try {
    const { getServerSession } = await import('next-auth/next')
    const { authOptions } = await import('./auth')
    
    const session = await getServerSession(authOptions)
    return session?.user || null
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('غير مصرح')
  }
  return user
}