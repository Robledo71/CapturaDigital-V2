'use client'

import { useCallback, useState } from 'react'

/**
 * Single-open accordion state helper. Tapping an already-expanded id closes it;
 * tapping any other id expands that one and collapses the previous.
 */
export function useExpandableList<T extends string | number>() {
  const [expandedId, setExpandedId] = useState<T | null>(null)

  const toggle = useCallback((id: T) => {
    setExpandedId((current) => (current === id ? null : id))
  }, [])

  return { expandedId, toggle }
}
