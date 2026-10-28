import React from 'react';
import { getBusinessInitials } from '@/lib/currencies.js';

/**
 * CompanyLogo component
 * If logoUrl is provided, renders the image.
 * If not, displays an executive letter avatar using company name words' first letters.
 */
export default function CompanyLogo({
  business,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  showName = false,
  textColor = 'text-slate-900',
  subText = null,
}) {
  const name = business?.name || 'DigiKhata';
  const logoUrl = business?.logoUrl;
  const initials = getBusinessInitials(name);

  const sizeClasses = {
    xs: 'w-7 h-7 text-[11px] rounded-lg',
    sm: 'w-8 h-8 text-xs rounded-xl',
    md: 'w-10 h-10 text-sm rounded-2xl',
    lg: 'w-12 h-12 text-base rounded-2xl',
    xl: 'w-16 h-16 text-xl rounded-3xl',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className={`${currentSizeClass} object-cover border border-slate-200/90 shadow-2xs shrink-0 bg-white`}
        />
      ) : (
        <div
          className={`${currentSizeClass} bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white font-black flex items-center justify-center uppercase shadow-2xs shrink-0 tracking-wider border border-slate-700/60 select-none`}
        >
          {initials}
        </div>
      )}

      {showName && (
        <div className="min-w-0">
          <div className={`font-black tracking-tight leading-tight truncate ${textColor}`}>
            {name}
          </div>
          {subText && (
            <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {subText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
