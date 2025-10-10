import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'

export class NotificationService {
  // إنشاء إشعار جديد
  static async createNotification(data: {
    type: NotificationType
    title: string
    message: string
    receiverId: string
    senderId?: string
    data?: any
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          type: data.type,
          title: data.title,
          message: data.message,
          receiverId: data.receiverId,
          senderId: data.senderId,
          data: data.data || null
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              status: true
            }
          }
        }
      })

      return notification
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  // إشعار عند رسالة جديدة
  static async createNewMessageNotification(
    sender: { id: string; name: string; avatar?: string | null },
    receiverId: string,
    chatId: string,
    messageContent: string,
    chatType: string
  ) {
    const truncatedContent = messageContent.length > 50 
      ? messageContent.substring(0, 50) + '...' 
      : messageContent

    return this.createNotification({
      type: 'MESSAGE',
      title: `رسالة جديدة من ${sender.name}`,
      message: truncatedContent,
      receiverId,
      senderId: sender.id,
      data: {
        chatId,
        chatType,
        messageContent: truncatedContent,
        senderName: sender.name,
        senderAvatar: sender.avatar
      }
    })
  }
}
