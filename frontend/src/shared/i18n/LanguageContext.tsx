import * as React from 'react'
import { en } from './translations/en'
import { vi } from './translations/vi'

export type Language = 'en' | 'vi'

const translations: Record<Language, typeof en> = {
  en,
  vi,
}

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: (key: string, fallback?: string) => string
}

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined)

const STORAGE_KEY = 'app_language'

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

  const t = React.useCallback(
    (key: string, fallback?: string): string => {
      const keys = key.split('.')
      let current: any = translations[language]

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k]
        } else {
          // Fallback to English if missing in current language
          let engCurrent: any = translations.en
          for (const ek of keys) {
            if (engCurrent && typeof engCurrent === 'object' && ek in engCurrent) {
              engCurrent = engCurrent[ek]
            } else {
              return fallback || key
            }
          }
          return typeof engCurrent === 'string' ? engCurrent : fallback || key
        }
      }

      return typeof current === 'string' ? current : fallback || key
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
