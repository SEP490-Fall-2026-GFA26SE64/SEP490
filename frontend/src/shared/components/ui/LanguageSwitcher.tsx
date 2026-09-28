import { Globe } from 'lucide-react'
import { useTranslation } from '../../i18n/LanguageContext'

export interface LanguageSwitcherProps {
  className?: string
  showLabel?: boolean
}

export function LanguageSwitcher({ className = '', showLabel = false }: LanguageSwitcherProps) {
  const { language, setLanguage } = useTranslation()

  return (
    <div
      className={`inline-flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-2xs ${className}`}
      role="group"
      aria-label="Language selection"
    >
      <div className="flex items-center gap-1 px-1.5 text-muted-foreground select-none">
        <Globe size={13} className="text-primary shrink-0" />
        {showLabel && <span className="text-[11px] font-bold uppercase tracking-wider hidden md:inline">Lang:</span>}
      </div>

      <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg">
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            language === 'en'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Switch to English"
          aria-pressed={language === 'en'}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage('vi')}
          className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            language === 'vi'
              ? 'bg-card text-primary shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Chuyển sang Tiếng Việt"
          aria-pressed={language === 'vi'}
        >
          VI
        </button>
      </div>
    </div>
  )
}
