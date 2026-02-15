import { useEffect, useRef } from 'react'

interface ShortcutHandler {
  description: string
  action: () => void
}

export interface KeyboardShortcutMap {
  [key: string]: ShortcutHandler
}

/**
 * Hook that registers global keyboard shortcuts.
 * Supports single keys (e.g. 'a'), modifier combos (e.g. 'ctrl+enter'),
 * and two-key sequences (e.g. 'g i' for "press g then i").
 *
 * Shortcuts are suppressed when the user is typing in an input/textarea.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcutMap) {
  const pendingPrefix = useRef<string | null>(null)
  const prefixTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable

      if (isInput) {
        // Allow Escape even inside inputs (to blur / close dialogs)
        if (e.key === 'Escape') {
          const handler = shortcuts['escape']
          if (handler) {
            e.preventDefault()
            handler.action()
          }
        }
        return
      }

      const key = e.key.toLowerCase()

      // Check for modifier combos first (ctrl+key / cmd+key)
      if (e.ctrlKey || e.metaKey) {
        const combo = `ctrl+${key}`
        const handler = shortcuts[combo]
        if (handler) {
          e.preventDefault()
          handler.action()
        }
        return
      }

      // Check for pending two-key sequence (e.g. g then i -> 'g i')
      if (pendingPrefix.current) {
        const seq = `${pendingPrefix.current} ${key}`
        pendingPrefix.current = null
        if (prefixTimer.current) {
          clearTimeout(prefixTimer.current)
          prefixTimer.current = null
        }
        const handler = shortcuts[seq]
        if (handler) {
          e.preventDefault()
          handler.action()
          return
        }
        // Sequence didn't match -- fall through to single-key check
      }

      // Check if this key starts a two-key sequence
      const hasSequence = Object.keys(shortcuts).some(
        (k) => k.startsWith(`${key} `) && k.includes(' ')
      )
      if (hasSequence) {
        pendingPrefix.current = key
        // Allow 500ms to press the second key
        prefixTimer.current = setTimeout(() => {
          pendingPrefix.current = null
          prefixTimer.current = null
        }, 500)

        // Also check if this key itself is a shortcut (e.g. 'g' alone)
        // We don't fire it here because we need to wait for potential sequence.
        // If user doesn't press a second key, the timeout will clear it.
        return
      }

      // Single key shortcut
      const handler = shortcuts[key] || shortcuts[e.key]
      if (handler) {
        e.preventDefault()
        handler.action()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (prefixTimer.current) {
        clearTimeout(prefixTimer.current)
      }
    }
  }, [shortcuts])
}
