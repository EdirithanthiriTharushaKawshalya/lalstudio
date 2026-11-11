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
