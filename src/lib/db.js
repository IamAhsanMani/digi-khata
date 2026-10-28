/**
 * DigiKhata Database & Financial Domain Service
 * Production-ready financial ledger, multi-currency customer & supplier balances,
 * functional Bank Accounts & cashbook reconciliation, idempotency enforcement, and audit logs.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const STORAGE_KEY = 'digikhata_workspace_state_v2';

// Initial seed data with multi-currency balances and functional bank accounts
const INITIAL_DATA = {
  currentBusiness: null,
  currentUser: null,
  teamMembers: [],
  customers: [],
  suppliers: [],
  customerBalances: [],
  supplierBalances: [],
  bankAccounts: [],
  bankTransactions: [],
  ledgerEntries: [],
  expenses: [],
  stockSummary: { availableStock: 0, stockValue: 0, bestSeller: '' },
  cashSummary: { cashInHand: 0, bankBalance: 0 },
  auditLogs: [],
};

let stateCache = null;

export function getDatabaseState() {
  if (stateCache) return stateCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      stateCache = JSON.parse(raw);
      // Ensure bank collections exist if from older state
      if (!stateCache.bankAccounts) stateCache.bankAccounts = INITIAL_DATA.bankAccounts;
      if (!stateCache.bankTransactions) stateCache.bankTransactions = INITIAL_DATA.bankTransactions;
      return stateCache;
    }
  } catch (err) {
    console.warn('Storage read failed, using memory state:', err);
  }
  // Never seed production workspaces with demo customers, balances, or a demo user.
  stateCache = createEmptyWorkspaceState();
  saveDatabaseState(stateCache);
  return stateCache;
}

export function saveDatabaseState(newState) {
  stateCache = newState;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  } catch (err) {
    console.warn('Storage write failed:', err);
  }
}

/**
 * Generate cryptographically secure random password
 */
export function generateSecurePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*()_+~';
  const all = upper + lower + numbers + symbols;

  const cryptoObj = window.crypto || window.msCrypto;
  const length = 14;
  let password = '';

  const randomBytes = new Uint8Array(length);
  cryptoObj.getRandomValues(randomBytes);

  password += upper[randomBytes[0] % upper.length];
  password += lower[randomBytes[1] % lower.length];
  password += numbers[randomBytes[2] % numbers.length];
  password += symbols[randomBytes[3] % symbols.length];

  for (let i = 4; i < length; i++) {
    password += all[randomBytes[i] % all.length];
  }

  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomBytes[i % length] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

/**
 * Post an atomic ledger entry with explicit multi-currency support
 * @param {Object} params
 */
