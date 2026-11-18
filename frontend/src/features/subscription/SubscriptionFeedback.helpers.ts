import { useTranslation } from "../../shared/i18n/LanguageContext";

export function useCopy() {
  const { language } = useTranslation()
  return (en: string, vi: string) => language === 'vi' ? vi : en
}

