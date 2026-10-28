import React, { useState } from 'react';
import { User, Phone, MapPin, X, Info } from 'lucide-react';
import { getTranslations } from '@/lib/i18n.js';
import { supportedCurrencies } from '@/lib/currencies.js';
import { addPartyRemote } from '@/lib/db.js';

export default function AddCustomerModal({
  type = 'customer', // 'customer' | 'supplier'
  currentLang = 'en',
  onClose,
  onSuccess,
}) {
  const t = getTranslations(currentLang);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [balanceType, setBalanceType] = useState(
    type === 'customer' ? 'you_will_get' : 'you_will_give'
  );
  const [currencyCode, setCurrencyCode] = useState('PKR');
  const [errorMsg, setErrorMsg] = useState('');

  const isCustomer = type === 'customer';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(
        currentLang === 'ur'
          ? 'نام درج کرنا ضروری ہے'
          : currentLang === 'ps'
          ? 'د نوم لیکل اړین دي'
          : 'Name is required'
      );
      return;
    }

    const res = await addPartyRemote({
      type,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim(),
      openingBalance: openingBalance ? parseFloat(openingBalance) : 0,
      balanceType,
      currencyCode,
    });

    if (res.success) {
      onSuccess(res.party);
    } else {
      setErrorMsg(res.error || 'Failed to add party');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isCustomer ? t.addNewCustomer : t.addNewSupplier}
            </h2>
            <p className="text-[11px] text-slate-500">
              {isCustomer ? t.createCustomerSubtitle : t.createSupplierSubtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-xl mb-3">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isCustomer ? t.customerName : t.supplierName}
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-200 focus-within:border-slate-900 rounded-xl px-3 py-2">
              <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isCustomer ? 'jamil cloth merchant' : 'Lahore Textile Mills'}
                className="w-full bg-transparent text-xs text-slate-900 outline-none"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.mobilePhoneNumber}
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-200 focus-within:border-slate-900 rounded-xl px-3 py-2">
              <Phone className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 0000000"
                className="w-full bg-transparent text-xs text-slate-900 outline-none font-mono"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t.shopAddressMarket}
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-200 focus-within:border-slate-900 rounded-xl px-3 py-2">
              <MapPin className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop number, market, or city"
                className="w-full bg-transparent text-xs text-slate-900 outline-none"
              />
            </div>
          </div>

          {/* Opening balance & Direction */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                {t.openingBalance}
              </label>
              <select
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-700"
              >
                {supportedCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">{t.amount}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">{t.direction}</span>
                <select
                  value={balanceType}
                  onChange={(e) => setBalanceType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-800 outline-none"
                >
                  {isCustomer ? (
                    <>
                      <option value="you_will_get">{t.customerOwesYou}</option>
                      <option value="you_will_give">{t.customerAdvance}</option>
                    </>
                  ) : (
                    <>
                      <option value="you_will_give">{t.youOweSupplier}</option>
                      <option value="you_will_get">{t.advanceToSupplier}</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Clear explanation of Direction with full translations */}
            <div className="flex items-start gap-1.5 text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-100">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <span>
                {balanceType === 'you_will_get'
                  ? isCustomer
                    ? t.explainCustomerGet
                    : t.explainSupplierGet
                  : isCustomer
                  ? t.explainCustomerGive
                  : t.explainSupplierGive}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {isCustomer ? t.saveCustomer : t.saveSupplier}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
