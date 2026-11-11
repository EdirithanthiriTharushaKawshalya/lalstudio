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
