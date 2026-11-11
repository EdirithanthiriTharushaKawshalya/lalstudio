import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const env = {
  ...process.env,
  PGHOST: process.env.PGHOST || "127.0.0.1",
  PGPORT: process.env.PGPORT || "55432",
  PGUSER: process.env.PGUSER || "studio_test",
  PGDATABASE: process.env.PGDATABASE || "postgres",
};
function sql(query) {
  return new Promise((resolve, reject) => {
    const p = spawn("psql", ["-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1"], {
      env,
      windowsHide: true,
    });
    let out = "",
      err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) =>
      code ? reject(new Error(err)) : resolve(out.trim()),
    );
    p.stdin.end(query);
  });
}
const [actor, equipment, unit, r1, r2, payment] = Array.from(
  { length: 6 },
  () => randomUUID(),
);
try {
  await sql(
    `begin;insert into auth.users(id) values('${actor}');insert into admins(user_id) values('${actor}');insert into equipment(id,name,category,published) values('${equipment}','Concurrency test','Cameras',true);insert into equipment_units(id,equipment_id,code) values('${unit}','${equipment}','${unit}');insert into rentals(id,name,phone,email,address,starts_at,ends_at) select id,'Test','0000000000','test@example.invalid','Test only','2035-01-01T00:00Z','2035-01-03T00:00Z' from unnest(array['${r1}'::uuid,'${r2}'::uuid]) id;insert into rental_items(rental_id,equipment_id,quantity) values('${r1}','${equipment}',1),('${r2}','${equipment}',1);commit;`,
  );
  const results = await Promise.allSettled(
    [r1, r2].map((id) =>
      sql(
        `begin;select update_rental('${actor}','${id}','{"status":"Approved"}');select pg_sleep(0.15);commit;`,
      ),
    ),
  );
  assert.equal(
    results.filter((r) => r.status === "fulfilled").length,
    1,
    "Exactly one simultaneous approval must succeed",
  );
  assert.equal(
    await sql(
      `select count(*) from reservations where unit_id='${unit}' and not released;`,
    ),
    "1",
  );
  const payload = `{"date":"2035-01-01","kind":"Income","amount":100.25,"description":"Concurrent payment","category":"Test","payment_method":"Cash"}`;
  await Promise.all(
    [1, 2].map(() =>
      sql(`select record_payment('${actor}','${payload}','${payment}');`),
    ),
  );
  assert.equal(
    await sql(
      `select count(*) from financial_transactions where idempotency_key='${payment}';`,
    ),
    "1",
  );
  console.log(
    "PASS: two concurrent rental approvals reserve one unit exactly once",
  );
  console.log("PASS: concurrent payment retries produce one ledger entry");
} finally {
  await sql(
    `begin;delete from financial_transactions where idempotency_key='${payment}';delete from reservations where unit_id='${unit}';delete from rental_items where rental_id in ('${r1}','${r2}');delete from rentals where id in ('${r1}','${r2}');delete from equipment_units where id='${unit}';delete from equipment where id='${equipment}';delete from audit_events where actor_id='${actor}' or record_id in ('${r1}','${r2}','${unit}','${equipment}');delete from admins where user_id='${actor}';delete from auth.users where id='${actor}';commit;`,
  );
}
