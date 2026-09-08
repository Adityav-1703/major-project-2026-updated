import { useTranslation } from 'react-i18next';

export function SiteFooter() {
  const { t } = useTranslation();
  
  return (
    <footer className="border-t border-black/10 bg-white/50 px-4 py-6 text-center text-sm text-slate-600 backdrop-blur-md dark:border-white/10 dark:bg-black/20 dark:text-white/60">
      <p>{t('app.name')} - {t('app.tagline')}</p>
      <p className="mt-1 text-xs">{t('app.footer')}</p>
    </footer>
  )
}