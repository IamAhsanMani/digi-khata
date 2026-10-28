-- DigiKhata production schema v1
-- Run this migration in Supabase SQL Editor. Client apps must use only the anon/publishable key.
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

do $$ begin
  create type public.member_role as enum ('owner','manager','accountant','staff','read_only');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.member_status as enum ('active','suspended','revoked');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.ledger_transaction_type as enum ('you_gave','you_got','adjustment','reversal');
exception when duplicate_object then null; end $$;

create table if not exists public.business_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_currency varchar(3) not null default 'PKR',
  phone text,
  address text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);
create table if not exists public.account_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'staff',
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id,user_id)
);
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  name text not null, phone text, address text, notes text,
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.suppliers (like public.customers including defaults including constraints);
-- The CREATE TABLE LIKE above copies columns but not primary-key indexes or foreign keys;
-- add those only when absent so rerunning the migration does not break dependent FKs.
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.suppliers'::regclass and contype='p') then
    alter table public.suppliers add primary key (id);
  end if;
end $$;
do $$ begin
  alter table public.suppliers add constraint suppliers_business_id_fkey foreign key (business_id) references public.business_accounts(id) on delete cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.suppliers add constraint suppliers_created_by_fkey foreign key (created_by) references public.profiles(id);
exception when duplicate_object then null; end $$;

create table if not exists public.customer_balances (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  currency_code varchar(3) not null,
  balance numeric(16,2) not null default 0,
  version bigint not null default 1, updated_at timestamptz not null default now(),
  unique(business_id,customer_id,currency_code)
);
create table if not exists public.supplier_balances (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  currency_code varchar(3) not null,
  balance numeric(16,2) not null default 0,
  version bigint not null default 1, updated_at timestamptz not null default now(),
  unique(business_id,supplier_id,currency_code)
);
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  party_type text not null check (party_type in ('customer','supplier')),
  party_id uuid not null,
  type public.ledger_transaction_type not null,
  amount numeric(16,2) not null check (amount > 0),
  currency_code varchar(3) not null,
  running_balance numeric(16,2) not null,
  description text, bill_no text, payment_method text not null default 'cash',
  transaction_date timestamptz not null default now(),
  attachment_keys text[], audio_note_key text,
  idempotency_key text not null,
  created_by uuid references public.profiles(id),
  status text not null default 'posted' check(status in ('posted','reversed')),
  created_at timestamptz not null default now(),
  unique(business_id,idempotency_key)
);
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  category text not null, amount numeric(16,2) not null check(amount > 0),
  currency_code varchar(3) not null, description text, bill_no text,
  payment_method text not null default 'Cash', date timestamptz not null default now(),
  attachment_key text, created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  actor_id uuid references public.profiles(id), actor_email text,
  action text not null, entity_type text not null, entity_id text not null,
  details text, "timestamp" timestamptz not null default now()
);
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  bank_name text not null, account_title text, account_number text not null,
  currency_code varchar(3) not null default 'PKR',
  balance numeric(16,2) not null default 0 check(balance >= 0),
  created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  type text not null check(type in ('deposit','withdrawal','transfer')),
  amount numeric(16,2) not null check(amount > 0),
  currency_code varchar(3) not null, description text, reference text,
  running_balance numeric(16,2) not null, transaction_date timestamptz not null default now(),
  created_by uuid references public.profiles(id), idempotency_key text not null,
  unique(business_id,idempotency_key)
);

create index if not exists idx_members_user_status on public.account_members(user_id,status);
create index if not exists idx_customers_business_status on public.customers(business_id,status);
create index if not exists idx_suppliers_business_status on public.suppliers(business_id,status);
create index if not exists idx_ledger_business_party_date on public.ledger_entries(business_id,party_id,transaction_date desc);
create index if not exists idx_expenses_business_date on public.expenses(business_id,date desc);
create index if not exists idx_audit_business_timestamp on public.audit_logs(business_id,"timestamp" desc);
create index if not exists idx_bank_tx_business_date on public.bank_transactions(business_id,transaction_date desc);

