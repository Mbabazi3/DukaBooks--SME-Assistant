// Runs every test-*.mjs in this folder and reports pass/fail per file.
// Usage: node run-all.mjs            (summary only)
//        node run-all.mjs --verbose  (also print each test's output)
//        node run-all.mjs crm        (only files whose name contains "crm")
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const filter = args.find((a) => !a.startsWith("--"));

const files = readdirSync(here)
  .filter((f) => /^test-.*\.mjs$/.test(f))
  .filter((f) => !filter || f.includes(filter))
  .sort();

let failed = 0;
for (const file of files) {
  const res = spawnSync(process.execPath, [file], { cwd: here, encoding: "utf8" });
  const ok = res.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${file}`);
  if (verbose || !ok) {
    const out = `${res.stdout}${res.stderr}`.trim();
    if (out) console.log(out.split("\n").map((l) => `      ${l}`).join("\n"));
  }
}

console.log(`\n${files.length - failed}/${files.length} test files passed`);
process.exit(failed ? 1 : 0);
