// scripts/test-connection.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    await prisma.$connect()
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح!')
    
    // اختبار استعلام بسيط
    const result = await prisma.$queryRaw`SELECT version()`
    console.log('إصدار PostgreSQL:', result)
    
  } catch (error) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