create or replace function public.is_member_of_business(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select exists (
    select 1 from public.account_members m
    where m.business_id = target_business_id
      and m.user_id = auth.uid() and m.status = 'active'
  );
$$;
revoke all on function public.is_member_of_business(uuid) from public;
grant execute on function public.is_member_of_business(uuid) to authenticated;

create or replace function public.can_write_business(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select exists (
    select 1 from public.account_members m
    where m.business_id=target_business_id and m.user_id=auth.uid()
      and m.status='active' and m.role in ('owner','manager','accountant','staff')
  );
$$;
revoke all on function public.can_write_business(uuid) from public;
grant execute on function public.can_write_business(uuid) to authenticated;

-- Keep the profile row in sync with Supabase Auth.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
begin
  insert into public.profiles(id,email,full_name)
  values (new.id, coalesce(new.email,''), coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do update set email=excluded.email,
    full_name=coalesce(nullif(excluded.full_name,''),public.profiles.full_name);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_digikhata on auth.users;
create trigger on_auth_user_created_digikhata after insert or update of email, raw_user_meta_data on auth.users
for each row execute procedure public.handle_new_auth_user();

-- Atomic creation of a tenant and its owner membership.
create or replace function public.create_business_for_current_user(
  p_name text, p_phone text default null, p_address text default null,
  p_currency varchar default 'PKR', p_logo_url text default null
) returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare v_user uuid := auth.uid(); v_business public.business_accounts;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Business name is required'; end if;
  if exists(select 1 from public.account_members where user_id=v_user and status='active') then
    raise exception 'This user already belongs to an active business';
  end if;
  insert into public.profiles(id,email,full_name)
  select id,coalesce(email,''),coalesce(raw_user_meta_data->>'full_name','')
  from auth.users where id=v_user
  on conflict(id) do nothing;
  insert into public.business_accounts(name,phone,address,default_currency,logo_url)
  values(trim(p_name),nullif(trim(p_phone),''),nullif(trim(p_address),''),upper(coalesce(nullif(p_currency,''),'PKR')),p_logo_url)
  returning * into v_business;
  insert into public.account_members(business_id,user_id,role,status)
  values(v_business.id,v_user,'owner','active');
  return to_jsonb(v_business);
end;
$$;
revoke all on function public.create_business_for_current_user(text,text,text,varchar,text) from public, anon;
grant execute on function public.create_business_for_current_user(text,text,text,varchar,text) to authenticated;

-- Create a party and opening balance atomically.
create or replace function public.create_party_with_opening_balance(
  p_business_id uuid, p_party_type text, p_name text, p_phone text default null,
  p_address text default null, p_notes text default null, p_opening_balance numeric default 0,
  p_balance_type text default 'you_will_get', p_currency_code varchar default 'PKR'
) returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare v_id uuid; v_balance numeric(16,2) := coalesce(p_opening_balance,0); v_final numeric(16,2);
begin
  if not public.can_write_business(p_business_id) then raise exception 'Business write access denied'; end if;
  if p_party_type not in ('customer','supplier') then raise exception 'Invalid party type'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Name is required'; end if;
  if v_balance < 0 then raise exception 'Opening balance cannot be negative'; end if;
  if p_party_type='customer' then
    v_final := case when p_balance_type='you_will_get' then v_balance else -v_balance end;
    insert into public.customers(business_id,name,phone,address,notes,created_by)
    values(p_business_id,trim(p_name),nullif(trim(p_phone),''),nullif(trim(p_address),''),nullif(trim(p_notes),''),auth.uid())
    returning id into v_id;
    insert into public.customer_balances(business_id,customer_id,currency_code,balance)
    values(p_business_id,v_id,upper(p_currency_code),v_final);
  else
    v_final := case when p_balance_type='you_will_give' then v_balance else -v_balance end;
    insert into public.suppliers(business_id,name,phone,address,notes,created_by)
    values(p_business_id,trim(p_name),nullif(trim(p_phone),''),nullif(trim(p_address),''),nullif(trim(p_notes),''),auth.uid())
    returning id into v_id;
    insert into public.supplier_balances(business_id,supplier_id,currency_code,balance)
    values(p_business_id,v_id,upper(p_currency_code),v_final);
  end if;
  if v_balance > 0 then
    insert into public.ledger_entries(business_id,party_type,party_id,type,amount,currency_code,running_balance,description,payment_method,idempotency_key,created_by)
    values(p_business_id,p_party_type,v_id,
      case when p_party_type='customer' then (case when p_balance_type='you_will_get' then 'you_gave'::public.ledger_transaction_type else 'you_got'::public.ledger_transaction_type end)
           else (case when p_balance_type='you_will_give' then 'you_got'::public.ledger_transaction_type else 'you_gave'::public.ledger_transaction_type end) end,
      v_balance,upper(p_currency_code),v_final,'Opening Balance','party','opening-'||gen_random_uuid()::text,auth.uid());
  end if;
  return jsonb_build_object('id',v_id,'business_id',p_business_id,'party_type',p_party_type,'name',trim(p_name));
end;
$$;
revoke all on function public.create_party_with_opening_balance(uuid,text,text,text,text,text,numeric,text,varchar) from public, anon;
grant execute on function public.create_party_with_opening_balance(uuid,text,text,text,text,text,numeric,text,varchar) to authenticated;

-- Atomic ledger write + balance update. Duplicate idempotency keys return the existing row.
create or replace function public.post_ledger_transaction(
  p_business_id uuid, p_party_type text, p_party_id uuid, p_type text,
  p_amount numeric, p_currency_code varchar default 'PKR', p_description text default '',
  p_bill_no text default '', p_payment_method text default 'cash',
  p_transaction_date timestamptz default now(), p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare v_entry public.ledger_entries; v_balance numeric(16,2); v_party_exists boolean;
begin
  if not public.can_write_business(p_business_id) then raise exception 'Business write access denied'; end if;
  if p_party_type not in ('customer','supplier') then raise exception 'Invalid party type'; end if;
  if p_type not in ('you_gave','you_got','adjustment','reversal') then raise exception 'Invalid transaction type'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if nullif(p_idempotency_key,'') is null then raise exception 'Idempotency key is required'; end if;
  select * into v_entry from public.ledger_entries where business_id=p_business_id and idempotency_key=p_idempotency_key;
  if found then return to_jsonb(v_entry); end if;
  if p_party_type='customer' then
    select exists(select 1 from public.customers where id=p_party_id and business_id=p_business_id) into v_party_exists;
  else
    select exists(select 1 from public.suppliers where id=p_party_id and business_id=p_business_id) into v_party_exists;
  end if;
  if not v_party_exists then raise exception 'Party not found in this business'; end if;
  if p_party_type='customer' then
    insert into public.customer_balances(business_id,customer_id,currency_code,balance)
      values(p_business_id,p_party_id,upper(p_currency_code),0)
      on conflict(business_id,customer_id,currency_code) do nothing;
    update public.customer_balances set
      balance=balance + case when p_type in ('you_gave','adjustment') then p_amount else -p_amount end,
      version=version+1, updated_at=now()
      where business_id=p_business_id and customer_id=p_party_id and currency_code=upper(p_currency_code)
      returning balance into v_balance;
  else
    insert into public.supplier_balances(business_id,supplier_id,currency_code,balance)
      values(p_business_id,p_party_id,upper(p_currency_code),0)
      on conflict(business_id,supplier_id,currency_code) do nothing;
    update public.supplier_balances set
      balance=balance + case when p_type in ('you_got','adjustment') then p_amount else -p_amount end,
      version=version+1, updated_at=now()
      where business_id=p_business_id and supplier_id=p_party_id and currency_code=upper(p_currency_code)
      returning balance into v_balance;
  end if;
  insert into public.ledger_entries(business_id,party_type,party_id,type,amount,currency_code,running_balance,description,bill_no,payment_method,transaction_date,idempotency_key,created_by)
  values(p_business_id,p_party_type,p_party_id,p_type::public.ledger_transaction_type,p_amount,upper(p_currency_code),v_balance,nullif(trim(p_description),''),nullif(trim(p_bill_no),''),coalesce(nullif(p_payment_method,''),'cash'),coalesce(p_transaction_date,now()),p_idempotency_key,auth.uid())
  returning * into v_entry;
  insert into public.audit_logs(business_id,actor_id,actor_email,action,entity_type,entity_id,details)
  values(p_business_id,auth.uid(),(select email from auth.users where id=auth.uid()),'TRANSACTION_POSTED','ledger_entry',v_entry.id::text,coalesce(p_description,''));
  return to_jsonb(v_entry);
end;
$$;
revoke all on function public.post_ledger_transaction(uuid,text,uuid,text,numeric,varchar,text,text,text,timestamptz,text) from public, anon;
grant execute on function public.post_ledger_transaction(uuid,text,uuid,text,numeric,varchar,text,text,text,timestamptz,text) to authenticated;


-- Atomic bank movement + running balance update.
create or replace function public.record_bank_transaction(
  p_business_id uuid, p_bank_account_id uuid, p_type text, p_amount numeric,
  p_description text default '', p_reference text default '', p_idempotency_key text default null
) returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare v_account public.bank_accounts; v_tx public.bank_transactions; v_balance numeric(16,2);
begin
  if not public.can_write_business(p_business_id) then raise exception 'Business write access denied'; end if;
  if p_type not in ('deposit','withdrawal','transfer') then raise exception 'Invalid bank transaction type'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if nullif(p_idempotency_key,'') is null then raise exception 'Idempotency key is required'; end if;
  select * into v_tx from public.bank_transactions where business_id=p_business_id and idempotency_key=p_idempotency_key;
  if found then return to_jsonb(v_tx); end if;
  select * into v_account from public.bank_accounts
    where id=p_bank_account_id and business_id=p_business_id for update;
  if not found then raise exception 'Bank account not found'; end if;
  if p_type='deposit' then v_balance := v_account.balance + p_amount;
  else
    if v_account.balance < p_amount then raise exception 'Insufficient bank balance'; end if;
    v_balance := v_account.balance - p_amount;
  end if;
  update public.bank_accounts set balance=v_balance where id=v_account.id;
  insert into public.bank_transactions(business_id,bank_account_id,type,amount,currency_code,description,reference,running_balance,created_by,idempotency_key)
  values(p_business_id,p_bank_account_id,p_type,p_amount,v_account.currency_code,nullif(trim(p_description),''),nullif(trim(p_reference),''),v_balance,auth.uid(),p_idempotency_key)
  returning * into v_tx;
  insert into public.audit_logs(business_id,actor_id,actor_email,action,entity_type,entity_id,details)
  values(p_business_id,auth.uid(),(select email from auth.users where id=auth.uid()),'BANK_TRANSACTION_POSTED','bank_transaction',v_tx.id::text,coalesce(p_description,''));
  return to_jsonb(v_tx);
end;
$$;
revoke all on function public.record_bank_transaction(uuid,uuid,text,numeric,text,text,text) from public, anon;
grant execute on function public.record_bank_transaction(uuid,uuid,text,numeric,text,text,text) to authenticated;

create or replace function public.is_owner_of_business(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select exists(select 1 from public.account_members m
    where m.business_id=target_business_id and m.user_id=auth.uid()
      and m.role='owner' and m.status='active');
$$;
revoke all on function public.is_owner_of_business(uuid) from public;
grant execute on function public.is_owner_of_business(uuid) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.business_accounts enable row level security;
alter table public.account_members enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.customer_balances enable row level security;
alter table public.supplier_balances enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.expenses enable row level security;
alter table public.audit_logs enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;

-- Recreate policies idempotently.
do $$ declare p record; begin
  for p in select schemaname,tablename,policyname from pg_policies where schemaname='public'
    and tablename in ('profiles','business_accounts','account_members','customers','suppliers','customer_balances','supplier_balances','ledger_entries','expenses','audit_logs','bank_accounts','bank_transactions')
  loop execute format('drop policy if exists %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop;
end $$;

create policy profiles_select_business_members on public.profiles for select to authenticated using (
  id=auth.uid() or exists (
    select 1 from public.account_members m
    where m.user_id=profiles.id and public.is_member_of_business(m.business_id)
  )
);
create policy profiles_update_self on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy businesses_select_member on public.business_accounts for select to authenticated using (public.is_member_of_business(id));
create policy businesses_update_owner on public.business_accounts for update to authenticated using (
  exists(select 1 from public.account_members m where m.business_id=business_accounts.id and m.user_id=auth.uid() and m.role='owner' and m.status='active')
) with check (public.is_member_of_business(id));
create policy members_select_business on public.account_members for select to authenticated using (public.is_member_of_business(business_id));
create policy members_owner_manage on public.account_members for all to authenticated using (
  public.is_owner_of_business(business_id)
) with check (
  public.is_owner_of_business(business_id)
);
create policy customers_select_member on public.customers for select to authenticated using (public.is_member_of_business(business_id));
create policy customers_insert_member on public.customers for insert to authenticated with check (public.can_write_business(business_id));
create policy customers_update_member on public.customers for update to authenticated using (public.can_write_business(business_id)) with check (public.can_write_business(business_id));
create policy suppliers_select_member on public.suppliers for select to authenticated using (public.is_member_of_business(business_id));
create policy suppliers_insert_member on public.suppliers for insert to authenticated with check (public.can_write_business(business_id));
create policy suppliers_update_member on public.suppliers for update to authenticated using (public.can_write_business(business_id)) with check (public.can_write_business(business_id));
create policy customer_balances_select_member on public.customer_balances for select to authenticated using (public.is_member_of_business(business_id));
create policy supplier_balances_select_member on public.supplier_balances for select to authenticated using (public.is_member_of_business(business_id));
create policy ledger_select_member on public.ledger_entries for select to authenticated using (public.is_member_of_business(business_id));
create policy expenses_select_member on public.expenses for select to authenticated using (public.is_member_of_business(business_id));
create policy expenses_insert_member on public.expenses for insert to authenticated with check (public.can_write_business(business_id));
create policy expenses_update_member on public.expenses for update to authenticated using (public.can_write_business(business_id)) with check (public.can_write_business(business_id));
create policy audit_select_member on public.audit_logs for select to authenticated using (public.is_member_of_business(business_id));
create policy bank_accounts_select_member on public.bank_accounts for select to authenticated using (public.is_member_of_business(business_id));
create policy bank_accounts_insert_member on public.bank_accounts for insert to authenticated with check (public.can_write_business(business_id));
create policy bank_tx_select_member on public.bank_transactions for select to authenticated using (public.is_member_of_business(business_id));
create policy bank_tx_insert_member on public.bank_transactions for insert to authenticated with check (public.can_write_business(business_id));

-- Least-privilege grants. RLS controls tenant rows; column grants prevent changing tenant IDs.
revoke all on public.profiles, public.business_accounts, public.account_members, public.customers,
  public.suppliers, public.customer_balances, public.supplier_balances, public.ledger_entries,
  public.expenses, public.audit_logs, public.bank_accounts, public.bank_transactions
  from anon, authenticated;

grant select on public.profiles, public.business_accounts, public.account_members, public.customers,
  public.suppliers, public.customer_balances, public.supplier_balances, public.ledger_entries,
  public.expenses, public.audit_logs, public.bank_accounts, public.bank_transactions to authenticated;

-- Profile rows are created by the auth trigger / security-definer RPC, not by the browser.
grant update(full_name, avatar_url) on public.profiles to authenticated;
grant update(name, phone, address, default_currency, logo_url, updated_at)
  on public.business_accounts to authenticated;
grant update(status, role, updated_at) on public.account_members to authenticated;
grant update(name, phone, address, notes, status, updated_at) on public.customers to authenticated;
grant update(name, phone, address, notes, status, updated_at) on public.suppliers to authenticated;
grant insert on public.expenses to authenticated;
grant update(category, amount, currency_code, description, bill_no, payment_method, date, attachment_key)
  on public.expenses to authenticated;
grant insert on public.bank_accounts to authenticated;
-- Financial balances, ledger rows, audit logs, and bank movements are mutated only by RPCs.
