import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export async function authenticateUser(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
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