import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  MessageSquare,
  Search,
  Paperclip,
  Lock,
  Phone,
  MoreVertical,
  CheckCircle2,
  Trash2,
  Share2,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { getTranslations } from '@/lib/i18n.js';
import { formatCurrency, supportedCurrencies } from '@/lib/currencies.js';

export default function CustomerLedger({
  party,
  partyType = 'customer',
  state,
  currentLang = 'en',
  onBack,
  onOpenAddTransaction,
  onOpenReportModal,
  onArchiveParty,
}) {
  const t = getTranslations(currentLang);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDueDateModal, setShowDueDateModal] = useState(false);
  const [dueDate, setDueDate] = useState('2026-11-05');
  const [toastMessage, setToastMessage] = useState('');
  const [activeCurrencyFilter, setActiveCurrencyFilter] = useState('all'); // 'all' or currencyCode

  const defaultCurrency = state.currentBusiness?.currency || 'PKR';

  // Retrieve ALL active currency balances for this party
  const partyBalances = useMemo(() => {
    if (partyType === 'customer') {
      return state.customerBalances.filter((b) => b.customerId === party.id);
    } else {
      return state.supplierBalances.filter((b) => b.supplierId === party.id);
    }
  }, [state.customerBalances, state.supplierBalances, party.id, partyType]);

  // Primary balance for default currency
  const primaryBalance = useMemo(() => {
    const rec = partyBalances.find((b) => b.currencyCode === defaultCurrency);
    return rec ? rec.balance : 0;
  }, [partyBalances, defaultCurrency]);

  // Filter ledger entries for this party and optional currency filter
  const entries = useMemo(() => {
    return state.ledgerEntries.filter((e) => {
      const matchesParty =
        (partyType === 'customer' && e.partyId === party.id) ||
        (partyType === 'supplier' && e.partyId === party.id);
      const matchesSearch =
        !searchQuery ||
        (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.billNo && e.billNo.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCurrency =
        activeCurrencyFilter === 'all' || e.currencyCode === activeCurrencyFilter;
      return matchesParty && matchesSearch && matchesCurrency;
    });
  }, [state.ledgerEntries, party.id, partyType, searchQuery, activeCurrencyFilter]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleShareWhatsAppReminder = () => {
    const msg = `Dear ${party.name}, gentle reminder from ${state.currentBusiness.name}: Your outstanding balance is ${formatCurrency(primaryBalance, defaultCurrency, currentLang)}. Please arrange settlement at your convenience. Thank you!`;
    const encoded = encodeURIComponent(msg);
    if (party.phone) {
      window.open(`https://wa.me/${party.phone.replace(/[^0-9]/g, '')}?text=${encoded}`, '_blank');
    } else {
      navigator.clipboard?.writeText(msg);
      showToast('Reminder copied to clipboard! (No phone number saved)');
    }
  };

  const handleShareSMS = () => {
    const msg = `Khata Reminder from ${state.currentBusiness.name}: Balance is ${formatCurrency(primaryBalance, defaultCurrency, currentLang)}.`;
    navigator.clipboard?.writeText(msg);
    showToast('SMS text copied to clipboard!');
  };

  const formatEntryDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const isDebt = primaryBalance > 0;

  return (
    <div className="pb-28 max-w-md md:max-w-2xl mx-auto w-full min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header - Modern Slate-900 */}
      <div className="bg-slate-900 text-white px-4 py-3.5 shadow-sm border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <span className="text-xl font-bold">←</span>
            </button>
            <div>
              <h2 className="text-base md:text-lg font-bold truncate leading-tight">{party.name}</h2>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                {t.clickSettings}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {party.phone && (
              <a
                href={`tel:${party.phone}`}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                title="Call Customer"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="p-3 space-y-3 flex-1">
        {/* Main Balance Card */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/90 p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t.closingBalance} ({defaultCurrency})
              </span>
              <div
                className={`text-2xl md:text-3xl font-black tabular-nums mt-0.5 ${
                  isDebt ? 'text-rose-600' : primaryBalance === 0 ? 'text-slate-800' : 'text-emerald-600'
                }`}
              >
                {formatCurrency(primaryBalance, defaultCurrency, currentLang)}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                {isDebt ? t.youWillGet : primaryBalance === 0 ? t.filterCleared : t.youWillGive}
              </div>
            </div>
          </div>

          {/* Multi-Currency Balances Bar if party has transactions in multiple currencies */}
          {partyBalances.length > 1 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Balances Across Currencies:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {partyBalances.map((bal) => (
                  <div
                    key={bal.id}
                    className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-500">{bal.currencyCode}:</span>
                    <span className={bal.balance > 0 ? 'text-rose-600' : bal.balance < 0 ? 'text-emerald-600' : 'text-slate-600'}>
                      {formatCurrency(bal.balance, bal.currencyCode, currentLang)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4 Quick Action Buttons */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100">
            {/* 1: Report */}
            <button
              onClick={() => onOpenReportModal({ party, partyType })}
              className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200/80 hover:bg-slate-50 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-700">{t.report}</span>
            </button>

            {/* 2: Set Date */}
            <button
              onClick={() => setShowDueDateModal(true)}
              className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200/80 hover:bg-slate-50 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-700">{t.setDate}</span>
            </button>

            {/* 3: Reminder */}
            <button
              onClick={handleShareWhatsAppReminder}
              className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200/80 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                <Share2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-700">{t.reminder}</span>
            </button>

            {/* 4: SMS */}
            <button
              onClick={handleShareSMS}
              className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-200/80 hover:bg-blue-50/50 hover:border-blue-200 transition-all cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-700">{t.sms}</span>
            </button>
          </div>
        </div>

        {/* Due Date Indicator */}
        {dueDate && (
          <div className="bg-slate-100 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-800">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-slate-500" />
              Promise / Repayment Due: <strong>{dueDate}</strong>
            </span>
            <button
              onClick={() => setShowDueDateModal(true)}
              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Change
            </button>
          </div>
        )}

        {/* Search within ledger entries */}
        <div className="flex items-center bg-white border border-slate-200/90 rounded-2xl px-3 py-2.5 shadow-2xs focus-within:ring-2 focus-within:ring-slate-900/10">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.search}
            className="w-full text-xs md:text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Column Header */}
        <div className="grid grid-cols-12 text-xs font-bold text-slate-500 px-2 py-1.5 border-b border-slate-200">
          <div className="col-span-6">{t.entries}</div>
          <div className="col-span-3 text-right text-rose-600">{t.youGave}</div>
          <div className="col-span-3 text-right text-emerald-600">{t.youGot}</div>
        </div>

        {/* Entries List */}
        {entries.length === 0 ? (
          <div className="space-y-4 my-8 text-center">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-center gap-2 text-xs text-slate-600 font-medium">
              <Lock className="w-4 h-4 text-slate-500" />
              <span>{t.onlyYouCanSee}</span>
            </div>
            <div className="text-slate-400 text-sm font-medium py-12">
              {t.addFirstEntry}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const isGave = entry.type === 'you_gave';
              return (
                <div
                  key={entry.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs transition-all"
                >
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6 min-w-0">
                      <div className="text-[11px] text-slate-400 font-mono">
                        {formatEntryDate(entry.transactionDate)}
                      </div>
                      <div className="text-sm font-bold text-slate-900 truncate mt-0.5 flex items-center gap-1.5">
                        <span>{entry.description || (isGave ? 'Credit Sale' : 'Payment Received')}</span>
                        {entry.hasAttachment && (
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {entry.type === 'you_got' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                            <span>{t.cashIn}</span>
                          </span>
                        )}
                        {entry.type === 'you_gave' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                            <span>{t.cashOut}</span>
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 font-mono">
                          {t.balance} {formatCurrency(entry.runningBalance, entry.currencyCode, currentLang)}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-3 text-right">
                      {isGave ? (
                        <div>
                          <div className="text-sm md:text-base font-extrabold text-rose-600 tabular-nums flex items-center justify-end gap-0.5">
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>{entry.amount.toLocaleString()}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 uppercase font-mono">{entry.currencyCode}</div>
                        </div>
                      ) : null}
                    </div>

                    <div className="col-span-3 text-right">
                      {!isGave ? (
                        <div>
                          <div className="text-sm md:text-base font-extrabold text-emerald-600 tabular-nums flex items-center justify-end gap-0.5">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{entry.amount.toLocaleString()}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 uppercase font-mono">{entry.currencyCode}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions with prominent Cash Out (Gave) & Cash In (Got) icons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3 shadow-lg no-print">
        <div className="max-w-md md:max-w-xl mx-auto grid grid-cols-2 gap-3">
          <button
            onClick={() => onOpenAddTransaction({ party, partyType, type: 'you_gave' })}
            className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-2xl font-bold text-sm md:text-base shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            <div className="flex flex-col items-start leading-tight">
              <span>{t.youGaveRs}</span>
              <span className="text-[10px] font-normal opacity-85 uppercase">{t.cashOut}</span>
            </div>
          </button>

          <button
            onClick={() => onOpenAddTransaction({ party, partyType, type: 'you_got' })}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-bold text-sm md:text-base shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
            <div className="flex flex-col items-start leading-tight">
              <span>{t.youGotRs}</span>
              <span className="text-[10px] font-normal opacity-85 uppercase">{t.cashIn}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Repayment Due Date Modal */}
      {showDueDateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-1">{t.setPaymentDueDate}</h3>
            <p className="text-xs text-slate-500 mb-4">
              {t.selectPromisedDate}
            </p>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm mb-4 outline-none focus:border-slate-900"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDueDateModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => {
                  setShowDueDateModal(false);
                  showToast('Due date updated!');
                }}
                className="px-4 py-1.5 text-xs bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                {t.saveEntry || 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {party.name} · {partyType === 'customer' ? t.customerDetails : t.supplierDetails}
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400">{t.phoneNumber}:</span>
                <span className="ml-2 font-semibold text-slate-800">{party.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400">{t.address}:</span>
                <span className="ml-2 font-semibold text-slate-800">{party.address || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400">{t.notes}:</span>
                <span className="ml-2 font-semibold text-slate-800">{party.notes || '—'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  onOpenReportModal({ party, partyType });
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                {t.downloadPdf}
              </button>

              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  onArchiveParty(party.id, partyType);
                }}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t.archiveAccount || t.deleteCustomer}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
