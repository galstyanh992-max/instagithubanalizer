'use client'

import { useEffect } from 'react'
import { useUiStore } from '@/lib/store'

export function ApplySettingsClass() {
  const reduceMotion = useUiStore((s) => s.reduceMotion)
  const neonIntensity = useUiStore((s) => s.neonIntensity)

  useEffect(() => {
    const root = document.documentElement
    if (reduceMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }
  }, [reduceMotion])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--holo-intensity', (neonIntensity / 100).toString())
  }, [neonIntensity])

  return null
}
