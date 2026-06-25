'use client'

import { useEffect } from 'react'

/**
 * Bloquea el pinch-zoom en iOS (Safari/WebKit, que también es el motor de Chrome
 * en iPhone). iOS ignora `user-scalable=no` del viewport, así que aquí se cancelan
 * los gestos a nivel JS:
 *  - Eventos `gesture*` de Safari (pinch de dos dedos).
 *  - `touchmove` con más de un dedo (el arrastre de dos dedos que paneaba la vista
 *    y dejaba huecos negros).
 *
 * (El zoom por doble-tap lo cubre `touch-action: manipulation` en globals.css.)
 *
 * La app usa su propio scroll interno por contenedor (scroll de un dedo), que NO
 * se ve afectado porque solo se cancela el gesto cuando hay 2+ toques.
 */
export function NoPinchZoom() {
  useEffect(() => {
    const preventGesture = (e: Event) => e.preventDefault()

    const preventMultiTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault()
    }

    document.addEventListener('gesturestart', preventGesture)
    document.addEventListener('gesturechange', preventGesture)
    document.addEventListener('gestureend', preventGesture)
    document.addEventListener('touchmove', preventMultiTouchMove, { passive: false })

    return () => {
      document.removeEventListener('gesturestart', preventGesture)
      document.removeEventListener('gesturechange', preventGesture)
      document.removeEventListener('gestureend', preventGesture)
      document.removeEventListener('touchmove', preventMultiTouchMove)
    }
  }, [])

  return null
}
