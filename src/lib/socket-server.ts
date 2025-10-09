import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

export class SocketService {
  private static instance: SocketService;
  public io: SocketIOServer | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public initializeServer(httpServer: NetServer) {
    if (this.io) {
      return this.io;
    }

    console.log('🚀 Initializing Socket.IO server...');
    
    this.io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
    return this.io;
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log('👤 User connected:', socket.id);

      // حدث انضمام المستخدم
      socket.on('user_join', async (userData: { userId: string; username: string }) => {
        const { userId, username } = userData;
        
        console.log(`🟢 User ${username} (${userId}) joined`);
        
        // إعلام الآخرين
        socket.broadcast.emit('user_online', {
          userId,
          username,
          status: 'online',
          timestamp: new Date()
        });
      });

      // حدث إرسال رسالة
      socket.on('send_message', (messageData: any) => {
        const { roomId, message, userId, username } = messageData;
        
        // بث الرسالة للغرفة
        this.io?.to(roomId).emit('new_message', {
          roomId,
          message,
          userId,
          username,
          timestamp: new Date(),
          messageId: Math.random().toString(36).substr(2, 9)
        });
      });

      // حدث انضمام لغرفة
      socket.on('join_room', (roomId: string) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room: ${roomId}`);
      });

      // حدث مغادرة غرفة
      socket.on('leave_room', (roomId: string) => {
        socket.leave(roomId);
        console.log(`User ${socket.id} left room: ${roomId}`);
      });

      // حدث انقطاع الاتصال
      socket.on('disconnect', () => {
        console.log('🔴 User disconnected:', socket.id);
      });
    });
  }

  public getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const socketService = SocketService.getInstance();
