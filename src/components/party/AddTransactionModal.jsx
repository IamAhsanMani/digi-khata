import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Paperclip,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
} from 'lucide-react';
import { getTranslations } from '@/lib/i18n.js';
import { supportedCurrencies } from '@/lib/currencies.js';
import { postLedgerTransactionRemote } from '@/lib/db.js';

export default function AddTransactionModal({
  party,
  partyType = 'customer',
  type = 'you_gave', // 'you_gave' | 'you_got'
  currentLang = 'en',
  onClose,
  onSuccess,
}) {
  const t = getTranslations(currentLang);
  const [selectedCurrency, setSelectedCurrency] = useState('PKR');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [billNo, setBillNo] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' | 'party' | 'bank'
  const [hasAttachment, setHasAttachment] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const now = new Date();
  const formattedDate = now.toLocaleDateString(currentLang === 'en' ? 'en-GB' : 'ur-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isGot = type === 'you_got';
  const numericVal = parseFloat(amountStr) || 0;
  const currObj = supportedCurrencies.find((c) => c.code === selectedCurrency) || supportedCurrencies[0];

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (numericVal <= 0) {
      setErrorMsg(currentLang === 'ur' ? 'براہ کرم صفر سے زیادہ رقم درج کریں' : currentLang === 'ps' ? 'مهرباني وکړئ تر صفر لوړه اندازه ولیکئ' : 'Please enter an amount greater than 0');
      return;
    }

    const idempotencyKey = `idemp_${Date.now()}_${Math.random()}`;
    const result = await postLedgerTransactionRemote({
      partyType,
      partyId: party.id,
      type,
      amount: numericVal,
      currencyCode: selectedCurrency,
      description,
      billNo,
      paymentMethod: paymentMode,
      transactionDate: new Date().toISOString(),
      hasAttachment,
      audioNoteUrl: null,
      idempotencyKey,
      createdBy: 'Store Cashier',
    });

    if (result.success) {
      onSuccess(result.entry);
    } else {
      setErrorMsg(result.error || 'Failed to save transaction');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Modern Professional Header with Translations */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-0.5 border ${
                  isGot
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {isGot ? <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" /> : <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>{isGot ? t.paymentReceived : t.creditSale}</span>
              </span>
              <h2 className="text-base font-bold text-white truncate">
                {isGot ? `${t.youGotFrom} ${party.name}` : `${t.youGaveTo} ${party.name}`}
              </h2>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-3 text-xs mx-4 mt-3 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs md:text-sm">
          {/* Multi-Currency Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.transactionCurrency}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {supportedCurrencies.map((c) => (
                <button
                  type="button"
                  key={c.code}
                  onClick={() => setSelectedCurrency(c.code)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    selectedCurrency === c.code
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span>{c.flag}</span>
                    <span className="font-bold">{c.code}</span>
                  </span>
                  <span className="opacity-80 font-mono text-[11px]">{c.symbol}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Clean Native Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.amount} ({currObj.code} - {currObj.name}) *
            </label>
            <div className="relative flex items-center bg-slate-50 border-2 border-slate-200 focus-within:border-slate-900 rounded-2xl p-3 shadow-xs transition-colors">
              <span className="text-xl font-bold text-slate-600 mr-2 shrink-0">
                {currObj.symbol}
              </span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                autoFocus
                required
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="0.00"
                className="w-full bg-transparent text-2xl font-bold text-slate-900 outline-none tabular-nums"
              />
              {amountStr && (
                <button
                  type="button"
                  onClick={() => setAmountStr('')}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold px-2 py-1 rounded"
                >
                  {t.clear}
                </button>
              )}
            </div>
          </div>

          {/* Details / Description text input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.descriptionNotes}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2.5 text-xs md:text-sm text-slate-900 outline-none transition-colors"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t.date}</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium text-slate-700">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>{formattedDate}</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t.time}</label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium text-slate-700">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>{formattedTime}</span>
              </div>
            </div>
          </div>

          {/* Bill No. & Receipt Attachment Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t.billInvoiceNo}</label>
              <input
                type="text"
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
                placeholder="INV-1092"
                className="w-full bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t.attachment}</label>
              <button
                type="button"
                onClick={() => setHasAttachment((prev) => !prev)}
                className={`w-full border rounded-xl px-3 py-2 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  hasAttachment
                    ? 'bg-slate-900 border-slate-900 text-white font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Paperclip className="w-4 h-4" />
                <span>{hasAttachment ? t.receiptAttached : t.attachPhoto}</span>
              </button>
            </div>
          </div>

          {/* Payment Method Toggle: Cash vs Party vs Bank */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.paymentMethod}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: t.cash },
                { id: 'party', label: t.khataParty },
                { id: 'bank', label: t.bankTransfer },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setPaymentMode(item.id)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    paymentMode === item.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-2xl font-bold text-xs md:text-sm cursor-pointer transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className={`flex-2 py-3.5 text-white font-bold text-sm md:text-base rounded-2xl shadow-lg active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isGot
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{t.saveEntry} ({currObj.symbol} {numericVal.toLocaleString()})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
