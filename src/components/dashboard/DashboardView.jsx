import React, { useState, useMemo } from 'react';
import {
  FileText,
  Banknote,
  TrendingUp,
  TrendingDown,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Plus,
  Landmark,
  Wallet,
  ShoppingBag,
  Coins,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { getTranslations } from '@/lib/i18n.js';
import { formatCurrency } from '@/lib/currencies.js';
import CompanyLogo from '@/components/layout/CompanyLogo.jsx';

export default function DashboardView({
  state,
  currentLang = 'en',
  onNavigateToParty,
  onNavigateToExpenses,
  onOpenQuickIncomeExpense,
}) {
  const t = getTranslations(currentLang);
  const [selectedPeriod, setSelectedPeriod] = useState('lifetime');
  const currency = state.currentBusiness?.currency || 'PKR';

  // Compute receivables and payables
  const { totalReceivables, totalPayables, topDebtors, topCreditors } = useMemo(() => {
    let rec = 0;
    let pay = 0;

    const debtors = [];
    state.customers.forEach((c) => {
      const balRec = state.customerBalances.find(
        (b) => b.customerId === c.id && b.currencyCode === currency
      );
      const b = balRec ? balRec.balance : 0;
      if (b > 0) {
        rec += b;
        debtors.push({ name: c.name, amount: b });
      }
    });

    const creditors = [];
    state.suppliers.forEach((s) => {
      const balRec = state.supplierBalances.find(
        (b) => b.supplierId === s.id && b.currencyCode === currency
      );
      const b = balRec ? balRec.balance : 0;
      if (b > 0) {
        pay += b;
        creditors.push({ name: s.name, amount: b });
      }
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    return {
      totalReceivables: rec,
      totalPayables: pay,
      topDebtors: debtors.slice(0, 3),
      topCreditors: creditors.slice(0, 3),
    };
  }, [state.customers, state.suppliers, state.customerBalances, state.supplierBalances, currency]);

  // Compute income and expenses
  const { totalIncome, totalExpense, profit } = useMemo(() => {
    let inc = 0;
    state.ledgerEntries
      .filter((e) => e.currencyCode === currency && e.status === 'posted')
      .forEach((e) => {
        if (e.type === 'you_got') inc += e.amount;
      });

    let exp = 0;
    state.expenses
      .filter((e) => e.currencyCode === currency)
      .forEach((e) => {
        exp += e.amount;
      });

    return {
      totalIncome: inc,
      totalExpense: exp,
      profit: inc - exp,
    };
  }, [state.ledgerEntries, state.expenses, currency]);

  const cashInHand = state.cashSummary?.cashInHand || 42500;
  const bankBalance = state.bankAccounts
    ? state.bankAccounts.filter(b => b.currencyCode === 'PKR').reduce((sum, b) => sum + b.balance, 0)
    : 375000;
  const stockCount = state.stockSummary?.availableStock || 240;
  const stockValue = state.stockSummary?.stockValue || 720000;
  const bestSeller = state.stockSummary?.bestSeller || 'Summer Cotton Lawn 3pc';

  return (
    <div className="pb-24 max-w-md md:max-w-xl mx-auto w-full p-3 space-y-4">
      {/* Greeting Banner with Company Logo */}
      <div className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <CompanyLogo
            business={state.currentBusiness}
            size="lg"
          />
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              {state.currentBusiness?.name || 'cloth shop'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {state.currentBusiness?.address || 'Digital Khata Business Workspace'}
            </p>
          </div>
        </div>
      </div>

      {/* Receivables & Payables Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.receivables} & {t.payables}</h3>
              <p className="text-[11px] text-slate-500">Top payable & Receivable amounts</p>
            </div>
          </div>
          <button
            onClick={onNavigateToParty}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer hover:bg-slate-50"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Two KPI Blocks with visual Cash In / Cash Out icons */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-rose-50 border border-rose-100 text-rose-950 rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1 text-sm md:text-base font-black text-rose-600 tabular-nums">
              <ArrowDownLeft className="w-4 h-4 text-rose-600 stroke-[2.5]" />
              <span>{formatCurrency(totalReceivables, currency, currentLang)}</span>
            </div>
            <div className="text-[11px] font-bold text-rose-800 mt-0.5">{t.receivables}</div>
            <div className="text-[9px] text-rose-600 font-medium uppercase tracking-wider">{t.youWillGet}</div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 text-emerald-950 rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1 text-sm md:text-base font-black text-emerald-600 tabular-nums">
              <ArrowUpRight className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              <span>{formatCurrency(totalPayables, currency, currentLang)}</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-800 mt-0.5">{t.payables}</div>
            <div className="text-[9px] text-emerald-600 font-medium uppercase tracking-wider">{t.youWillGive}</div>
          </div>
        </div>

        {/* Top Debtors */}
        <div className="border-t border-slate-100 pt-2.5 mb-2">
          <div className="text-xs font-bold text-slate-700 mb-1.5">{t.customers} (Highest Due)</div>
          {topDebtors.length === 0 ? (
            <div className="text-xs text-slate-400 py-1">No entries</div>
          ) : (
            <div className="space-y-1">
              {topDebtors.map((d, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-0.5">
                  <span className="text-slate-700 font-medium truncate max-w-[150px]">{d.name}</span>
                  <span className="text-rose-600 font-bold tabular-nums">
                    {formatCurrency(d.amount, currency, currentLang)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Creditors */}
        <div className="border-t border-slate-100 pt-2">
          <div className="text-xs font-bold text-slate-700 mb-1.5">{t.suppliers} (Payables)</div>
          {topCreditors.length === 0 ? (
            <div className="text-xs text-slate-400 py-1">No entries</div>
          ) : (
            <div className="space-y-1">
              {topCreditors.map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-0.5">
                  <span className="text-slate-700 font-medium truncate max-w-[150px]">{s.name}</span>
                  <span className="text-emerald-600 font-bold tabular-nums">
                    {formatCurrency(s.amount, currency, currentLang)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cash Flow Summary Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.cashFlowSummary}</h3>
              <p className="text-[11px] text-slate-500">{t.trackDailyCash}</p>
            </div>
          </div>
          <button className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer hover:bg-slate-50">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3">
            <div className="text-[11px] text-slate-500 font-medium">{t.cashInHand}</div>
            <div className="text-sm md:text-base font-bold text-slate-900 tabular-nums mt-0.5">
              {formatCurrency(cashInHand, currency, currentLang)}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3">
            <div className="text-[11px] text-slate-500 font-medium">{t.bankBalance}</div>
            <div className="text-sm md:text-base font-bold text-slate-900 tabular-nums mt-0.5">
              {formatCurrency(bankBalance, currency, currentLang)}
            </div>
          </div>
        </div>

        {/* Trend Legend */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 font-medium mb-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {t.cashFlowTrend}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {t.bankBalanceTrend}
          </span>
        </div>

        {/* Trend Line Chart */}
        <div className="w-full h-32 pt-2 pb-1 relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 320 90">
            <line x1="30" y1="10" x2="310" y2="10" stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1="30" y1="35" x2="310" y2="35" stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1="30" y1="60" x2="310" y2="60" stroke="#e2e8f0" />
            <line x1="30" y1="80" x2="310" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />

            <text x="5" y="14" fontSize="8" fill="#94a3b8" fontFamily="monospace">1K</text>
            <text x="5" y="38" fontSize="8" fill="#94a3b8" fontFamily="monospace">500</text>
            <text x="5" y="63" fontSize="8" fill="#94a3b8" fontFamily="monospace">0</text>
            <text x="5" y="83" fontSize="8" fill="#94a3b8" fontFamily="monospace">-500</text>

            <line x1="30" y1="60" x2="310" y2="60" stroke="#059669" strokeWidth="2" />
            {[45, 95, 145, 195, 245, 295].map((cx, idx) => (
              <circle key={idx} cx={cx} cy="60" r="3.5" fill="#059669" />
            ))}
          </svg>

          <div className="flex justify-between text-[10px] text-slate-400 font-mono px-4 mt-1">
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
          </div>
        </div>
      </div>

      {/* Available Stock Items Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t.availableStock}</h3>
              <p className="text-[11px] text-slate-500">{t.stockOverview}</p>
            </div>
          </div>
          <button className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer hover:bg-slate-50">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3">
            <div className="text-[11px] text-slate-500 font-medium">{t.stockCount}</div>
            <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
              {stockCount}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3">
            <div className="text-[11px] text-slate-500 font-medium">{t.stockValue}</div>
            <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
              {formatCurrency(stockValue, currency, currentLang)}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-2">
          <div className="text-xs font-bold text-slate-800 mb-1">{t.bestSeller}</div>
          <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold">
            {bestSeller}
          </div>
        </div>
      </div>

      {/* Income & Expense Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t.incomeExpense}</h3>
            <p className="text-[11px] text-slate-500">{t.profitEquation}</p>
          </div>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 bg-slate-50 outline-none"
          >
            <option value="lifetime">{t.lifetime}</option>
            <option value="this_month">{t.thisMonth}</option>
          </select>
        </div>

        {/* Profit banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{t.profit}</span>
          </div>
          <span className="text-lg font-black text-emerald-400 tabular-nums">
            {formatCurrency(profit, currency, currentLang)}
          </span>
        </div>

        {/* Income Section */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold text-emerald-700 mb-2">
            <span>{t.income}</span>
            <span className="tabular-nums">{formatCurrency(totalIncome, currency, currentLang)}</span>
          </div>
          <div className="space-y-1.5">
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-2.5 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">{t.stockSale}</span>
              <button
                onClick={() => onOpenQuickIncomeExpense({ type: 'income', category: 'Stock Sale' })}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
              >
                <span>{t.add}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-2.5 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">{t.billSale}</span>
              <button
                onClick={() => onOpenQuickIncomeExpense({ type: 'income', category: 'Bill Sale' })}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
              >
                <span>{t.add}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Expense Section */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold text-rose-700 mb-2">
            <span>{t.expense}</span>
            <span className="tabular-nums">{formatCurrency(totalExpense, currency, currentLang)}</span>
          </div>
          <div className="space-y-1.5">
            {[
              { id: 'purchases', label: t.purchases },
              { id: 'expenses', label: t.expenses },
              { id: 'salaries', label: t.salaries },
            ].map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 border border-slate-200/60 rounded-2xl p-2.5 flex items-center justify-between"
              >
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
                <button
                  onClick={() => onOpenQuickIncomeExpense({ type: 'expense', category: item.label })}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
                >
                  <span>{t.add}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
