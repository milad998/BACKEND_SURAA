// src/lib/utils.ts
import crypto from 'crypto'
import { config } from 'dotenv'
config()

const algorithm = 'aes-256-gcm'
const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-32-chars-long!'

export function encrypt(text: string) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  
  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex'),
    tag: tag.toString('hex')
  }
}

export function decrypt(encryptedData: { iv: string; content: string; tag: string }) {
  const decipher = crypto.createDecipheriv(
    algorithm, 
    secretKey, 
    Buffer.from(encryptedData.iv, 'hex')
  )
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))
  
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData.content, 'hex')),
    decipher.final()
  ])
  
  return decrypted.toString('utf8')
}
