import React from 'react';
import { ArrowLeft, Globe, LogOut } from 'lucide-react';
import { supportedLocales, getTranslations } from '@/lib/i18n.js';

import CompanyLogo from '@/components/layout/CompanyLogo.jsx';

export default function TopHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightActions,
  badge,
  currentLang = 'en',
  onLanguageChange,
  currentUser,
  business,
  onSignOut,
  headerColorClass = 'bg-slate-900',
}) {
  const t = getTranslations(currentLang);
  const isRtl = currentLang === 'ur' || currentLang === 'ps';

  return (
    <header className={`sticky top-0 z-30 ${headerColorClass} text-white shadow-sm border-b border-slate-800 transition-colors duration-200`}>
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Left: Back button or company logo mark */}
        <div className="flex items-center gap-2.5 min-w-0">
          {showBack ? (
            <button
              onClick={onBack}
              aria-label="Back"
              className="p-1.5 -ml-1 rounded-full hover:bg-slate-800 active:scale-95 transition-transform touch-target flex items-center justify-center cursor-pointer text-slate-300 hover:text-white"
            >
              <ArrowLeft className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <CompanyLogo business={business} size="sm" />
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold tracking-tight truncate leading-tight text-white">
                {title}
              </h1>
              {badge && (
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full shrink-0">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-400 truncate mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Language picker and sign-out */}
        <div className="flex items-center gap-1.5 shrink-0">
          {rightActions}

          {/* Language Selector Dropdown */}
          <div className="relative group">
            <button
              title="Change Language"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-slate-200 transition-colors cursor-pointer touch-target"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span className="uppercase text-[11px] font-bold tracking-wider">{currentLang}</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex group-focus-within:flex flex-col bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 py-1.5 min-w-[140px] z-50 animate-in fade-in zoom-in-95">
              {supportedLocales.map((loc) => (
                <button
                  key={loc.code}
                  onClick={() => onLanguageChange(loc.code)}
                  className={`px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-800 transition-colors cursor-pointer ${
                    currentLang === loc.code ? 'font-bold text-blue-400 bg-slate-800/60' : 'text-slate-300'
                  }`}
                >
                  <span>{loc.nativeName}</span>
                  <span className="text-[10px] uppercase text-slate-500">{loc.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* User Sign Out */}
          {currentUser && (
            <button
              onClick={onSignOut}
              title={t.signOut}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer touch-target flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
