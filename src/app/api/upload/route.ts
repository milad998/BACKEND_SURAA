// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import cloudinary from '@/lib/cloudinary'
import { writeFile } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const chatId = formData.get('chatId') as string

    if (!file || !chatId) {
      return NextResponse.json(
        { error: 'File and chat ID are required' },
        { status: 400 }
      )
    }

    // التحقق من حجم الملف
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // تحديد نوع الوسائط
    let mediaType: 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO' = 'FILE'
    if (file.type.startsWith('image/')) {
      mediaType = 'IMAGE'
    } else if (file.type.startsWith('video/')) {
      mediaType = 'VIDEO'
    } else if (file.type.startsWith('audio/')) {
      mediaType = 'AUDIO'
    }

    // تحويل الملف إلى buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // رفع الملف إلى Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: mediaType === 'VIDEO' || mediaType === 'AUDIO' ? 'video' : 'auto',
          folder: `chat-app/${chatId}`,
          public_id: `${uuidv4()}-${file.name}`,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      uploadStream.end(buffer)
    })

    return NextResponse.json({
      success: true,
      mediaUrl: result.secure_url,
      publicId: result.public_id,
      mediaType,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration,
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'File upload failed' },
      { status: 500 }
    )
  }
}
