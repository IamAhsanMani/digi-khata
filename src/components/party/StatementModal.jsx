import React from 'react';
import { Printer, Download, X, FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { getTranslations } from '@/lib/i18n.js';
import { formatCurrency } from '@/lib/currencies.js';
import CompanyLogo from '@/components/layout/CompanyLogo.jsx';

export default function StatementModal({
  data,
  state,
  currentLang = 'en',
  onClose,
}) {
  const t = getTranslations(currentLang);
  const isRtl = currentLang === 'ur' || currentLang === 'ps';
  const currency = state.currentBusiness?.currency || 'PKR';
  const party = data?.party;
  const isSingleParty = !!party;
  const partyType = data?.partyType || 'customer';

  const entries = isSingleParty
    ? state.ledgerEntries.filter((e) => e.partyId === party.id)
    : state.ledgerEntries;

  let partyBalance = 0;
  if (party) {
    if (partyType === 'customer') {
      const balRec = state.customerBalances.find(
        (b) => b.customerId === party.id && b.currencyCode === currency
      );
      partyBalance = balRec ? balRec.balance : 0;
    } else {
      const balRec = state.supplierBalances.find(
        (b) => b.supplierId === party.id && b.currencyCode === currency
      );
      partyBalance = balRec ? balRec.balance : 0;
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const sanitize = (text) => {
      const str = String(text || '').replace(/"/g, '""');
      if (/^[=+\-@]/.test(str)) return `"'${str}"`;
      return `"${str}"`;
    };

    const headers = [
      t.statementDate || 'Date',
      t.statementDescription || 'Description',
      'Bill No',
      t.statementDebit || 'You Gave (Debit)',
      t.statementCredit || 'You Got (Credit)',
      t.statementBalance || 'Balance',
      t.currency || 'Currency',
    ];

    const rows = entries.map((e) => [
      sanitize(new Date(e.transactionDate).toLocaleDateString()),
      sanitize(e.description),
      sanitize(e.billNo),
      e.type === 'you_gave' ? e.amount : 0,
      e.type === 'you_got' ? e.amount : 0,
      e.runningBalance,
      sanitize(e.currencyCode),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `statement_${party ? party.name : 'all'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between no-print bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-800" />
            <h2 className="text-sm md:text-base font-bold text-slate-900 truncate">
              {isSingleParty
                ? `${party.name} - ${t.accountStatement}`
                : t.allTransactionsReport}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span>{t.print}</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Statement Document Content - Fully Localized */}
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className="p-6 overflow-y-auto print:p-0 flex-1 space-y-4 text-xs md:text-sm"
        >
          {/* Header with Company Logo, Company Name and Details */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div className="flex items-center gap-3.5">
              <CompanyLogo business={state.currentBusiness} size="xl" />
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">
                  {state.currentBusiness?.name || 'cloth shop'}
                </h1>
                <p className="text-slate-600 text-xs mt-0.5 font-medium">
                  {state.currentBusiness?.address || 'Main Cloth Market'}
                </p>
                <p className="text-slate-500 text-xs font-mono">
                  Tel: {state.currentBusiness?.phone || '+92 300 1234567'}
                </p>
              </div>
            </div>

            <div className={`sm:text-right shrink-0 ${isRtl ? 'sm:text-left' : 'sm:text-right'}`}>
              <span className="inline-block text-xs uppercase tracking-wider font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {t.officialStatement}
              </span>
              <p className="text-slate-500 text-[11px] mt-1 font-mono">
                {t.statementDate}: {new Date().toLocaleDateString(isRtl ? 'ur-PK' : 'en-US')}
              </p>
            </div>
          </div>

          {/* Party Info if specific party */}
          {isSingleParty && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  {partyType === 'supplier' ? t.supplierDetails : t.customerDetails}
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">{party.name}</div>
                {party.phone && <div className="text-slate-500 text-xs font-mono">{party.phone}</div>}
                {party.address && <div className="text-slate-400 text-[11px]">{party.address}</div>}
              </div>

              <div className={`text-right ${isRtl ? 'text-left' : 'text-right'}`}>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  {t.closingBalance}
                </div>
                <div
                  className={`text-lg md:text-xl font-black tabular-nums mt-0.5 ${
                    partyBalance > 0 ? 'text-rose-600' : partyBalance < 0 ? 'text-emerald-600' : 'text-slate-700'
                  }`}
                >
                  {formatCurrency(partyBalance, currency, currentLang)}
                </div>
                <div className="text-[11px] font-bold mt-0.5">
                  {partyBalance > 0 ? (
                    <span className="text-rose-600 flex items-center gap-1 justify-end">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      {t.youWillGet}
                    </span>
                  ) : partyBalance < 0 ? (
                    <span className="text-emerald-600 flex items-center gap-1 justify-end">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      {t.youWillGive}
                    </span>
                  ) : (
                    <span className="text-slate-500">{t.accountSettled}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Localized Ledger Statement Table */}
          <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold border-b border-slate-200">
                  <th className={`py-3 px-3.5 ${isRtl ? 'text-right' : 'text-left'}`}>{t.statementDate}</th>
                  <th className={`py-3 px-3.5 ${isRtl ? 'text-right' : 'text-left'}`}>{t.statementDescription}</th>
                  <th className="py-3 px-3.5 text-right text-rose-600">
                    <span className="flex items-center justify-end gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>{t.statementDebit}</span>
                    </span>
                  </th>
                  <th className="py-3 px-3.5 text-right text-emerald-600">
                    <span className="flex items-center justify-end gap-1">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>{t.statementCredit}</span>
                    </span>
                  </th>
                  <th className="py-3 px-3.5 text-right">{t.statementBalance}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400">
                      {t.noTransactions}
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const isGave = entry.type === 'you_gave';
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className={`py-2.5 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                          {new Date(entry.transactionDate).toLocaleDateString(isRtl ? 'ur-PK' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className={`py-2.5 px-3.5 font-medium ${isRtl ? 'text-right' : 'text-left'}`}>
                          <span>{entry.description || (isGave ? t.creditSale : t.paymentReceived)}</span>
                          {entry.billNo && (
                            <span className="text-[10px] text-slate-400 mx-1.5 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                              #{entry.billNo}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-extrabold text-rose-600 tabular-nums">
                          {isGave ? entry.amount.toLocaleString() : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-extrabold text-emerald-600 tabular-nums">
                          {!isGave ? entry.amount.toLocaleString() : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatCurrency(entry.runningBalance, entry.currencyCode, currentLang)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer certification */}
          <div className="pt-4 border-t border-slate-200 text-center text-slate-500 text-[10px] leading-relaxed">
            {t.statementCertification}
          </div>
        </div>
      </div>
    </div>
  );
}
