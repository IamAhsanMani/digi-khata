import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileText,
  UserPlus,
  ChevronRight,
  Archive,
  ShieldCheck,
  Phone,
  Landmark,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Building,
  CheckCircle2,
  X,
} from 'lucide-react';
import { getTranslations } from '@/lib/i18n.js';
import { formatCurrency, supportedCurrencies } from '@/lib/currencies.js';
import { addBankAccountRemote, recordBankTransactionRemote } from '@/lib/db.js';

export default function PartyList({
  state,
  currentLang = 'en',
  onSelectCustomer,
  onSelectSupplier,
  onOpenAddPartyModal,
  onOpenReportModal,
  onUpdateState,
}) {
  const t = getTranslations(currentLang);
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' | 'suppliers' | 'bank' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'archived'

  // Bank Modals
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountTitle: '',
    accountNumber: '',
    initialBalance: '',
    currencyCode: 'PKR',
  });

  const [showBankTxModal, setShowBankTxModal] = useState(false);
  const [bankTxForm, setBankTxForm] = useState({
    bankAccountId: '',
    type: 'deposit', // 'deposit' | 'withdrawal'
    amount: '',
    description: '',
    reference: '',
  });
  const [bankError, setBankError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const currency = state.currentBusiness?.currency || 'PKR';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Compute aggregated totals for KPI card
  const totals = useMemo(() => {
    let totalWillGive = 0;
    let totalWillGet = 0;

    state.customerBalances
      .filter((b) => b.currencyCode === currency)
      .forEach((b) => {
        if (b.balance > 0) totalWillGet += b.balance;
        else if (b.balance < 0) totalWillGive += Math.abs(b.balance);
      });

    state.supplierBalances
      .filter((b) => b.currencyCode === currency)
      .forEach((b) => {
        if (b.balance > 0) totalWillGive += b.balance;
        else if (b.balance < 0) totalWillGet += Math.abs(b.balance);
      });

    return { totalWillGive, totalWillGet };
  }, [state.customerBalances, state.supplierBalances, currency]);

  // Filter list
  const filteredCustomers = useMemo(() => {
    return state.customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery));
      const matchesStatus = (c.status || 'active') === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [state.customers, searchQuery, statusFilter]);

  const filteredSuppliers = useMemo(() => {
    return state.suppliers.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.phone && s.phone.includes(searchQuery));
      const matchesStatus = (s.status || 'active') === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [state.suppliers, searchQuery, statusFilter]);

  const getCustomerBalance = (customerId) => {
    const balRec = state.customerBalances.find(
      (b) => b.customerId === customerId && b.currencyCode === currency
    );
    return balRec ? balRec.balance : 0;
  };

  const getSupplierBalance = (supplierId) => {
    const balRec = state.supplierBalances.find(
      (b) => b.supplierId === supplierId && b.currencyCode === currency
    );
    return balRec ? balRec.balance : 0;
  };

  const totalCount =
    activeTab === 'customers'
      ? filteredCustomers.length
      : activeTab === 'suppliers'
      ? filteredSuppliers.length
      : filteredCustomers.length + filteredSuppliers.length;

  // Handle Add Bank Account
  const handleAddBankAccount = async (e) => {
    e.preventDefault();
    setBankError('');
    const res = await addBankAccountRemote(bankForm);
    if (res.success) {
      setShowAddBankModal(false);
      setBankForm({
        bankName: '',
        accountTitle: '',
        accountNumber: '',
        initialBalance: '',
        currencyCode: 'PKR',
      });
      showToast('Bank Account added successfully!');
      if (onUpdateState) onUpdateState();
    } else {
      setBankError(res.error || 'Failed to add bank account');
    }
  };

  // Handle Record Bank Transaction
  const handleRecordBankTx = async (e) => {
    e.preventDefault();
    setBankError('');
    const res = await recordBankTransactionRemote(bankTxForm);
    if (res.success) {
      setShowBankTxModal(false);
      setBankTxForm({
        bankAccountId: '',
        type: 'deposit',
        amount: '',
        description: '',
        reference: '',
      });
      showToast(`Bank transaction recorded!`);
      if (onUpdateState) onUpdateState();
    } else {
      setBankError(res.error || 'Transaction failed');
    }
  };

  const totalBankPKR = state.bankAccounts
    .filter((b) => b.currencyCode === 'PKR')
    .reduce((sum, b) => sum + b.balance, 0);

  return (
    <div className="pb-24 max-w-md md:max-w-xl mx-auto w-full">
      {/* Sub-Header Tabs with modern slate aesthetic */}
      <div className="bg-slate-900 px-3 pt-2 pb-3 text-white border-b border-slate-800">
        <div className="flex items-center justify-around">
          {[
            { id: 'customers', label: t.customers },
            { id: 'suppliers', label: t.suppliers },
            { id: 'bank', label: t.bank },
            { id: 'all', label: t.all },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative px-3 py-1.5 text-xs md:text-sm font-semibold transition-colors cursor-pointer touch-target ${
                activeTab === item.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
              {activeTab === item.id && (
                <span className="absolute bottom-[-6px] left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="p-3">
        {/* KPI Summary Card */}
        {activeTab !== 'bank' && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 mb-3 flex items-center justify-between">
            {/* Left: You will give (Cash Out direction) */}
            <div className="flex-1 text-center pr-2 border-r border-slate-100">
              <div className="flex items-center justify-center gap-1 text-base md:text-lg font-bold text-emerald-600 tabular-nums">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                <span>{formatCurrency(totals.totalWillGive, currency, currentLang)}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                {t.youWillGive}
              </div>
            </div>

            {/* Right: You will get (Cash In direction) */}
            <div className="flex-1 text-center pl-2">
              <div className="flex items-center justify-center gap-1 text-base md:text-lg font-bold text-rose-600 tabular-nums">
                <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                <span>{formatCurrency(totals.totalWillGet, currency, currentLang)}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                {t.youWillGet}
              </div>
            </div>

            <button
              onClick={() => onOpenReportModal({ type: 'summary' })}
              title="View Summary"
              className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer ml-1 rounded-lg hover:bg-slate-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Search Bar for Customers/Suppliers */}
        {activeTab !== 'bank' && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 relative flex items-center bg-white border border-slate-200/90 rounded-2xl px-3 py-2.5 shadow-2xs focus-within:ring-2 focus-within:ring-slate-900/10">
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchQuery
                    ? t.search
                    : `${totalCount} ${activeTab === 'suppliers' ? t.suppliers : t.customers}`
                }
                className="w-full text-xs md:text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer ml-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter */}
            <button
              onClick={() => setStatusFilter((prev) => (prev === 'active' ? 'archived' : 'active'))}
              title={statusFilter === 'active' ? 'Show Archived' : 'Show Active'}
              className={`p-2.5 rounded-2xl border transition-colors cursor-pointer touch-target flex items-center justify-center ${
                statusFilter === 'archived'
                  ? 'bg-slate-100 border-slate-300 text-slate-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>

            {/* PDF Statement Export */}
            <button
              onClick={() => onOpenReportModal({ type: 'all' })}
              title="Export PDF Report"
              className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer touch-target px-2.5"
            >
              <FileText className="w-4 h-4" />
              <span className="text-[9px] font-bold tracking-tight">PDF</span>
            </button>
          </div>
        )}

        {/* BANK SECTION - FULLY FUNCTIONAL */}
        {activeTab === 'bank' && (
          <div className="space-y-4">
            {/* Bank Liquidity Summary Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-md border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {t.totalBankLiquidity}
                    </span>
                    <div className="text-2xl font-black tabular-nums text-white mt-0.5">
                      {formatCurrency(totalBankPKR, 'PKR', currentLang)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddBankModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addBankAccount}</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                <span>{state.bankAccounts.length} {t.linkedAccounts}</span>
                <button
                  onClick={() => {
                    if (state.bankAccounts.length > 0) {
                      setBankTxForm((prev) => ({ ...prev, bankAccountId: state.bankAccounts[0].id }));
                      setShowBankTxModal(true);
                    }
                  }}
                  className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                >
                  {t.recordBankMovement}
                </button>
              </div>
            </div>

            {/* List of Bank Accounts */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t.linkedAccounts}
                </h3>
              </div>

              <div className="space-y-2">
                {state.bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <Building className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {account.bankName}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {account.accountTitle} · <span className="font-mono">{account.accountNumber}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm md:text-base font-bold text-slate-900 tabular-nums">
                        {formatCurrency(account.balance, account.currencyCode, currentLang)}
                      </div>
                      <button
                        onClick={() => {
                          setBankTxForm((prev) => ({ ...prev, bankAccountId: account.id }));
                          setShowBankTxModal(true);
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:underline mt-0.5 cursor-pointer"
                      >
                        {t.transfer}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bank Transaction History Ledger */}
            <div className="mt-4">
              <h3 className="text-xs font-bold text-slate-700 mb-2 px-1 uppercase tracking-wider">
                {t.recentBankHistory}
              </h3>

              {state.bankTransactions.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
                  {t.noBankEntries}
                </div>
              ) : (
                <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                  {state.bankTransactions.map((tx) => {
                    const isDep = tx.type === 'deposit';
                    return (
                      <div key={tx.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg ${
                              isDep ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            {isDep ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {tx.description}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                              {tx.reference && `· Ref: ${tx.reference}`}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`font-bold tabular-nums text-xs md:text-sm ${
                              isDep ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isDep ? '+' : '-'} {formatCurrency(tx.amount, tx.currencyCode, currentLang)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Bal: {formatCurrency(tx.runningBalance, tx.currencyCode, currentLang)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CUSTOMERS LIST */}
        {(activeTab === 'customers' || activeTab === 'all') && (
          <div className="space-y-1.5">
            {filteredCustomers.map((customer) => {
              const balance = getCustomerBalance(customer.id);
              const isPositive = balance > 0;
              const isZero = balance === 0;

              return (
                <div
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer)}
                  className="bg-white hover:bg-slate-50/80 active:bg-slate-100 transition-colors border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between cursor-pointer shadow-2xs touch-target"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center shrink-0 uppercase">
                      {customer.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {customer.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                        <span>{customer.lastActive || t.today}</span>
                        {customer.phone && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-0.5 text-slate-400">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm md:text-base font-extrabold tabular-nums flex items-center justify-end gap-1 ${
                        isPositive ? 'text-rose-600' : isZero ? 'text-slate-600' : 'text-emerald-600'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                      ) : isZero ? null : (
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                      <span>{formatCurrency(balance, currency, currentLang)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {isPositive ? t.youWillGet : isZero ? '' : t.youWillGive}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SUPPLIERS LIST */}
        {(activeTab === 'suppliers' || activeTab === 'all') && (
          <div className="space-y-1.5 mt-2">
            {filteredSuppliers.map((supplier) => {
              const balance = getSupplierBalance(supplier.id);
              const isOwed = balance > 0;

              return (
                <div
                  key={supplier.id}
                  onClick={() => onSelectSupplier(supplier)}
                  className="bg-white hover:bg-slate-50/80 active:bg-slate-100 transition-colors border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between cursor-pointer shadow-2xs touch-target"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center shrink-0 uppercase">
                      {supplier.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {supplier.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {supplier.lastActive || t.today}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm md:text-base font-extrabold tabular-nums flex items-center justify-end gap-1 ${
                        isOwed ? 'text-emerald-600' : balance === 0 ? 'text-slate-600' : 'text-rose-600'
                      }`}
                    >
                      {isOwed ? (
                        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      ) : balance === 0 ? null : (
                        <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                      <span>{formatCurrency(balance, currency, currentLang)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {isOwed ? t.youWillGive : balance === 0 ? '' : t.youWillGet}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (+ Add Customer / Supplier) */}
      {activeTab !== 'bank' && (
        <div className="fixed bottom-20 right-4 md:right-auto md:left-1/2 md:translate-x-32 z-30 no-print">
          <button
            onClick={() =>
              onOpenAddPartyModal({
                type: activeTab === 'suppliers' ? 'supplier' : 'customer',
              })
            }
            className="flex items-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-sm shadow-xl active:scale-95 transition-all cursor-pointer touch-target"
          >
            <UserPlus className="w-5 h-5" />
            <span>{activeTab === 'suppliers' ? t.addSupplier : t.addCustomer}</span>
          </button>
        </div>
      )}

      {/* Modal: Add Bank Account */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h2 className="text-base font-bold text-slate-900">{t.addBankAccount}</h2>
              <button
                onClick={() => setShowAddBankModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bankError && (
              <div className="bg-rose-50 text-rose-700 text-xs p-2.5 rounded-xl mb-3">
                {bankError}
              </div>
            )}

            <form onSubmit={handleAddBankAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.bankName}</label>
                <input
                  type="text"
                  required
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  placeholder="e.g. Meezan Bank, HBL, Bank Alfalah"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.accountTitle}</label>
                <input
                  type="text"
                  value={bankForm.accountTitle}
                  onChange={(e) => setBankForm({ ...bankForm, accountTitle: e.target.value })}
                  placeholder="e.g. Cloth Shop Commercial"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.accountIbanNumber}</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  placeholder="0201-0104918291"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.initialBalance}</label>
                  <input
                    type="number"
                    value={bankForm.initialBalance}
                    onChange={(e) => setBankForm({ ...bankForm, initialBalance: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t.currency}</label>
                  <select
                    value={bankForm.currencyCode}
                    onChange={(e) => setBankForm({ ...bankForm, currencyCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none"
                  >
                    {supportedCurrencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  {t.saveBankAccount}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bank Deposit / Withdrawal */}
      {showBankTxModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h2 className="text-base font-bold text-slate-900">{t.recordBankMovement}</h2>
              <button
                onClick={() => setShowBankTxModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bankError && (
              <div className="bg-rose-50 text-rose-700 text-xs p-2.5 rounded-xl mb-3">
                {bankError}
              </div>
            )}

            <form onSubmit={handleRecordBankTx} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.selectBankAccount}</label>
                <select
                  value={bankTxForm.bankAccountId}
                  onChange={(e) => setBankTxForm({ ...bankTxForm, bankAccountId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none"
                >
                  {state.bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} ({b.currencyCode} {b.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.movementType}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBankTxForm({ ...bankTxForm, type: 'deposit' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                      bankTxForm.type === 'deposit'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {t.depositCashIn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankTxForm({ ...bankTxForm, type: 'withdrawal' })}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                      bankTxForm.type === 'withdrawal'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {t.withdrawalCashOut}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.amount} *</label>
                <input
                  type="number"
                  required
                  value={bankTxForm.amount}
                  onChange={(e) => setBankTxForm({ ...bankTxForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.descriptionNotes}</label>
                <input
                  type="text"
                  value={bankTxForm.description}
                  onChange={(e) => setBankTxForm({ ...bankTxForm, description: e.target.value })}
                  placeholder="e.g. Cash sales deposit, supplier cheque"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t.chequeSlipRef}</label>
                <input
                  type="text"
                  value={bankTxForm.reference}
                  onChange={(e) => setBankTxForm({ ...bankTxForm, reference: e.target.value })}
                  placeholder="CHQ-10492"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBankTxModal(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  {t.confirmMovement}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
