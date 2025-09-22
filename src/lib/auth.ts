// src/lib/auth.ts
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'

// تعريف authOptions كـ const بدلاً من export
const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان')
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email.toLowerCase()
          }
        })

        if (!user) {
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user) {
        session.user.id = token.sub as string
        // إضافة accessToken إلى session
        (session as any).accessToken = token.accessToken
      }
      return session
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.uid = user.id
        token.accessToken = generateAccessToken(user.id)
      }
      return token
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 يوم
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}

// دالة لتوليد Token
function generateAccessToken(userId: string): string {
  const payload = {
    userId: userId,
    timestamp: Date.now(),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

const { auth, signIn, signOut } = NextAuth(authOptions)

// التصدير مرة واحدة فقط
export { auth, signIn, signOut, authOptions }

// تعريف الأنواع الممتدة
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
    }
    accessToken?: string
  }
  
  interface User {
    id: string
    email: string
    name: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid: string
    accessToken?: string
  }
    }
