// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/src/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // التحقق من نوع الملف
    const allowedTypes = ['image', 'video', 'audio']
    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }

    // التحقق من حجم الملف
    const maxSize = type === 'image' ? 5 * 1024 * 1024 : // 5MB للصور
                   type === 'audio' ? 10 * 1024 * 1024 : // 10MB للصوت
                   20 * 1024 * 1024 // 20MB للفيديو

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // إنشاء مجلد إذا لم يكن موجوداً
    const uploadDir = path.join(process.cwd(), 'public/uploads', type)
    await mkdir(uploadDir, { recursive: true })

    // إنشاء اسم فريد للملف
    const fileExt = path.extname(file.name)
    const fileName = `${uuidv4()}${fileExt}`
    const filePath = path.join(uploadDir, fileName)

    // حفظ الملف
    await writeFile(filePath, buffer)

    // إرجاع رابط الملف
    const fileUrl = `/uploads/${type}/${fileName}`

    return NextResponse.json({ url: fileUrl }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
