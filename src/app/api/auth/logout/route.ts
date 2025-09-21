import { NextResponse } from 'next/server'

export async function POST() {
  try {
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