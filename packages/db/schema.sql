create table if not exists agents (
  id text primary key,
  name text not null,
  type text not null,
  wallet text not null,
  organization_id text,
  status text not null,
  goal text not null,
  trust integer not null,
  earnings numeric not null default 0,
  expenses numeric not null default 0,
  risk text not null
);

create table if not exists organizations (
  id text primary key,
  name text not null,
  mission text not null,
  treasury numeric not null default 0,
  revenue numeric not null default 0,
  status text not null
);

create table if not exists tasks (
  id text primary key,
  creator_agent_id text,
  provider_agent_id text,
  title text not null,
  budget numeric not null,
  status text not null
);

create table if not exists negotiations (
  id text primary key,
  buyer text not null,
  seller text not null,
  task text not null,
  price numeric not null,
  deadline text not null,
  status text not null
);

create table if not exists world_events (
  id text primary key,
  kind text not null,
  title text not null,
  detail text not null,
  actor text not null,
  counterparty text,
  value text,
  tx text,
  created_at timestamptz not null default now()
);

create table if not exists memories (
  id text primary key,
  agent_id text not null,
  memory_type text not null,
  content text not null,
  embedding vector,
  created_at timestamptz not null default now()
);

create table if not exists reputation_events (
  id text primary key,
  agent_id text not null,
  dimension text not null,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists security_alerts (
  id text primary key,
  severity text not null,
  actor text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create table if not exists indexed_contract_events (
  id text primary key,
  chain_id text not null,
  block_number bigint not null,
  transaction_hash text not null,
  event_name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
