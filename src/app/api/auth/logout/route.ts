import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST() {
  try {
    // إضافة منطق تسجيل الخروج هنا إذا لزم الأمر
    return NextResponse.json(
      { message: 'تم تسجيل الخروج بنجاح' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الخروج' },
      { status: 500 }
    )
  }
}