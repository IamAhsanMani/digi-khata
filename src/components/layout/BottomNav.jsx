import React from 'react';
import { BookOpen, BarChart3, Receipt, Users, Settings } from 'lucide-react';
import { getTranslations } from '@/lib/i18n.js';

export default function BottomNav({ activeTab, onTabChange, currentLang = 'en' }) {
  const t = getTranslations(currentLang);

  const tabs = [
    { id: 'party', label: t.party, icon: BookOpen },
    { id: 'dashboard', label: t.dashboard, icon: BarChart3 },
    { id: 'expenses', label: t.expenses, icon: Receipt },
    { id: 'team', label: t.team, icon: Users },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-sm no-print">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center h-full w-full touch-target transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'text-slate-900 dark:text-white font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="text-[10px] md:text-[11px] tracking-tight mt-0.5 truncate max-w-[62px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
