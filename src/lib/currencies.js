/**
 * Multi-Currency Configuration & Accounting Helpers
 * Supports: PKR, AFN, USD, EUR, GBP, SAR, AED, INR, TRY
 */

export const supportedCurrencies = [
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', decimals: 0, flag: '🇵🇰', defaultRateToPKR: 1 },
  { code: 'AFN', symbol: '؋', name: 'Afghan Afghani', decimals: 0, flag: '🇦🇫', defaultRateToPKR: 4.1 },
  { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, flag: '🇺🇸', defaultRateToPKR: 278.5 },
  { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, flag: '🇪🇺', defaultRateToPKR: 302.2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, flag: '🇬🇧', defaultRateToPKR: 362.4 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', decimals: 2, flag: '🇸🇦', defaultRateToPKR: 74.2 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimals: 2, flag: '🇦🇪', defaultRateToPKR: 75.8 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, flag: '🇮🇳', defaultRateToPKR: 3.32 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', decimals: 2, flag: '🇹🇷', defaultRateToPKR: 8.1 },
];

/**
 * Format monetary amount with currency symbol and appropriate decimal precision
 * @param {number|string} amount
 * @param {string} currencyCode
 * @param {string} [locale='en']
 * @returns {string}
 */
export function formatCurrency(amount, currencyCode = 'PKR', locale = 'en') {
  const numericAmount = Number(amount) || 0;
  const curr = supportedCurrencies.find((c) => c.code === currencyCode) || supportedCurrencies[0];
  
  const absAmount = Math.abs(numericAmount);
  const formattedNumber = absAmount.toLocaleString(locale === 'ur' || locale === 'ps' ? 'ur-PK' : 'en-US', {
    minimumFractionDigits: curr.decimals,
    maximumFractionDigits: curr.decimals,
  });

  return `${curr.symbol} ${formattedNumber}`;
}

/**
 * Parse an input amount safely
 * @param {string|number} value
 * @returns {number}
 */
export function parseAmount(value) {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const sanitized = String(value).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extract initials from business name (e.g. "Cloth Shop Commercial" -> "CSC", "cloth shop" -> "CS")
 * If not available or single word, returns two uppercase characters
 * @param {string} name
 * @returns {string}
 */
export function getBusinessInitials(name) {
  if (!name || typeof name !== 'string') return 'DK';
  const clean = name.trim();
  if (!clean) return 'DK';
  const words = clean.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return 'DK';
  if (words.length === 1) return words[0].substring(0, Math.min(2, words[0].length)).toUpperCase();
  return words.slice(0, 3).map((w) => w[0].toUpperCase()).join('');
}
