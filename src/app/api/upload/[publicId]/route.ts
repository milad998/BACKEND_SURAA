// src/app/api/upload/[publicId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import cloudinary from '@/lib/cloudinary'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { publicId: string } }
) {
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

    const { publicId } = params

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      )
    }

    // حذف الملف من Cloudinary
    const result = await cloudinary.uploader.destroy(publicId)

    if (result.result !== 'ok') {
      return NextResponse.json(
        { error: 'Failed to delete file from Cloudinary' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'File deletion failed' },
      { status: 500 }
    )
  }
}
