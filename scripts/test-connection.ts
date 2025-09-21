import { prisma } from "@/lib/prisma";
import { config } from 'dotenv'
config()

// scripts/test-connection.js
async function testConnection() {
  try {
    // استيراد prisma بطريقة CommonJS
    const { prisma } = require('../src/lib/prisma');
    
    await prisma.$connect();
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح!');
    
    // اختبار استعلام بسيط
    const users = await prisma.user.findMany();
    console.log(`📊 عدد المستخدمين: ${users.length}`);
    
  } catch (error) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();