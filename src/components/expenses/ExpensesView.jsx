import React, { useState } from 'react';
import {
  Plus,
  Receipt,
  Calendar,
  CreditCard,
  X,
  ArrowUpRight,
  Tag,
  Coins,
  FileText,
  Wallet,
} from 'lucide-react';
import { getTranslations } from '@/lib/i18n.js';
import { formatCurrency, supportedCurrencies } from '@/lib/currencies.js';
import { addExpenseRemote } from '@/lib/db.js';

export default function ExpensesView({ state, currentLang = 'en', onUpdateState }) {
  const t = getTranslations(currentLang);
  const isRtl = currentLang === 'ur' || currentLang === 'ps';
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState('Purchases');
  const [amount, setAmount] = useState('');
  const [currencyCode, setCurrencyCode] = useState('PKR');
  const [description, setDescription] = useState('');
  const [billNo, setBillNo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [errorMsg, setErrorMsg] = useState('');

  const currency = state.currentBusiness?.currency || 'PKR';

  const categoryOptions = [
    { id: 'Purchases', label: t.catPurchases || 'Purchases & Stock' },
    { id: 'Expenses', label: t.catExpenses || 'General Expenses' },
    { id: 'Salaries', label: t.catSalaries || 'Staff Salaries' },
    { id: 'Rent', label: t.catRent || 'Shop Rent' },
    { id: 'Utilities', label: t.catUtilities || 'Utilities & Electricity' },
    { id: 'Tea & Refreshments', label: t.catTeaRefreshments || 'Tea & Refreshments' },
    { id: 'Transport', label: t.catTransport || 'Transport & Freight' },
  ];

  const paymentModes = [
    { id: 'Cash', label: t.cash || 'Cash' },
    { id: 'Bank Transfer', label: t.bankTransfer || 'Bank Transfer' },
    { id: 'Cheque', label: currentLang === 'ur' ? 'چیک' : currentLang === 'ps' ? 'چک' : 'Cheque' },
  ];

  const totalExpenseAmount = state.expenses
    .filter((e) => e.currencyCode === currency)
    .reduce((sum, e) => sum + e.amount, 0);

  const getCategoryLabel = (catId) => {
    const item = categoryOptions.find((c) => c.id === catId);
    return item ? item.label : catId;
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setErrorMsg(currentLang === 'ur' ? 'برائے مہربانی درست رقم درج کریں' : currentLang === 'ps' ? 'مهرباني وکړئ سمه اندازه وټاکئ' : 'Please enter a valid amount');
      return;
    }

    const res = await addExpenseRemote({
      category,
      amount,
      currencyCode,
      description,
      billNo,
      paymentMethod,
    });

    if (res.success) {
      setShowAddModal(false);
      setAmount('');
      setDescription('');
      setBillNo('');
      setErrorMsg('');
      onUpdateState();
    } else {
      setErrorMsg(res.error || 'Failed to save expense');
    }
  };

  return (
    <div className="pb-24 max-w-md md:max-w-xl mx-auto w-full p-3 space-y-4">
      {/* Top Summary Banner */}
      <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-sm flex items-center justify-between border border-slate-800">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
            {t.totalExpenses}
          </div>
          <div className="text-2xl font-black tabular-nums mt-0.5 text-white flex items-center gap-1.5">
            <ArrowUpRight className="w-5 h-5 text-rose-500 stroke-[2.5]" />
            <span>{formatCurrency(totalExpenseAmount, currency, currentLang)}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {state.expenses.length} {t.vouchersRecorded}
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer touch-target"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t.addExpense}</span>
        </button>
      </div>

      {/* Expenses List */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-700 px-1 uppercase tracking-wider">
          {t.recentExpenseVouchers}
        </h3>

        {state.expenses.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400 text-xs">
            {t.noExpensesRecorded}
          </div>
        ) : (
          state.expenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {exp.description || getCategoryLabel(exp.category)}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate flex items-center gap-2 mt-0.5">
                    <span className="font-semibold text-slate-700">{getCategoryLabel(exp.category)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{exp.paymentMethod}</span>
                    {exp.billNo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">#{exp.billNo}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm md:text-base font-extrabold text-rose-600 tabular-nums flex items-center justify-end gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                  <span>{formatCurrency(exp.amount, exp.currencyCode, currentLang)}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {new Date(exp.date).toLocaleDateString(isRtl ? 'ur-PK' : 'en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Expense Modal - Fully Multilingual */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div
            dir={isRtl ? 'rtl' : 'ltr'}
            className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative border border-slate-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h2 className="text-base font-bold text-slate-900">{t.recordExpense}</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-xl mb-3">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.expenseCategory}</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                    <Coins className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.amount} *</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.currency}</span>
                  </label>
                  <select
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 outline-none"
                  >
                    {supportedCurrencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t.descriptionNotes || t.description}</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={currentLang === 'ur' ? 'مثلاً دکان کا بجلی کا بل یا سفری خرچہ' : currentLang === 'ps' ? 'لکه د برېښنا بیل یا کرایه' : 'e.g. Electricity bill or store delivery'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.voucherBillNo}</span>
                  </label>
                  <input
                    type="text"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    placeholder="V-102"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.paymentMode}</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-800 outline-none"
                  >
                    {paymentModes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  {t.saveExpense}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
