// src/lib/auth.ts
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'

export const authOptions: NextAuthOptions = {
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
      if (session?.user && token?.sub) {
        session.user.id = token.sub
        session.user.accessToken = token.accessToken
      }
      return session
    },
    jwt: async ({ user, token, trigger, session }) => {
      if (user) {
        token.uid = user.id
        token.accessToken = generateAccessToken(user.id)
      }
      
      if (trigger === "update" && session?.accessToken) {
        token.accessToken = session.accessToken
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
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 يوم
  },
}

// دالة لتوليد JWT Token
function generateAccessToken(userId: string): string {
  // يمكنك استخدام مكتبة مثل jsonwebtoken هنا
  // للتبسيط، سنستخدم توليد بسيط
  const payload = {
    userId: userId,
    timestamp: Date.now(),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 يوم
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

// إنشاء instance من NextAuth وتصدير الدوال
const { auth, signIn, signOut, unstable_update } = NextAuth(authOptions)

export { auth, signIn, signOut, unstable_update }

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      accessToken?: string
    }
    accessToken?: string
  }
  
  interface User {
    id: string
    email: string
    name: string
  }
  
  interface JWT {
    uid: string
    accessToken?: string
  }
    }
