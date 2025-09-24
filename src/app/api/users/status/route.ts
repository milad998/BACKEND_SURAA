// src/pages/api/users/status.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { status } = req.body

    if (!status || !['ONLINE', 'OFFLINE', 'AWAY'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    // هنا تقوم بتحديث حالة المستخدم في قاعدة البيانات
    // هذا مثال باستخدام Prisma - عدله حسب قاعدة البيانات الخاصة بك
    
    // const updatedUser = await prisma.user.update({
    //   where: { id: session.user.id },
    //   data: { 
    //     status,
    //     lastSeen: status === 'OFFLINE' ? new Date() : undefined
    //   }
    // })

    // مؤقتاً: إرجاع رسالة نجاح بدون تحديث قاعدة البيانات
    console.log(`User ${session.user.id} status updated to: ${status}`)
    
    res.status(200).json({ 
      success: true, 
      message: 'Status updated successfully',
      status 
    })

  } catch (error) {
    console.error('Error updating user status:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}