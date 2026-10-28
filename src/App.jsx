import React, { useState, useEffect } from 'react';
import TopHeader from '@/components/layout/TopHeader.jsx';
import BottomNav from '@/components/layout/BottomNav.jsx';
import PartyList from '@/components/party/PartyList.jsx';
import CustomerLedger from '@/components/party/CustomerLedger.jsx';
import AddTransactionModal from '@/components/party/AddTransactionModal.jsx';
import AddCustomerModal from '@/components/party/AddCustomerModal.jsx';
import StatementModal from '@/components/party/StatementModal.jsx';
import DashboardView from '@/components/dashboard/DashboardView.jsx';
import ExpensesView from '@/components/expenses/ExpensesView.jsx';
import TeamManagement from '@/components/team/TeamManagement.jsx';
import SettingsView from '@/components/settings/SettingsView.jsx';
import AuthPages from '@/components/auth/AuthPages.jsx';

import { getTranslations } from '@/lib/i18n.js';
import { supabase, getDatabaseState, saveDatabaseState, createEmptyWorkspaceState, loadWorkspaceState, archivePartyRemote } from '@/lib/db.js';

export default function App() {
  const [dbState, setDbState] = useState(createEmptyWorkspaceState());
  const [authChecking, setAuthChecking] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(
    new URLSearchParams(window.location.search).get('type') === 'recovery' ||
    window.location.hash.includes('type=recovery')
  );
  const [currentLang, setCurrentLang] = useState('en');
  const [activeTab, setActiveTab] = useState('party'); // 'party' | 'dashboard' | 'expenses' | 'team' | 'settings'
  const [selectedParty, setSelectedParty] = useState(null); // When viewing a ledger
  const [selectedPartyType, setSelectedPartyType] = useState('customer'); // 'customer' | 'supplier'

  // Modals
  const [transactionModalData, setTransactionModalData] = useState(null); // { party, partyType, type: 'you_gave' | 'you_got' }
  const [addPartyModalData, setAddPartyModalData] = useState(null); // { type: 'customer' | 'supplier' }
  const [reportModalData, setReportModalData] = useState(null);

  // Restore only a real Supabase session; never trust a locally cached demo user.
  useEffect(() => {
    let active = true;
    const resetWorkspace = () => {
      const empty = createEmptyWorkspaceState();
      saveDatabaseState(empty);
      if (active) setDbState(empty);
    };

    if (!supabase) {
      resetWorkspace();
      setAuthChecking(false);
      return () => { active = false; };
    }

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) throw error;
      if (data.session?.user) {
        const loaded = await loadWorkspaceState(data.session.user);
        if (active) {
          if (loaded.needsBusiness) resetWorkspace();
          else setDbState(loaded.state);
        }
      } else {
        resetWorkspace();
      }
    }).catch((error) => {
      console.error('Unable to restore Supabase session:', error);
      resetWorkspace();
    }).finally(() => {
      if (active) setAuthChecking(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) resetWorkspace();
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Sync RTL / LTR on html element
  useEffect(() => {
    const isRtl = currentLang === 'ur' || currentLang === 'ps';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  const refreshState = () => {
    setDbState(getDatabaseState());
  };

  const handleLanguageChange = (newLang) => {
    setCurrentLang(newLang);
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    const empty = createEmptyWorkspaceState();
    saveDatabaseState(empty);
    setDbState(empty);
  };

  const handleArchiveParty = async (partyId, type) => {
    const result = await archivePartyRemote(partyId, type);
    if (!result.success) {
      alert(result.error || 'Unable to archive this record.');
      return;
    }
    setSelectedParty(null);
    refreshState();
  };

  // Quick Income / Expense action from Dashboard
  const handleOpenQuickIncomeExpense = ({ type, category }) => {
    if (type === 'income') {
      const targetParty = dbState.customers[0];
      if (!targetParty) {
        alert('Add a customer first, then record income in their ledger.');
        setActiveTab('party');
        return;
      }
      setTransactionModalData({
        party: targetParty,
        partyType: 'customer',
        type: 'you_got',
      });
    } else {
      setActiveTab('expenses');
    }
  };

  const t = getTranslations(currentLang);

  if (passwordRecovery) {
    return <AuthPages
      currentLang={currentLang}
      initialMode="recovery"
      onPasswordRecovered={() => {
        setPasswordRecovery(false);
        window.history.replaceState({}, document.title, window.location.pathname);
      }}
      onAuthenticated={() => {}}
    />;
  }

  if (authChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm">Connecting securely to DigiKhata…</div>;
  }

  // If user is not signed in
  if (!dbState.currentUser || !dbState.currentBusiness) {
    return (
      <AuthPages
        currentLang={currentLang}
        onAuthenticated={(user) => {
          const state = getDatabaseState();
          state.currentUser = user;
          saveDatabaseState(state);
          setDbState(state);
        }}
      />
    );
  }

  // Header Title calculation
  let headerTitle = t.appName;
  let headerBadge = null;
  let showBack = false;

  if (selectedParty) {
    headerTitle = selectedParty.name;
    showBack = true;
  } else if (activeTab === 'party') {
    headerTitle = t.party;
    headerBadge = t.collection;
  } else if (activeTab === 'dashboard') {
    headerTitle = t.dashboard;
  } else if (activeTab === 'expenses') {
    headerTitle = t.expenses;
  } else if (activeTab === 'team') {
    headerTitle = t.team;
  } else if (activeTab === 'settings') {
    headerTitle = t.settings;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col antialiased">
      {/* Top Header matching screenshots */}
      <TopHeader
        title={headerTitle}
        subtitle={selectedParty ? t.clickSettings : null}
        badge={headerBadge}
        showBack={showBack}
        onBack={() => setSelectedParty(null)}
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        currentUser={dbState.currentUser}
        business={dbState.currentBusiness}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto">
        {selectedParty ? (
          <CustomerLedger
            party={selectedParty}
            partyType={selectedPartyType}
            state={dbState}
            currentLang={currentLang}
            onBack={() => setSelectedParty(null)}
            onOpenAddTransaction={(params) => setTransactionModalData(params)}
            onOpenReportModal={(params) => setReportModalData(params)}
            onArchiveParty={handleArchiveParty}
          />
        ) : (
          <>
            {activeTab === 'party' && (
              <PartyList
                state={dbState}
                currentLang={currentLang}
                onSelectCustomer={(cust) => {
                  setSelectedParty(cust);
                  setSelectedPartyType('customer');
                }}
                onSelectSupplier={(sup) => {
                  setSelectedParty(sup);
                  setSelectedPartyType('supplier');
                }}
                onOpenAddPartyModal={(params) => setAddPartyModalData(params)}
                onOpenReportModal={(params) => setReportModalData(params)}
                onUpdateState={refreshState}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                state={dbState}
                currentLang={currentLang}
                onNavigateToParty={() => setActiveTab('party')}
                onNavigateToExpenses={() => setActiveTab('expenses')}
                onOpenQuickIncomeExpense={handleOpenQuickIncomeExpense}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesView
                state={dbState}
                currentLang={currentLang}
                onUpdateState={refreshState}
              />
            )}

            {activeTab === 'team' && (
              <TeamManagement
                state={dbState}
                currentLang={currentLang}
                onUpdateState={refreshState}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                state={dbState}
                currentLang={currentLang}
                onLanguageChange={handleLanguageChange}
                onUpdateState={refreshState}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile-first Bottom Navigation (hidden on print or when viewing single ledger) */}
      {!selectedParty && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSelectedParty(null);
          }}
          currentLang={currentLang}
        />
      )}

      {/* Transaction Modal (You Gave / You Got) */}
      {transactionModalData && (
        <AddTransactionModal
          party={transactionModalData.party}
          partyType={transactionModalData.partyType}
          type={transactionModalData.type}
          currentLang={currentLang}
          onClose={() => setTransactionModalData(null)}
          onSuccess={() => {
            setTransactionModalData(null);
            refreshState();
          }}
        />
      )}

      {/* Add Party Modal (Customer / Supplier) */}
      {addPartyModalData && (
        <AddCustomerModal
          type={addPartyModalData.type}
          currentLang={currentLang}
          onClose={() => setAddPartyModalData(null)}
          onSuccess={(party) => {
            setAddPartyModalData(null);
            refreshState();
            setSelectedParty(party);
            setSelectedPartyType(addPartyModalData.type);
          }}
        />
      )}

      {/* Statement & Reports Modal */}
      {reportModalData && (
        <StatementModal
          data={reportModalData}
          state={dbState}
          currentLang={currentLang}
          onClose={() => setReportModalData(null)}
        />
      )}
    </div>
  );
}
