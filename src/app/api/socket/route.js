// pages/api/socket.js
import { Server } from 'socket.io';

// هذا الكائن سيخزن السيرفر ليتم إعادة استخدامه
let io;

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('جاري إنشاء سيرفر Socket.io جديد');
    
    // إنشاء مثيل Socket.io
    io = new Server(res.socket.server, {
      path: '/api/socket',
      cors: {
        origin: "*", // في الإنتاج، ضع رابط تطبيقك
        methods: ["GET", "POST"]
      }
    });

    // تخزين السيرفر للاستخدام المستقبلي
    res.socket.server.io = io;

    // التعامل مع الاتصال
    io.on('connection', (socket) => {
      console.log('👤 مستخدم متصل:', socket.id);

      // استقبال رسالة من العميل
      socket.on('send-message', (data) => {
        console.log('📩 رسالة مستلمة:', data);
        
        // إرسال الرسالة لجميع العملاء المتصلين
        io.emit('receive-message', {
          id: Date.now(),
          text: data.text,
          user: data.user,
          timestamp: new Date().toISOString()
        });
      });

      // استقبال حدث انضمام إلى غرفة
      socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`🚪 المستخدم ${socket.id} انضم للغرفة ${roomId}`);
      });

      // التعامل مع قطع الاتصال
      socket.on('disconnect', () => {
        console.log('❌ مستخدم انقطع:', socket.id);
      });
    });
  } else {
    console.log('Socket.io يعمل بالفعل');
  }
  
  res.end();
}
