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
