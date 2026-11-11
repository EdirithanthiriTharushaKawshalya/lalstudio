import { readFile, readdir, writeFile } from "node:fs/promises";
const names = (await readdir("supabase/migrations"))
  .filter((n) => n.endsWith(".sql"))
  .sort();
const parts = await Promise.all(
  names.map(
    async (name) =>
      `-- ${name}\n${await readFile(`supabase/migrations/${name}`, "utf8")}`,
  ),
);
const sql = `-- LAL STUDIO: initial setup for a fresh Supabase project.\n-- Run once in the Supabase SQL Editor as the project owner.\n-- Do not use tests/bootstrap.sql. All statements commit together or roll back.\nbegin;\n${parts.join("\n\n")}\ncommit;\n`;
await writeFile("supabase/setup.sql", sql);
console.log(
  `Prepared supabase/setup.sql from ${names.length} migrations. No credentials are included.`,
);
