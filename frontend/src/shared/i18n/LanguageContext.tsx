import * as React from 'react'
import { en } from './translations/en'
import { vi } from './translations/vi'
import { viPhrases } from './translations/phrases'

export type Language = 'en' | 'vi'

const translations: Record<Language, typeof en> = {
  en,
  vi,
}

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: (keyOrPhrase: string, fallback?: string) => string
}

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined)

const STORAGE_KEY = 'app_language'

// WeakMap to store original English text for text nodes so they can be restored cleanly
const originalTextMap = new WeakMap<Node, string>()

function walkAndTranslate(node: Node, lang: Language) {
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.nodeValue || ''
    const trimmed = raw.trim()
    if (!trimmed) return

    if (lang === 'vi') {
      const translation = viPhrases[trimmed]
      if (translation && raw !== translation) {
        if (!originalTextMap.has(node)) {
          originalTextMap.set(node, raw)
        }
        const leading = raw.match(/^\s*/)?.[0] || ''
        const trailing = raw.match(/\s*$/)?.[0] || ''
        node.nodeValue = leading + translation + trailing
      }
    } else {
      if (originalTextMap.has(node)) {
        node.nodeValue = originalTextMap.get(node)!
        originalTextMap.delete(node)
      }
    }
    return
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement
    const tag = el.tagName
    if (['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(tag)) {
      return
    }

    // Translate placeholder attribute if present
    const placeholder = el.getAttribute('placeholder')
    if (placeholder) {
      const trimmedPh = placeholder.trim()
      if (lang === 'vi') {
        const transPh = viPhrases[trimmedPh]
        if (transPh) {
          if (!el.hasAttribute('data-orig-placeholder')) {
            el.setAttribute('data-orig-placeholder', placeholder)
          }
          el.setAttribute('placeholder', transPh)
        }
      } else {
        if (el.hasAttribute('data-orig-placeholder')) {
          el.setAttribute('placeholder', el.getAttribute('data-orig-placeholder')!)
          el.removeAttribute('data-orig-placeholder')
        }
      }
    }

    // Translate title attribute if present
    const titleAttr = el.getAttribute('title')
    if (titleAttr) {
      const trimmedTitle = titleAttr.trim()
      if (lang === 'vi') {
        const transTitle = viPhrases[trimmedTitle]
        if (transTitle) {
          if (!el.hasAttribute('data-orig-title')) {
            el.setAttribute('data-orig-title', titleAttr)
          }
          el.setAttribute('title', transTitle)
        }
      } else {
        if (el.hasAttribute('data-orig-title')) {
          el.setAttribute('title', el.getAttribute('data-orig-title')!)
          el.removeAttribute('data-orig-title')
        }
      }
    }

    // Recursively walk children
    const children = node.childNodes
    for (let i = 0; i < children.length; i++) {
      walkAndTranslate(children[i], lang)
    }
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'vi' || saved === 'en') return saved
    } catch {
      // ignore
    }
    return 'en'
  })

  const setLanguage = React.useCallback((newLang: Language) => {
    setLanguageState(newLang)
    try {
      localStorage.setItem(STORAGE_KEY, newLang)
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('app_language_changed', { detail: newLang }))
  }, [])

  const toggleLanguage = React.useCallback(() => {
    setLanguage(language === 'en' ? 'vi' : 'en')
  }, [language, setLanguage])

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === 'vi' || event.newValue === 'en')) {
        setLanguageState(event.newValue)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Auto-translate DOM elements when language is Vietnamese, and restore when English
  React.useEffect(() => {
    if (typeof document === 'undefined') return

    // Translate currently mounted DOM tree
    walkAndTranslate(document.body, language)

    if (language === 'vi') {
      let isTranslating = false
      const observer = new MutationObserver((mutations) => {
        if (isTranslating) return
        isTranslating = true
        try {
          for (const mutation of mutations) {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((n) => walkAndTranslate(n, 'vi'))
            } else if (mutation.type === 'characterData') {
              walkAndTranslate(mutation.target, 'vi')
            }
          }
        } finally {
          isTranslating = false
        }
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      })

      return () => {
        observer.disconnect()
        walkAndTranslate(document.body, 'en')
      }
    } else {
      walkAndTranslate(document.body, 'en')
    }
  }, [language])

  const t = React.useCallback(
    (keyOrPhrase: string, fallback?: string): string => {
      if (!keyOrPhrase) return ''

      // If Vietnamese, first check the direct phrase dictionary
      if (language === 'vi' && viPhrases[keyOrPhrase]) {
        return viPhrases[keyOrPhrase]
      }

      // Check hierarchical key path if it has dots (e.g. 'nav.overview')
      if (keyOrPhrase.includes('.')) {
        const keys = keyOrPhrase.split('.')
        let current: unknown = translations[language]

        let found = true
        for (const k of keys) {
          if (current && typeof current === 'object' && k in (current as Record<string, unknown>)) {
            current = (current as Record<string, unknown>)[k]
          } else {
            found = false
            break
          }
        }
        if (found && typeof current === 'string') return current

        // Fallback to English key
        let engCurrent: unknown = translations.en
        let engFound = true
        for (const ek of keys) {
          if (engCurrent && typeof engCurrent === 'object' && ek in (engCurrent as Record<string, unknown>)) {
            engCurrent = (engCurrent as Record<string, unknown>)[ek]
          } else {
            engFound = false
            break
          }
        }
        if (engFound && typeof engCurrent === 'string') return engCurrent
      }

      // If in Vietnamese mode and key without dot has a trimmed match
      if (language === 'vi') {
        const trimmed = keyOrPhrase.trim()
        if (viPhrases[trimmed]) {
          return viPhrases[trimmed]
        }
      }

      return fallback || keyOrPhrase
    },
    [language],
  )

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = React.useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}

export const useI18n = useTranslation

export function T({ children, fallback }: { children: React.ReactNode; fallback?: string }) {
  const { t } = useTranslation()
  if (typeof children === 'string') {
    return <>{t(children, fallback)}</>
  }
  return <>{children}</>
}

export const Trans = T
