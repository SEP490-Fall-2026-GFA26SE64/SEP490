import * as React from 'react'

export type Language = 'en' | 'vi'

export interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: (keyOrPhrase: string, fallback?: string) => string
}

export const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined)

export function useTranslation() {
  const context = React.useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}

export const useI18n = useTranslation

export { LanguageProvider, T, Trans } from './LanguageProvider'
