// src/lib/utils.ts
import crypto from 'crypto'

// تأكد أن مفتاح التشفير طوله 32 حرفاً (32 bytes)
const algorithm = 'aes-256-gcm'

// الحصول على مفتاح التشفير من environment variable
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not defined in environment variables')
  }
  
  // إذا كان المفتاح أقصر من 32 حرفاً، نقوم بتكبيره
  if (key.length < 32) {
    return key.padEnd(32, '0').slice(0, 32)
  }
  
  // إذا كان أطول من 32 حرفاً، نقوم بقصه
  if (key.length > 32) {
    return key.slice(0, 32)
  }
  
  return key
}

export function encrypt(text: string): { iv: string; content: string; tag: string } {
  try {
    const secretKey = getEncryptionKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'utf8'), iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag()
    
    return {
      iv: iv.toString('hex'),
      content: encrypted,
      tag: tag.toString('hex')
    }
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt message')
  }
}

export function decrypt(encryptedData: { iv: string; content: string; tag: string }): string {
  try {
    const secretKey = getEncryptionKey()
    const decipher = crypto.createDecipheriv(
      algorithm, 
      Buffer.from(secretKey, 'utf8'), 
      Buffer.from(encryptedData.iv, 'hex')
    )
    
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))
    
    let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt message')
  }
}

// دالة بديلة أبسط للتشفير (إذا استمرت المشكلة)
export function simpleEncrypt(text: string): string {
  const buffer = Buffer.from(text, 'utf8')
  return buffer.toString('base64')
}

export function simpleDecrypt(encryptedText: string): string {
  const buffer = Buffer.from(encryptedText, 'base64')
  return buffer.toString('utf8')
}