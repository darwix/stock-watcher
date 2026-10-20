-- one row per signed-in user; data mirrors the guest localStorage keys
create table if not exists portfolios (
	user_id text primary key,
	data jsonb not null,
	updated_at timestamptz not null default now()
);
