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
