import React, { useState } from 'react';
import {
  Globe,
  Coins,
  Store,
  ShieldAlert,
  Download,
  CheckCircle2,
  Upload,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { supportedLocales, getTranslations } from '@/lib/i18n.js';
import { supportedCurrencies } from '@/lib/currencies.js';
import { updateBusinessProfileRemote } from '@/lib/db.js';
import CompanyLogo from '@/components/layout/CompanyLogo.jsx';

export default function SettingsView({
  state,
  currentLang = 'en',
  onLanguageChange,
  onUpdateState,
}) {
  const t = getTranslations(currentLang);
  const [businessName, setBusinessName] = useState(state.currentBusiness?.name || '');
  const [phone, setPhone] = useState(state.currentBusiness?.phone || '');
  const [address, setAddress] = useState(state.currentBusiness?.address || '');
  const [logoUrl, setLogoUrl] = useState(state.currentBusiness?.logoUrl || null);
  const [selectedCurrency, setSelectedCurrency] = useState(
    state.currentBusiness?.currency || 'PKR'
  );
  const [savedNotice, setSavedNotice] = useState(false);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      alert('Please select an image smaller than 2.5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const result = await updateBusinessProfileRemote({ name: businessName, phone, address, currency: selectedCurrency, logoUrl });
    if (!result.success) { alert(result.error || 'Unable to save business profile.'); return; }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
    onUpdateState();
  };

  const handleExportAuditLogs = () => {
    const sanitize = (text) => {
      const str = String(text || '').replace(/"/g, '""');
      if (/^[=+\-@]/.test(str)) {
        return `"'${str}"`;
      }
      return `"${str}"`;
    };

    const headers = ['Timestamp', 'Actor', 'Email', 'Action', 'Entity', 'Details'];
    const rows = state.auditLogs.map((log) => [
      sanitize(log.timestamp),
      sanitize(log.actorName),
      sanitize(log.actorEmail),
      sanitize(log.action),
      sanitize(log.entityType),
      sanitize(log.details),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `digikhata_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pb-24 max-w-md md:max-w-xl mx-auto w-full p-3 space-y-4">
      {/* Title */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">{t.settings}</h2>
          <p className="text-xs text-slate-500">
            Business configuration, currency, language, and security
          </p>
        </div>
      </div>

      {savedNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs p-3 rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Language Switcher Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
          <Globe className="w-4 h-4 text-blue-600" />
          <span>Language / زبان / ژبه</span>
        </div>
        <p className="text-xs text-slate-500">
          Select preferred language with automatic right-to-left (RTL) mirroring:
        </p>
        <div className="grid grid-cols-3 gap-2">
          {supportedLocales.map((loc) => (
            <button
              key={loc.code}
              onClick={() => onLanguageChange(loc.code)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                currentLang === loc.code
                  ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div>{loc.nativeName}</div>
              <div className="text-[10px] text-slate-400 font-normal uppercase">{loc.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Business Profile Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
          <Store className="w-4 h-4 text-blue-600" />
          <span>Business Profile</span>
        </div>

        {/* Company Logo section */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
          <label className="block text-xs font-semibold text-slate-700">
            {t.companyLogo}
          </label>
          <div className="flex items-center gap-3.5">
            <CompanyLogo
              business={{ name: businessName || 'My Shop', logoUrl }}
              size="lg"
            />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{logoUrl ? t.changeLogo : t.uploadLogo}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.removeLogo}</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {t.companyLogoHint}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            {t.businessName} *
          </label>
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Store Contact Phone
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Shop Address / Market
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Primary Currency
          </label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
          >
            {supportedCurrencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} - {c.name} ({c.symbol})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          {t.save} Settings
        </button>
      </form>

      {/* Security & Audit Logs Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>Audit & Compliance Logs</span>
          </div>
          <button
            onClick={handleExportAuditLogs}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          All financial posts, customer creations, and team member changes are immutably logged with actor tracking. Passwords and keys are never logged.
        </p>

        <div className="max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px] bg-slate-900 text-slate-200 p-3 rounded-2xl">
          {state.auditLogs.map((log) => (
            <div key={log.id} className="border-b border-slate-800/80 pb-1">
              <span className="text-blue-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
              <span className="text-emerald-400">{log.action}</span> - {log.details}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
