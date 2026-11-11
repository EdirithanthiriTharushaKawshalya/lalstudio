-- LAL STUDIO: initial setup for a fresh Supabase project.
-- Run once in the Supabase SQL Editor as the project owner.
-- Do not use tests/bootstrap.sql. All statements commit together or roll back.
begin;
-- 001_studio.sql
-- Apply to a fresh Supabase project. All mutations are server mediated.
set search_path=public,extensions;
create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from admins where user_id=auth.uid()) $$;
create table public.settings(id text primary key default 'studio' check(id='studio'), value jsonb not null default '{}', created_at timestamptz not null default now());
insert into public.settings(value) values ('{"name":"LAL STUDIO","established":1982,"phone":"0782918452","international_phone":"+94 78 291 8452","email":"lalstudio82@gmail.com","address":"Lal Studio, Hatton National Bank, Ambalangoda, Sri Lanka","map_destination":"Lal Studio, Hatton National Bank, Ambalangoda, Sri Lanka","timezone":"Asia/Colombo","currency":"LKR"}');
create table public.portfolio(id uuid primary key default gen_random_uuid(), title text not null, description text not null default '', category text not null, thumbnail text not null, thumbnail_key text, event_date date, facebook_url text not null check(facebook_url ~ '^https://(www\.)?facebook\.com/'), published boolean not null default false, featured boolean not null default false, sort_order integer not null default 0, created_at timestamptz not null default now());
create table public.bookings(id uuid primary key default gen_random_uuid(), reference text unique not null default ('B-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))), name text not null, phone text not null, email text not null, service text not null, starts_at timestamptz not null, ends_at timestamptz not null, venue text not null default '', requirements text not null default '', status text not null default 'Pending' check(status in ('Pending','Confirmed','Completed','Cancelled','Declined')), internal_notes text not null default '', quote numeric(14,2) not null default 0 check(quote>=0), privacy_acknowledged_at timestamptz not null default now(), created_at timestamptz not null default now(), check(ends_at>starts_at));
create table public.equipment(id uuid primary key default gen_random_uuid(), name text not null, category text not null, description text not null default '', accessories text not null default '', thumbnail text, thumbnail_key text, daily_rate numeric(14,2) check(daily_rate>=0), deposit numeric(14,2) check(deposit>=0), published boolean not null default false, created_at timestamptz not null default now());
create table public.equipment_units(id uuid primary key default gen_random_uuid(), equipment_id uuid not null references equipment(id) on delete restrict, code text unique not null, status text not null default 'active' check(status in ('active','maintenance','retired')), condition text not null default '', notes text not null default '', created_at timestamptz not null default now());
create table public.rentals(id uuid primary key default gen_random_uuid(), reference text unique not null default ('R-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))), name text not null, phone text not null, email text not null, address text not null, starts_at timestamptz not null, ends_at timestamptz not null, notes text not null default '', internal_notes text not null default '', pickup_condition text not null default '', return_condition text not null default '', quote numeric(14,2) not null default 0 check(quote>=0), status text not null default 'Pending Review' check(status in ('Pending Review','Approved','Ready for Pickup','Collected','Returned','Rejected','Cancelled')), privacy_acknowledged_at timestamptz not null default now(), created_at timestamptz not null default now(), check(ends_at>starts_at));
create table public.rental_items(id uuid primary key default gen_random_uuid(), rental_id uuid not null references rentals(id) on delete cascade, equipment_id uuid not null references equipment(id), quantity integer not null check(quantity between 1 and 20), unique(rental_id,equipment_id));
create table public.reservations(id uuid primary key default gen_random_uuid(), rental_id uuid not null references rentals(id), unit_id uuid not null references equipment_units(id), period tstzrange not null, released boolean not null default false, created_at timestamptz not null default now(), exclude using gist(unit_id with =, period with &&) where (not released));
create table public.verification_documents(id uuid primary key default gen_random_uuid(), rental_id uuid not null references rentals(id) on delete cascade, kind text not null check(kind in ('id_front','id_back','selfie')), storage_key text unique not null, deleted_at timestamptz, created_at timestamptz not null default now());
create table public.manual_entries(id uuid primary key default gen_random_uuid(), title text not null, starts_at timestamptz not null, ends_at timestamptz not null, kind text not null default 'Appointment' check(kind in ('Appointment','Blocked')), notes text not null default '', created_at timestamptz not null default now(), check(ends_at>starts_at));
create table public.inventory(id uuid primary key default gen_random_uuid(), name text not null, category text not null, sku text unique not null, variant text not null default '', unit text not null default 'pieces', quantity numeric(14,3) not null default 0 check(quantity>=0), reorder_threshold numeric(14,3) not null default 0 check(reorder_threshold>=0), unit_cost numeric(14,2) not null default 0 check(unit_cost>=0), selling_price numeric(14,2) check(selling_price>=0), supplier text not null default '', notes text not null default '', created_at timestamptz not null default now());
create table public.stock_movements(id uuid primary key default gen_random_uuid(), inventory_id uuid not null references inventory(id), quantity numeric(14,3) not null check(quantity<>0), reason text not null check(reason in ('Restock','Usage','Sale','Damage','Adjustment')), notes text not null default '', actor_id uuid not null references admins(user_id), idempotency_key uuid unique not null, created_at timestamptz not null default now());
create table public.financial_transactions(id uuid primary key default gen_random_uuid(), date date not null default current_date, category text not null, kind text not null check(kind in ('Income','Expense','Deposit','Refund')), amount numeric(14,2) not null check(amount>0), description text not null, payment_method text not null, booking_id uuid references bookings(id), rental_id uuid references rentals(id), stock_movement_id uuid references stock_movements(id), reference text not null default '', notes text not null default '', voided boolean not null default false, void_reason text, actor_id uuid not null references admins(user_id), idempotency_key uuid not null unique, created_at timestamptz not null default now(), check(num_nonnulls(booking_id,rental_id)<=1));
create table public.event_galleries(id uuid primary key default gen_random_uuid(), title text not null, description text not null default '', event_date date, client_name text not null, studio_message text not null default '', cover_key text, facebook_url text check(facebook_url is null or facebook_url ~ '^https://(www\.)?facebook\.com/'), drive_url text check(drive_url is null or drive_url ~ '^https://drive\.google\.com/'), token text not null unique default encode(gen_random_bytes(32),'hex'), passcode_hash text, published boolean not null default false, expires_at timestamptz, revoked boolean not null default false, created_at timestamptz not null default now());
create table public.audit_events(id uuid primary key default gen_random_uuid(), actor_id uuid, table_name text not null, record_id text, operation text not null, before_data jsonb, after_data jsonb, created_at timestamptz not null default now());
create table public.rate_limits(key text primary key, window_start timestamptz not null default now(), attempts integer not null default 1);
create index bookings_schedule on public.bookings(starts_at,ends_at,status);
create index rentals_schedule on public.rentals(starts_at,ends_at,status);
create index rental_items_request on public.rental_items(rental_id);
create index units_catalog on public.equipment_units(equipment_id,status);
create index docs_request on public.verification_documents(rental_id);
create index portfolio_public on public.portfolio(published,sort_order);
create index financial_date on public.financial_transactions(date,kind);
create index stock_history on public.stock_movements(inventory_id,created_at);
create index audit_record on public.audit_events(table_name,record_id,created_at);
do $$ declare t text; begin foreach t in array array['admins','settings','portfolio','bookings','equipment','equipment_units','rentals','rental_items','reservations','verification_documents','manual_entries','inventory','stock_movements','financial_transactions','event_galleries','audit_events','rate_limits'] loop execute format('alter table public.%I enable row level security',t); if t <> 'rate_limits' then execute format('create policy staff_read on public.%I for select to authenticated using(public.is_admin())',t); end if; end loop; end $$;
create policy published_work on public.portfolio for select to anon,authenticated using(published);
create policy published_equipment on public.equipment for select to anon,authenticated using(published);
create policy public_settings on public.settings for select to anon,authenticated using(true);
-- No direct writes for browser clients. Privileged credentials remain on the server.
create function public.audit_change() returns trigger language plpgsql security definer set search_path=public as $$
declare b jsonb; a jsonb; begin
 b:=case when TG_OP='INSERT' then null else to_jsonb(old) end; a:=case when TG_OP='DELETE' then null else to_jsonb(new) end;
 -- Do not log identity contents, contact details, gallery tokens, passcodes, or storage paths.
 b:=b - array['token','passcode_hash','cover_key','storage_key','email','phone','address','requirements','notes','internal_notes','name'];
 a:=a - array['token','passcode_hash','cover_key','storage_key','email','phone','address','requirements','notes','internal_notes','name'];
 insert into audit_events(actor_id,table_name,record_id,operation,before_data,after_data) values(nullif(current_setting('app.actor',true),'')::uuid,TG_TABLE_NAME,coalesce(a->>'id',b->>'id'),TG_OP,b,a);
 return coalesce(new,old); end $$;
do $$ declare t text; begin foreach t in array array['settings','portfolio','bookings','rentals','equipment','equipment_units','inventory','stock_movements','financial_transactions','event_galleries','verification_documents','manual_entries'] loop execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_change()',t); end loop; end $$;
create function public.check_actor(actor uuid) returns void language plpgsql security definer set search_path=public as $$ begin if not exists(select 1 from admins where user_id=actor) then raise exception 'Unauthorized'; end if; perform set_config('app.actor',actor::text,true); end $$;
create function public.consume_rate(k text, max_attempts integer, seconds integer) returns boolean language plpgsql security definer set search_path=public as $$ declare n integer; begin
 insert into rate_limits(key) values(k) on conflict(key) do update set attempts=case when rate_limits.window_start<now()-make_interval(secs=>seconds) then 1 else rate_limits.attempts+1 end, window_start=case when rate_limits.window_start<now()-make_interval(secs=>seconds) then now() else rate_limits.window_start end returning attempts into n; return n<=max_attempts; end $$;
create function public.update_booking(actor uuid, record uuid, payload jsonb, acknowledge_overlap boolean default false) returns void language plpgsql security definer set search_path=public as $$
declare b bookings; begin perform check_actor(actor); perform pg_advisory_xact_lock(1982); select * into b from bookings where id=record for update; if not found then raise exception 'Booking not found'; end if;
 b:=jsonb_populate_record(b,payload); if b.ends_at<=b.starts_at then raise exception 'End must follow start'; end if;
 if b.status='Confirmed' and not acknowledge_overlap and (exists(select 1 from bookings where id<>record and status='Confirmed' and tstzrange(starts_at,ends_at,'[)') && tstzrange(b.starts_at,b.ends_at,'[)')) or exists(select 1 from manual_entries where kind='Blocked' and tstzrange(starts_at,ends_at,'[)') && tstzrange(b.starts_at,b.ends_at,'[)'))) then raise exception 'Schedule overlap. Review the calendar and acknowledge the conflict to confirm.'; end if;
 update bookings set starts_at=b.starts_at,ends_at=b.ends_at,status=b.status,internal_notes=b.internal_notes,quote=b.quote,venue=b.venue where id=record; end $$;
create function public.update_rental(actor uuid, record uuid, payload jsonb) returns void language plpgsql security definer set search_path=public as $$
declare r rentals; old_status text; item record; u uuid; picked integer; begin
 perform check_actor(actor); perform pg_advisory_xact_lock(1983); select * into r from rentals where id=record for update; if not found then raise exception 'Rental not found'; end if; old_status:=r.status; r:=jsonb_populate_record(r,payload);
 if r.status<>old_status and not ((old_status='Pending Review' and r.status in ('Approved','Rejected','Cancelled')) or (old_status='Approved' and r.status in ('Ready for Pickup','Cancelled')) or (old_status='Ready for Pickup' and r.status in ('Collected','Cancelled')) or (old_status='Collected' and r.status='Returned')) then raise exception 'Invalid rental status transition'; end if;
 if old_status='Collected' and r.status<>'Returned' and (r.starts_at<>(select starts_at from rentals where id=record)) then raise exception 'Pickup time cannot change after collection'; end if;
 update reservations set released=true where rental_id=record;
 if r.status in ('Approved','Ready for Pickup','Collected') then
  for item in select * from rental_items where rental_id=record order by equipment_id loop picked:=0;
   for u in select eu.id from equipment_units eu where eu.equipment_id=item.equipment_id and eu.status='active' and not exists(select 1 from reservations re join rentals rr on rr.id=re.rental_id where re.unit_id=eu.id and not re.released and (re.period && tstzrange(r.starts_at,r.ends_at,'[)') or (rr.status='Collected' and rr.ends_at<now()))) order by eu.code for update loop
    insert into reservations(rental_id,unit_id,period) values(record,u,tstzrange(r.starts_at,r.ends_at,'[)')); picked:=picked+1; exit when picked=item.quantity;
   end loop; if picked<item.quantity then raise exception 'Not enough available units. Dates were not changed.'; end if;
  end loop;
 end if;
 update rentals set status=r.status,starts_at=r.starts_at,ends_at=r.ends_at,internal_notes=r.internal_notes,pickup_condition=r.pickup_condition,return_condition=r.return_condition,quote=r.quote where id=record; end $$;
create function public.availability(start_time timestamptz,end_time timestamptz) returns table(equipment_id uuid,available bigint) language sql stable security definer set search_path=public as $$ select e.id,count(u.id) from equipment e left join equipment_units u on u.equipment_id=e.id and u.status='active' and not exists(select 1 from reservations re join rentals r on r.id=re.rental_id where re.unit_id=u.id and not re.released and (re.period && tstzrange(start_time,end_time,'[)') or (r.status='Collected' and r.ends_at<now()))) where e.published group by e.id $$;
create function public.move_stock(actor uuid, item uuid, delta numeric, reason_text text, notes_text text, retry_key uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 perform check_actor(actor); perform 1 from inventory where id=item for update; if not found then raise exception 'Stock item not found'; end if;
 if exists(select 1 from stock_movements where idempotency_key=retry_key) then return; end if;
 if delta=0 or (reason_text='Restock' and delta<0) or (reason_text in ('Usage','Sale','Damage') and delta>0) then raise exception 'Movement direction does not match reason'; end if;
 update inventory set quantity=quantity+delta where id=item;
 insert into stock_movements(inventory_id,quantity,reason,notes,actor_id,idempotency_key) values(item,delta,reason_text,notes_text,actor,retry_key); end $$;
create function public.record_payment(actor uuid,payload jsonb,retry_key uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 perform check_actor(actor); insert into financial_transactions(date,category,kind,amount,description,payment_method,booking_id,rental_id,stock_movement_id,reference,notes,actor_id,idempotency_key) values((payload->>'date')::date,payload->>'category',payload->>'kind',(payload->>'amount')::numeric,payload->>'description',payload->>'payment_method',nullif(payload->>'booking_id','')::uuid,nullif(payload->>'rental_id','')::uuid,nullif(payload->>'stock_movement_id','')::uuid,coalesce(payload->>'reference',''),coalesce(payload->>'notes',''),actor,retry_key) on conflict(idempotency_key) do nothing; end $$;
create function public.save_gallery(actor uuid,record uuid,payload jsonb,passcode text,regenerate boolean default false) returns uuid language plpgsql security definer set search_path=public as $$ declare g event_galleries; result uuid; begin
 perform check_actor(actor); if record is null then insert into event_galleries(title,client_name) values(payload->>'title',payload->>'client_name') returning id into record; end if;
 select * into g from event_galleries where id=record for update; g:=jsonb_populate_record(g,payload);
 update event_galleries set title=g.title,description=g.description,event_date=g.event_date,client_name=g.client_name,studio_message=g.studio_message,cover_key=g.cover_key,facebook_url=g.facebook_url,drive_url=g.drive_url,published=g.published,expires_at=g.expires_at,revoked=g.revoked, passcode_hash=case when passcode='__REMOVE__' then null when passcode<>'' then crypt(passcode,gen_salt('bf')) else passcode_hash end, token=case when regenerate then encode(gen_random_bytes(32),'hex') else token end where id=record returning id into result; return result; end $$;
create function public.unlock_gallery(share_token text,passcode text) returns jsonb language plpgsql security definer set search_path=public as $$ declare g event_galleries; begin select * into g from event_galleries where token=share_token and published and not revoked and (expires_at is null or expires_at>now()); if not found then return null; end if; if g.passcode_hash is not null and (passcode is null or crypt(passcode,g.passcode_hash)<>g.passcode_hash) then return null; end if; return to_jsonb(g)-'passcode_hash'-'token'; end $$;
-- Privileged RPCs must never be callable directly by anon/authenticated clients.
do $$ declare f record; begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('check_actor','consume_rate','update_booking','update_rental','availability','move_stock','record_payment','save_gallery','unlock_gallery') loop execute format('revoke all on function %s from public, anon, authenticated',f.signature); execute format('grant execute on function %s to service_role',f.signature); end loop; end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('portfolio','portfolio',true,5242880,array['image/jpeg','image/png','image/webp']),('verification','verification',false,5242880,array['image/jpeg','image/png','image/webp']),('gallery-covers','gallery-covers',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy portfolio_files on storage.objects for select to anon,authenticated using(bucket_id='portfolio');
-- Private storage has no client policies. Signed URLs only after application authorization.


-- 002_rental_intake.sql
create function public.create_rental(payload jsonb,items jsonb,docs jsonb) returns text language plpgsql security definer set search_path=public as $$ declare r uuid; ref text; item jsonb; doc jsonb; begin
 r:=(payload->>'id')::uuid;
 perform pg_advisory_xact_lock(hashtext(r::text));
 select reference into ref from rentals where id=r; if found then return ref; end if;
 insert into rentals(id,name,phone,email,address,starts_at,ends_at,notes) values(r,payload->>'name',payload->>'phone',payload->>'email',payload->>'address',(payload->>'starts_at')::timestamptz,(payload->>'ends_at')::timestamptz,payload->>'notes') returning reference into ref;
 if jsonb_array_length(items)<1 or jsonb_array_length(docs)<>3 then raise exception 'Incomplete request'; end if;
 for item in select * from jsonb_array_elements(items) loop
  if not exists(select 1 from equipment where id=(item->>'equipment_id')::uuid and published) then raise exception 'Unavailable listing'; end if;
  insert into rental_items(rental_id,equipment_id,quantity) values(r,(item->>'equipment_id')::uuid,(item->>'quantity')::integer);
 end loop;
 for doc in select * from jsonb_array_elements(docs) loop insert into verification_documents(rental_id,kind,storage_key) values(r,doc->>'kind',doc->>'storage_key'); end loop;
 return ref; end $$;
revoke all on function public.create_rental(jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_rental(jsonb,jsonb,jsonb) to service_role;


-- 003_admin_operations.sql
create function public.save_record(actor uuid,table_name text,record uuid,payload jsonb) returns void language plpgsql security definer set search_path=public as $$
declare allowed text[]; keys text; vals text; updates text; k text; begin
 perform check_actor(actor);
 allowed:=case table_name when 'portfolio' then array['title','description','category','thumbnail','thumbnail_key','event_date','facebook_url','published','featured','sort_order'] when 'equipment' then array['name','category','description','accessories','thumbnail','thumbnail_key','daily_rate','deposit','published'] when 'equipment_units' then array['equipment_id','code','status','condition','notes'] when 'inventory' then array['name','category','sku','variant','unit','reorder_threshold','unit_cost','selling_price','supplier','notes'] when 'manual_entries' then array['title','starts_at','ends_at','kind','notes'] else null end;
 if allowed is null then raise exception 'Unsupported table'; end if;
 for k in select jsonb_object_keys(payload) loop if not k=any(allowed) then raise exception 'Unsupported field'; end if; end loop;
 if table_name='equipment_units' and payload->>'status'<>'active' and exists(select 1 from reservations where unit_id=record and not released) then raise exception 'Unit has active reservations'; end if;
 select string_agg(format('%I',key),','),string_agg(format('x.%I',key),','),string_agg(format('%I=x.%I',key,key),',') into keys,vals,updates from jsonb_object_keys(payload) key;
 if record is null then execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) x',table_name,keys,vals,table_name) using payload;
 else execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) x where t.id=$2',table_name,updates,table_name) using payload,record; end if;
end $$;
create function public.delete_record(actor uuid,table_name text,record uuid) returns void language plpgsql security definer set search_path=public as $$ begin perform check_actor(actor);if table_name not in ('portfolio','equipment','event_galleries','manual_entries') then raise exception 'Deletion forbidden';end if;execute format('delete from public.%I where id=$1',table_name) using record;end $$;
create function public.set_settings(actor uuid,payload jsonb) returns void language plpgsql security definer set search_path=public as $$ begin perform check_actor(actor);update settings set value=value||payload where id='studio';end $$;
create function public.void_payment(actor uuid,record uuid,reason_text text) returns void language plpgsql security definer set search_path=public as $$ begin perform check_actor(actor);if length(reason_text)<5 then raise exception 'Reason required';end if;update financial_transactions set voided=true,void_reason=reason_text where id=record;end $$;
create function public.delete_document(actor uuid,record uuid) returns void language plpgsql security definer set search_path=public as $$ begin perform check_actor(actor);update verification_documents set deleted_at=now(),storage_key='deleted:'||id::text where id=record;end $$;
do $$ declare f record;begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_record','delete_record','set_settings','void_payment','delete_document') loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);end loop;end $$;


-- 004_hardening.sql
-- Supabase commonly installs pgcrypto in extensions rather than public.
alter function public.save_gallery(uuid,uuid,jsonb,text,boolean) set search_path=public,extensions;
alter function public.unlock_gallery(text,text) set search_path=public,extensions;
create or replace function public.update_rental(actor uuid,record uuid,payload jsonb) returns void language plpgsql security definer set search_path=public as $$
declare r rentals; old_row rentals; item record; u uuid; picked integer; previous_units uuid[]; selected_units uuid[]; begin
 perform check_actor(actor);perform pg_advisory_xact_lock(1983);select * into old_row from rentals where id=record for update;if not found then raise exception 'Rental not found';end if;r:=jsonb_populate_record(old_row,payload);
 if r.status<>old_row.status and not ((old_row.status='Pending Review' and r.status in ('Approved','Rejected','Cancelled')) or (old_row.status='Approved' and r.status in ('Ready for Pickup','Cancelled')) or (old_row.status='Ready for Pickup' and r.status in ('Collected','Cancelled')) or (old_row.status='Collected' and r.status='Returned')) then raise exception 'Invalid rental status transition';end if;
 select array_agg(unit_id) into previous_units from reservations where rental_id=record and not released;
 if payload ? 'assigned_unit_ids' then select array_agg(value::uuid) into selected_units from jsonb_array_elements_text(payload->'assigned_unit_ids');end if;
 if old_row.status='Collected' then if r.starts_at<>old_row.starts_at then raise exception 'Pickup cannot change after collection';end if;if selected_units is not null then raise exception 'Collected units cannot be reassigned';end if;selected_units:=previous_units;end if;
 update reservations set released=true where rental_id=record;
 if r.status in ('Approved','Ready for Pickup','Collected') then
  for item in select * from rental_items where rental_id=record order by equipment_id loop picked:=0;
   for u in select eu.id from equipment_units eu where eu.equipment_id=item.equipment_id and eu.status='active' and (selected_units is null or eu.id=any(selected_units)) and not exists(select 1 from reservations re join rentals rr on rr.id=re.rental_id where re.unit_id=eu.id and not re.released and (re.period && tstzrange(r.starts_at,r.ends_at,'[)') or (rr.status='Collected' and rr.ends_at<now()))) order by (eu.id=any(coalesce(previous_units,array[]::uuid[]))) desc,eu.code for update loop
    insert into reservations(rental_id,unit_id,period) values(record,u,tstzrange(r.starts_at,r.ends_at,'[)'));picked:=picked+1;exit when picked=item.quantity;
   end loop;if picked<item.quantity then raise exception 'Not enough available units. Dates and assignments were not changed.';end if;
  end loop;
  if selected_units is not null and cardinality(selected_units)<>(select count(*) from reservations where rental_id=record and not released) then raise exception 'Assigned units do not match requested quantities';end if;
 end if;
 update rentals set status=r.status,starts_at=r.starts_at,ends_at=r.ends_at,internal_notes=r.internal_notes,pickup_condition=r.pickup_condition,return_condition=r.return_condition,quote=r.quote where id=record;
end $$;
create or replace function public.void_payment(actor uuid,record uuid,reason_text text) returns void language plpgsql security definer set search_path=public as $$declare linked uuid; held numeric;begin
 perform check_actor(actor);perform pg_advisory_xact_lock(1984);if length(reason_text)<5 then raise exception 'Reason required';end if;
 update financial_transactions set voided=true,void_reason=reason_text where id=record returning rental_id into linked;
 if linked is not null then select coalesce(sum(case kind when 'Deposit' then amount when 'Refund' then -amount else 0 end),0) into held from financial_transactions where rental_id=linked and not voided;if held<0 then raise exception 'Void related refunds before voiding their deposit';end if;end if;
end $$;
-- Refundable deposits are liabilities, never earned income. Serialize refunds per ledger.
create or replace function public.record_payment(actor uuid,payload jsonb,retry_key uuid) returns void language plpgsql security definer set search_path=public as $$
declare held numeric; linked uuid;begin
 perform check_actor(actor);perform pg_advisory_xact_lock(1984);
 if exists(select 1 from financial_transactions where idempotency_key=retry_key) then return;end if;
 if payload->>'kind' in ('Deposit','Refund') then
  linked:=nullif(payload->>'rental_id','')::uuid;if linked is null then raise exception 'Deposits and deposit refunds must link to a rental';end if;
  if payload->>'kind'='Refund' then select coalesce(sum(case kind when 'Deposit' then amount when 'Refund' then -amount else 0 end),0) into held from financial_transactions where rental_id=linked and not voided;if held<(payload->>'amount')::numeric then raise exception 'Refund exceeds the refundable deposit held';end if;end if;
 end if;
 insert into financial_transactions(date,category,kind,amount,description,payment_method,booking_id,rental_id,stock_movement_id,reference,notes,actor_id,idempotency_key) values((payload->>'date')::date,payload->>'category',payload->>'kind',(payload->>'amount')::numeric,payload->>'description',payload->>'payment_method',nullif(payload->>'booking_id','')::uuid,nullif(payload->>'rental_id','')::uuid,nullif(payload->>'stock_movement_id','')::uuid,coalesce(payload->>'reference',''),coalesce(payload->>'notes',''),actor,retry_key);
end $$;


-- 005_services.sql
create table public.services(id uuid primary key default gen_random_uuid(),name text not null unique,description text not null default '',price numeric(14,2) check(price>=0),published boolean not null default true,sort_order integer not null default 0,created_at timestamptz not null default now());
insert into public.services(name,description,sort_order) values
('Wedding photography','From the first look to the last dance. Considered photography for your wedding day.',0),
('Event photography','Celebrations, milestones and gatherings, photographed with care.',1),
('Studio portraits','A little time in our studio. A portrait that feels like you.',2),
('Family & individual portraits','The people you love, just as they are. Individual and family sessions.',3),
('Photo printing','Bring your photographs to life with prints you can hold.',4),
('Frames & enlargements','Choose a frame or enlargement to make your photographs part of your home.',5),
('Camera & equipment rentals','Cameras, lenses and accessories for your next creative project.',6);
alter table public.services enable row level security;
create policy published_services on public.services for select to anon,authenticated using(published);
create policy staff_services on public.services for select to authenticated using(public.is_admin());
create trigger audit after insert or update or delete on public.services for each row execute function public.audit_change();
create function public.update_service(actor uuid,record uuid,payload jsonb) returns void language plpgsql security definer set search_path=public as $$begin perform check_actor(actor);update services set description=payload->>'description',price=nullif(payload->>'price','')::numeric,published=(payload->>'published')::boolean where id=record;end$$;
revoke all on function public.update_service(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.update_service(uuid,uuid,jsonb) to service_role;


-- 006_rental_handover.sql
-- Operational steps are independent of optional financial bookkeeping.
alter table public.rentals
 add column phone_confirmed_at timestamptz,
 add column phone_confirmed_by uuid references public.admins(user_id),
 add column collected_at timestamptz,
 add column handed_over_by uuid references public.admins(user_id),
 add column returned_at timestamptz,
 add column returned_by uuid references public.admins(user_id);

create function public.record_rental_handover() returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid;begin
 actor:=nullif(current_setting('app.actor',true),'')::uuid;
 if new.status is distinct from old.status then
  if new.status in ('Approved','Collected','Returned') then perform check_actor(actor);end if;
  if new.status='Approved' then new.phone_confirmed_at:=now();new.phone_confirmed_by:=actor;end if;
  if new.status='Collected' then
   if length(trim(new.pickup_condition))<3 then raise exception 'Record equipment condition before handover';end if;
   new.collected_at:=now();new.handed_over_by:=actor;
  end if;
  if new.status='Returned' then
   if length(trim(new.return_condition))<3 then raise exception 'Record equipment condition on return';end if;
   new.returned_at:=now();new.returned_by:=actor;
  end if;
 end if;
 return new;
end $$;
create trigger rental_handover before update on public.rentals for each row execute function public.record_rental_handover();

commit;