export function postLedgerTransaction({
  partyType = 'customer',
  partyId,
  type, // 'you_gave' | 'you_got'
  amount,
  currencyCode = 'PKR',
  description = '',
  billNo = '',
  paymentMethod = 'cash',
  transactionDate = new Date().toISOString(),
  hasAttachment = false,
  attachmentUrl = null,
  attachmentName = null,
  attachmentType = null,
  attachmentProvider = null,
  audioNoteUrl = null,
  idempotencyKey,
  createdBy = 'Staff',
}) {
  const state = getDatabaseState();
  const numericAmount = parseFloat(amount);

  if (isNaN(numericAmount) || numericAmount <= 0) {
    return { success: false, error: 'Valid positive amount is required.' };
  }

  // Idempotency check: prevent duplicate writes
  if (idempotencyKey) {
    const existing = state.ledgerEntries.find((e) => e.idempotencyKey === idempotencyKey);
    if (existing) {
      return { success: true, entry: existing, idempotentDuplicate: true };
    }
  }

  // Find balance record specifically for this party AND this currency
  let currentBal = 0;
  if (partyType === 'customer') {
    let balRecord = state.customerBalances.find(
      (b) => b.customerId === partyId && b.currencyCode === currencyCode
    );
    if (!balRecord) {
      balRecord = {
        id: `bal_${partyId}_${currencyCode.toLowerCase()}`,
        businessId: state.currentBusiness.id,
        customerId: partyId,
        currencyCode,
        balance: 0,
        version: 1,
        updatedAt: new Date().toISOString(),
      };
      state.customerBalances.push(balRecord);
    }

    if (type === 'you_gave') {
      balRecord.balance += numericAmount;
    } else {
      balRecord.balance -= numericAmount;
    }
    balRecord.version += 1;
    balRecord.updatedAt = new Date().toISOString();
    currentBal = balRecord.balance;

    const cust = state.customers.find((c) => c.id === partyId);
    if (cust) {
      cust.lastActive = 'Today · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } else {
    // Supplier
    let balRecord = state.supplierBalances.find(
      (b) => b.supplierId === partyId && b.currencyCode === currencyCode
    );
    if (!balRecord) {
      balRecord = {
        id: `supbal_${partyId}_${currencyCode.toLowerCase()}`,
        businessId: state.currentBusiness.id,
        supplierId: partyId,
        currencyCode,
        balance: 0,
        version: 1,
        updatedAt: new Date().toISOString(),
      };
      state.supplierBalances.push(balRecord);
    }
    if (type === 'you_gave') {
      balRecord.balance -= numericAmount;
    } else {
      balRecord.balance += numericAmount;
    }
    balRecord.version += 1;
    balRecord.updatedAt = new Date().toISOString();
    currentBal = balRecord.balance;
  }

  // Create immutable ledger entry in the selected currency with Supabase Storage attachment support
  const newEntry = {
    id: `ledg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    businessId: state.currentBusiness.id,
    partyType,
    partyId,
    type,
    amount: numericAmount,
    currencyCode,
    runningBalance: currentBal,
    description: description.trim(),
    billNo: billNo.trim(),
    paymentMethod,
    transactionDate,
    hasAttachment: Boolean(hasAttachment || attachmentUrl),
    attachmentUrl: attachmentUrl || null,
    attachmentName: attachmentName || null,
    attachmentType: attachmentType || null,
    attachmentProvider: attachmentProvider || (attachmentUrl ? 'supabase' : null),
    audioNoteUrl,
    idempotencyKey: idempotencyKey || `auto_${Date.now()}`,
    createdBy,
    status: 'posted',
  };

  state.ledgerEntries.unshift(newEntry);

  state.auditLogs.unshift({
    id: `audit_${Date.now()}`,
    businessId: state.currentBusiness.id,
    actorName: createdBy,
    actorEmail: state.currentUser.email,
    action: 'POST_LEDGER_ENTRY',
    entityType: 'ledger_entry',
    entityId: newEntry.id,
    details: `${type === 'you_gave' ? 'You Gave' : 'You Got'} ${currencyCode} ${numericAmount} for ${partyType} ${partyId}`,
    timestamp: new Date().toISOString(),
  });

  saveDatabaseState(state);
  return { success: true, entry: newEntry };
}

/**
 * Add a new customer or supplier with opening balance and clear direction
 */
export function addParty({
  type = 'customer',
  name,
  phone = '',
  address = '',
  notes = '',
  openingBalance = 0,
  balanceType = 'you_will_get',
  currencyCode = 'PKR',
}) {
  const state = getDatabaseState();
  const trimmedName = name.trim();
  if (!trimmedName) return { success: false, error: 'Name is required' };

  const id = `${type === 'customer' ? 'cust' : 'sup'}_${Date.now()}`;
  const now = new Date().toISOString();
  const timeFormatted = 'Today · ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newParty = {
    id,
    businessId: state.currentBusiness.id,
    name: trimmedName,
    phone: phone.trim(),
    address: address.trim(),
    notes: notes.trim(),
    status: 'active',
    createdAt: now,
    lastActive: timeFormatted,
  };

  if (type === 'customer') {
    state.customers.unshift(newParty);
    const initialBal = parseFloat(openingBalance) || 0;
    const finalBal = balanceType === 'you_will_get' ? initialBal : -initialBal;

    state.customerBalances.push({
      id: `bal_${id}_${currencyCode.toLowerCase()}`,
      businessId: state.currentBusiness.id,
      customerId: id,
      currencyCode,
      balance: finalBal,
      version: 1,
      updatedAt: now,
    });

    if (initialBal > 0) {
      state.ledgerEntries.unshift({
        id: `ledg_open_${Date.now()}`,
        businessId: state.currentBusiness.id,
        partyType: 'customer',
        partyId: id,
        type: balanceType === 'you_will_get' ? 'you_gave' : 'you_got',
        amount: initialBal,
        currencyCode,
        runningBalance: finalBal,
        description: 'Opening Balance',
        billNo: '',
        paymentMethod: 'party',
        transactionDate: now,
        hasAttachment: false,
        createdBy: state.currentUser.fullName,
        status: 'posted',
      });
    }
  } else {
    state.suppliers.unshift(newParty);
    const initialBal = parseFloat(openingBalance) || 0;
    const finalBal = balanceType === 'you_will_give' ? initialBal : -initialBal;

    state.supplierBalances.push({
      id: `supbal_${id}_${currencyCode.toLowerCase()}`,
      businessId: state.currentBusiness.id,
      supplierId: id,
      currencyCode,
      balance: finalBal,
      version: 1,
      updatedAt: now,
    });
  }

  saveDatabaseState(state);
  return { success: true, party: newParty };
}

/**
 * Functional Bank Operations
 */
export function addBankAccount({ bankName, accountTitle, accountNumber, initialBalance = 0, currencyCode = 'PKR' }) {
  const state = getDatabaseState();
  if (!bankName || !accountNumber) {
    return { success: false, error: 'Bank Name and Account Number are required.' };
  }

  const id = `bank_${Date.now()}`;
  const numBal = parseFloat(initialBalance) || 0;

  const newAccount = {
    id,
    businessId: state.currentBusiness.id,
    bankName: bankName.trim(),
    accountTitle: accountTitle ? accountTitle.trim() : state.currentBusiness.name,
    accountNumber: accountNumber.trim(),
    currencyCode,
    balance: numBal,
    createdAt: new Date().toISOString(),
  };

  state.bankAccounts.push(newAccount);

  if (numBal > 0) {
    state.bankTransactions.unshift({
      id: `bt_${Date.now()}`,
      bankAccountId: id,
      type: 'deposit',
      amount: numBal,
      currencyCode,
      description: 'Opening Account Balance',
      reference: 'INIT',
      runningBalance: numBal,
      date: new Date().toISOString(),
    });
  }

  saveDatabaseState(state);
  return { success: true, account: newAccount };
}

export function recordBankTransaction({ bankAccountId, type, amount, description = '', reference = '' }) {
  const state = getDatabaseState();
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return { success: false, error: 'Enter a valid positive amount.' };
  }

  const account = state.bankAccounts.find((b) => b.id === bankAccountId);
  if (!account) {
    return { success: false, error: 'Bank account not found.' };
  }

  if (type === 'deposit') {
    account.balance += numAmount;
  } else {
    if (account.balance < numAmount) {
      return { success: false, error: `Insufficient bank balance. Available: ${account.currencyCode} ${account.balance.toLocaleString()}` };
    }
    account.balance -= numAmount;
  }

  const newTx = {
    id: `bt_${Date.now()}`,
    bankAccountId,
    type,
    amount: numAmount,
    currencyCode: account.currencyCode,
    description: description.trim() || (type === 'deposit' ? 'Cash Deposit' : 'Bank Withdrawal'),
    reference: reference.trim(),
    runningBalance: account.balance,
    date: new Date().toISOString(),
  };

  state.bankTransactions.unshift(newTx);
  saveDatabaseState(state);
  return { success: true, transaction: newTx };
}

/**
 * Add a direct team member with generated password (Section 5B)
 */
export function addTeamMember({ fullName, email, role }) {
  const state = getDatabaseState();
  if (!email || !fullName) return { success: false, error: 'Name and email are required' };

  if (state.teamMembers.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'A team member with this email already exists.' };
  }

  const generatedPassword = generateSecurePassword();
  const id = `usr_member_${Date.now()}`;
  const now = new Date().toISOString();

  const newMember = {
    id,
    fullName: fullName.trim(),
    email: email.trim(),
    role: role || 'staff',
    status: 'active',
    businessId: state.currentBusiness.id,
    createdAt: now,
    mustChangePassword: true,
  };

  state.teamMembers.push(newMember);
  saveDatabaseState(state);
  return { success: true, member: newMember, generatedPassword };
}

/**
 * Record a business expense
 */
export function addExpense({
  category,
  amount,
  currencyCode = 'PKR',
  description = '',
  billNo = '',
  paymentMethod = 'Cash',
  attachmentUrl = null,
  attachmentName = null,
  attachmentType = null,
  attachmentProvider = null,
}) {
  const state = getDatabaseState();
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return { success: false, error: 'Valid amount is required' };

  const id = `exp_${Date.now()}`;
  const now = new Date().toISOString();

  const newExp = {
    id,
    businessId: state.currentBusiness.id,
    category,
    amount: num,
    currencyCode,
    description: description.trim(),
    billNo: billNo.trim(),
    paymentMethod,
    attachmentUrl: attachmentUrl || null,
    attachmentName: attachmentName || null,
    attachmentType: attachmentType || null,
    attachmentProvider: attachmentProvider || (attachmentUrl ? 'supabase' : null),
    date: now,
    createdBy: state.currentUser.fullName,
  };

  state.expenses.unshift(newExp);
  saveDatabaseState(state);
  return { success: true, expense: newExp };
}

/**
 * Update current business profile, contact details, currency, and company logo
 */
export function updateBusinessProfile({ name, phone, address, currency, logoUrl }) {
  const state = getDatabaseState();
  if (!state.currentBusiness) {
    state.currentBusiness = { ...INITIAL_DATA.currentBusiness };
  }
  if (name !== undefined) state.currentBusiness.name = name.trim();
  if (phone !== undefined) state.currentBusiness.phone = phone.trim();
  if (address !== undefined) state.currentBusiness.address = address.trim();
  if (currency !== undefined) state.currentBusiness.currency = currency;
  if (logoUrl !== undefined) state.currentBusiness.logoUrl = logoUrl;

  saveDatabaseState(state);
  return { success: true, business: state.currentBusiness };
}


// ---------------- Supabase-backed workspace operations ----------------
export function createEmptyWorkspaceState() {
  return {
    currentBusiness: null, currentUser: null, teamMembers: [], customers: [], suppliers: [],
    customerBalances: [], supplierBalances: [], bankAccounts: [], bankTransactions: [],
    ledgerEntries: [], expenses: [], stockSummary: { availableStock: 0, stockValue: 0, bestSeller: '' },
    cashSummary: { cashInHand: 0, bankBalance: 0 }, auditLogs: [],
  };
}

const requireSupabase = () => {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart Vite.');
};

const mapBusiness = (b) => b ? ({
  id: b.id, name: b.name, phone: b.phone || '', address: b.address || '',
  currency: b.default_currency || 'PKR', logoUrl: b.logo_url || null,
  createdAt: b.created_at, ownerId: b.owner_id || null,
}) : null;
const mapParty = (p) => ({
  id: p.id, businessId: p.business_id, name: p.name, phone: p.phone || '',
  address: p.address || '', notes: p.notes || '', status: p.status || 'active',
  createdAt: p.created_at, lastActive: p.updated_at || p.created_at,
});
const mapBalance = (b, type) => ({
  id: b.id, businessId: b.business_id,
  ...(type === 'customer' ? { customerId: b.customer_id } : { supplierId: b.supplier_id }),
  currencyCode: b.currency_code, balance: Number(b.balance || 0),
  version: Number(b.version || 1), updatedAt: b.updated_at,
});
const mapLedger = (e) => ({
  id: e.id, businessId: e.business_id, partyType: e.party_type, partyId: e.party_id,
  type: e.type, amount: Number(e.amount), currencyCode: e.currency_code,
  runningBalance: Number(e.running_balance), description: e.description || '',
  billNo: e.bill_no || '', paymentMethod: e.payment_method || 'cash',
  transactionDate: e.transaction_date, hasAttachment: Boolean(e.attachment_keys?.length || e.audio_note_key),
  attachmentUrl: null, attachmentName: null, attachmentType: null,
  audioNoteUrl: null, idempotencyKey: e.idempotency_key, createdBy: e.created_by || '',
  status: e.status || 'posted',
});
const mapExpense = (e) => ({
  id: e.id, businessId: e.business_id, category: e.category, amount: Number(e.amount),
  currencyCode: e.currency_code, description: e.description || '', billNo: e.bill_no || '',
  paymentMethod: e.payment_method || 'Cash', date: e.date, attachmentUrl: null,
  createdBy: e.created_by || '',
});

export async function loadWorkspaceState(authUser) {
  requireSupabase();
  if (!authUser?.id) throw new Error('A valid Supabase session is required.');
  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('*').eq('id', authUser.id).maybeSingle();
  if (profileError) throw profileError;

  const { data: membership, error: membershipError } = await supabase
    .from('account_members').select('business_id,role,status')
    .eq('user_id', authUser.id).eq('status', 'active').limit(1).maybeSingle();
  if (membershipError) throw membershipError;
  console.log('membership',membership,authUser?.id)
  const state = createEmptyWorkspaceState();
  state.currentUser = {
    id: authUser.id, fullName: profile?.full_name || authUser.user_metadata?.full_name || '',
    email: authUser.email || '', role: membership?.role || 'owner',
    businessId: membership?.business_id || null,
  };

  if (!membership?.business_id) {
    saveDatabaseState(state);
    return { state, needsBusiness: true };
  }

  const businessId = membership.business_id;
  const { data: business, error: businessError } = await supabase
    .from('business_accounts').select('*').eq('id', businessId).single();
  if (businessError) throw businessError;
  state.currentBusiness = mapBusiness(business);

  const queries = await Promise.all([
    supabase.from('account_members').select('id,business_id,user_id,role,status,created_at').eq('business_id', businessId),
    supabase.from('customers').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase.from('suppliers').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase.from('customer_balances').select('*').eq('business_id', businessId),
    supabase.from('supplier_balances').select('*').eq('business_id', businessId),
    supabase.from('ledger_entries').select('*').eq('business_id', businessId).order('transaction_date', { ascending: false }),
    supabase.from('expenses').select('*').eq('business_id', businessId).order('date', { ascending: false }),
    supabase.from('audit_logs').select('*').eq('business_id', businessId).order('timestamp', { ascending: false }).limit(500),
    supabase.from('bank_accounts').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase.from('bank_transactions').select('*').eq('business_id', businessId).order('transaction_date', { ascending: false }),
  ]);
  const labels = ['members','customers','suppliers','customerBalances','supplierBalances','ledgerEntries','expenses','auditLogs','bankAccounts','bankTransactions'];
  const result = {};
  queries.forEach((q, i) => {
    if (q.error) throw new Error(`${labels[i]}: ${q.error.message}`);
    result[labels[i]] = q.data || [];
  });

  // Fetch member profiles separately; profile visibility is limited to self by default.
  const memberIds = result.members.map((m) => m.user_id);
  let memberProfiles = [];
  if (memberIds.length) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles').select('id,email,full_name').in('id', memberIds);
    if (profilesError) throw profilesError;
    memberProfiles = profilesData || [];
  }
  if (!memberProfiles.some((item) => item.id === authUser.id)) {
    memberProfiles.push({
      id: authUser.id, email: authUser.email,
      full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
    });
  }
  state.teamMembers = result.members.map((m) => {
    const p = memberProfiles.find((item) => item.id === m.user_id);
    return { id: m.user_id, memberId: m.id, fullName: p?.full_name || (m.user_id === authUser.id ? state.currentUser.fullName : 'Team member'),
      email: p?.email || '', role: m.role, status: m.status, businessId: m.business_id, createdAt: m.created_at };
  });
  state.customers = result.customers.map(mapParty);
  state.suppliers = result.suppliers.map(mapParty);
  state.customerBalances = result.customerBalances.map((b) => mapBalance(b, 'customer'));
  state.supplierBalances = result.supplierBalances.map((b) => mapBalance(b, 'supplier'));
  state.ledgerEntries = result.ledgerEntries.map(mapLedger);
  state.expenses = result.expenses.map(mapExpense);
  state.auditLogs = result.auditLogs.map((a) => ({
    id: a.id, businessId: a.business_id, actorName: a.actor_email || '',
    actorEmail: a.actor_email || '', action: a.action, entityType: a.entity_type,
    entityId: a.entity_id, details: a.details || '', timestamp: a.timestamp,
  }));
  state.bankAccounts = result.bankAccounts.map((b) => ({
    id: b.id, businessId: b.business_id, bankName: b.bank_name, accountTitle: b.account_title || '',
    accountNumber: b.account_number, currencyCode: b.currency_code, balance: Number(b.balance || 0), createdAt: b.created_at,
  }));
  state.bankTransactions = result.bankTransactions.map((b) => ({
    id: b.id, bankAccountId: b.bank_account_id, type: b.type, amount: Number(b.amount),
    currencyCode: b.currency_code, description: b.description || '', reference: b.reference || '',
    runningBalance: Number(b.running_balance), date: b.transaction_date,
  }));
  state.cashSummary = {
    cashInHand: 0,
    bankBalance: state.bankAccounts.filter((b) => b.currencyCode === state.currentBusiness.currency)
      .reduce((sum, b) => sum + b.balance, 0),
  };
  saveDatabaseState(state);
  return { state, needsBusiness: false };
}

export async function createBusinessAccount({ name, phone = '', address = '', currency = 'PKR', logoUrl = null }) {
  requireSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) throw new Error('Please sign in again before creating your business.');
  const { data, error } = await supabase.rpc('create_business_for_current_user', {
    p_name: name.trim(), p_phone: phone || null, p_address: address || null,
    p_currency: currency, p_logo_url: logoUrl || null,
  });
  if (error) throw error;
  const loaded = await loadWorkspaceState(authData.user);
  return { business: mapBusiness(data), ...loaded };
}

export async function addPartyRemote(args) {
  requireSupabase();
  const state = getDatabaseState();
  if (!state.currentBusiness?.id) return { success: false, error: 'Business is not loaded.' };
  try {
    const { data, error } = await supabase.rpc('create_party_with_opening_balance', {
      p_business_id: state.currentBusiness.id, p_party_type: args.type || 'customer',
      p_name: args.name, p_phone: args.phone || null, p_address: args.address || null,
      p_notes: args.notes || null, p_opening_balance: Number(args.openingBalance || 0),
      p_balance_type: args.balanceType || 'you_will_get', p_currency_code: args.currencyCode || 'PKR',
    });
    if (error) throw error;
    const { data: authData } = await supabase.auth.getUser();
    await loadWorkspaceState(authData.user);
    const latest = getDatabaseState();
    const party = (args.type === 'supplier' ? latest.suppliers : latest.customers).find((p) => p.id === data.id);
    return { success: true, party };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to save party.' };
  }
}

export async function postLedgerTransactionRemote(args) {
  requireSupabase();
  const state = getDatabaseState();
  if (!state.currentBusiness?.id) return { success: false, error: 'Business is not loaded.' };
  try {
    const { data, error } = await supabase.rpc('post_ledger_transaction', {
      p_business_id: state.currentBusiness.id, p_party_type: args.partyType || 'customer',
      p_party_id: args.partyId, p_type: args.type, p_amount: Number(args.amount),
      p_currency_code: args.currencyCode || 'PKR', p_description: args.description || '',
      p_bill_no: args.billNo || '', p_payment_method: args.paymentMethod || 'cash',
      p_transaction_date: args.transactionDate || new Date().toISOString(),
      p_idempotency_key: args.idempotencyKey || crypto.randomUUID(),
    });
    if (error) throw error;
    const { data: authData } = await supabase.auth.getUser();
    await loadWorkspaceState(authData.user);
    return { success: true, entry: mapLedger(data) };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to save transaction.' };
  }
}

export async function addExpenseRemote(args) {
  requireSupabase();
  const state = getDatabaseState();
  if (!state.currentBusiness?.id) return { success: false, error: 'Business is not loaded.' };
  try {
    const { data: authData } = await supabase.auth.getUser();
    const payload = {
      business_id: state.currentBusiness.id, category: args.category,
      amount: Number(args.amount), currency_code: args.currencyCode || 'PKR',
      description: args.description || null, bill_no: args.billNo || null,
      payment_method: args.paymentMethod || 'Cash', created_by: authData?.user?.id,
    };
    const { error } = await supabase.from('expenses').insert(payload);
    if (error) throw error;
    await loadWorkspaceState(authData.user);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to save expense.' };
  }
}

export async function updateBusinessProfileRemote(args) {
  requireSupabase();
  const state = getDatabaseState();
  if (!state.currentBusiness?.id) return { success: false, error: 'Business is not loaded.' };
  try {
    const patch = { updated_at: new Date().toISOString() };
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.phone !== undefined) patch.phone = args.phone.trim() || null;
    if (args.address !== undefined) patch.address = args.address.trim() || null;
    if (args.currency !== undefined) patch.default_currency = args.currency;
    if (args.logoUrl !== undefined) patch.logo_url = args.logoUrl || null;
    const { data: updated, error } = await supabase.from('business_accounts')
      .update(patch).eq('id', state.currentBusiness.id).select('id').maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error('Only the business owner can update business settings.');
    const { data: authData } = await supabase.auth.getUser();
    await loadWorkspaceState(authData.user);
    return { success: true, business: getDatabaseState().currentBusiness };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to update business.' };
  }
}

export async function addBankAccountRemote(args) {
  requireSupabase();
  const state = getDatabaseState();
  if (!state.currentBusiness?.id) return { success: false, error: 'Business is not loaded.' };
  try {
    const { data: authData } = await supabase.auth.getUser();
    const initial = Number(args.initialBalance || 0);
    const { error } = await supabase.from('bank_accounts').insert({
      business_id: state.currentBusiness.id, bank_name: args.bankName.trim(),
      account_title: (args.accountTitle || state.currentBusiness.name).trim(),
      account_number: args.accountNumber.trim(), currency_code: args.currencyCode || 'PKR',
      balance: initial, created_by: authData?.user?.id,
    });
    if (error) throw error;
    await loadWorkspaceState(authData.user);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to add bank account.' };
  }
}

export async function recordBankTransactionRemote(args) {
  requireSupabase();
  const state = getDatabaseState();
  const account = state.bankAccounts.find((b) => b.id === args.bankAccountId);
  if (!account) return { success: false, error: 'Bank account not found.' };
  const amount = Number(args.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Enter a valid positive amount.' };
  try {
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc('record_bank_transaction', {
      p_business_id: state.currentBusiness.id, p_bank_account_id: args.bankAccountId,
      p_type: args.type, p_amount: amount, p_description: args.description || '',
      p_reference: args.reference || '', p_idempotency_key: crypto.randomUUID(),
    });
    if (error) throw error;
    await loadWorkspaceState(authData.user);
    return { success: true, transaction: data };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to record bank transaction.' };
  }
}


export async function inviteTeamMemberRemote({ fullName, email, role }) {
  requireSupabase();
  const state = getDatabaseState();
  if (!state.currentBusiness?.id) return { success: false, error: 'Business is not loaded.' };
  try {
    const { data, error } = await supabase.functions.invoke('invite-team-member', {
      body: { fullName: fullName.trim(), email: email.trim(), role, businessId: state.currentBusiness.id },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const { data: authData } = await supabase.auth.getUser();
    await loadWorkspaceState(authData.user);
    return { success: true, member: { email: email.trim() }, message: data?.message || 'Invitation sent.' };
  } catch (error) {
    return { success: false, error: error.message || 'Unable to invite team member.' };
  }
}

export async function createTeamMemberRemote(payload) {
  const { data: authData } = await supabase.auth.getUser();
  const loaded = await loadWorkspaceState(authData.user);
  console.log('loaded',loaded)
  const business_id = loaded?.state?.currentUser?.businessId || '';
  const { data, error } = await supabase.functions.invoke(
    "create-team-member",
    { body: {...payload,business_id} }
  );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to create team member",
    };
  }

  return data;
}


export async function removeTeamMemberRemote(userId) {
  requireSupabase();
  const state = getDatabaseState();
  if (!state.currentBusiness?.id) return { success: false, error: 'Business is not loaded.' };
  if (userId === state.currentUser?.id) return { success: false, error: 'You cannot remove your own membership.' };
  try {
    const { data: updated, error } = await supabase.from('account_members')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('business_id', state.currentBusiness.id).eq('user_id', userId).select('id').maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error('Member not found or you do not have permission to revoke access.');
    const { data: authData } = await supabase.auth.getUser();
    await loadWorkspaceState(authData.user);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Unable to remove team member.' };
  }
}

export async function sendPasswordResetForTeamMember(email) {
  requireSupabase();
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Unable to send password reset email.' };
  }
}


export async function archivePartyRemote(partyId, type) {
  requireSupabase();
  const state = getDatabaseState();
  if (!state.currentBusiness?.id) return { success: false, error: 'Business is not loaded.' };
  try {
    const table = type === 'supplier' ? 'suppliers' : 'customers';
    const { data: updated, error } = await supabase.from(table)
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', partyId).eq('business_id', state.currentBusiness.id).select('id').maybeSingle();
    if (error) throw error;
    if (!updated) throw new Error('Record not found or you do not have permission to archive it.');
    const { data: authData } = await supabase.auth.getUser();
    await loadWorkspaceState(authData.user);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Unable to archive party.' };
  }
}
