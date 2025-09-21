// src/lib/auth.ts
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'

// تعريف authOptions مرة واحدة فقط
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

        // البحث عن المستخدم في قاعدة البيانات
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email.toLowerCase()
          }
        })

        if (!user) {
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        }

        // مقارنة كلمة المرور
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
        }

        // إرجاع بيانات المستخدم بدون كلمة المرور
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
      }
      return session
    },
    jwt: async ({ user, token }) => {
      if (user) {
        token.uid = user.id
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
  debug: process.env.NODE_ENV === 'development',
}

// إنشاء instance من NextAuth وتصدير الدوال المطلوبة
const { auth, signIn, signOut } = NextAuth(authOptions)

// تصدير الدوال والكائنات مرة واحدة فقط
export { auth, signIn, signOut, authOptions }

// تعريف أنواع TypeScript
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
    }
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
  }
}