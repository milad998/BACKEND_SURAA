// src/components/SocketInitializer.tsx
'use client'

import { useEffect } from 'react'

export default function SocketInitializer() {
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        await fetch('/api/socket')
        console.log('Socket initialization requested')
      } catch (error) {
        console.error('Failed to initialize socket:', error)
      }
    }

    initializeSocket()
  }, [])

  return null
}