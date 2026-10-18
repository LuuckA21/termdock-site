// Static checks for the site, run in CI before deploying:
// - every JavaScript file parses;
// - every data-i18n key in index.html has an Italian translation, and the
//   dictionary has no stale keys;
// - runtime strings exist in both languages;
// - local files referenced by index.html exist.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import vm from "node:vm";

const site = new URL("../site/", import.meta.url).pathname;
const errors = [];

for (const file of ["theme.js", "i18n.js", "main.js"]) {
  try {
    execFileSync(process.execPath, ["--check", join(site, file)], { stdio: "pipe" });
  } catch (e) {
    errors.push(`${file} does not parse:\n${e.stderr}`);
  }
}

const html = readFileSync(join(site, "index.html"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(join(site, "i18n.js"), "utf8"), sandbox);
const { it, runtime } = sandbox.window.TD_I18N;

const keys = new Set([
  ...[...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/data-i18n-attr="[^":]+:([^"]+)"/g)].map((m) => m[1]),
]);
for (const key of keys) if (!(key in it)) errors.push(`missing Italian translation: ${key}`);
for (const key of Object.keys(it)) if (!keys.has(key)) errors.push(`unused Italian translation: ${key}`);
for (const key of Object.keys(runtime.en)) if (!(key in runtime.it)) errors.push(`missing runtime.it.${key}`);
for (const key of Object.keys(runtime.it)) if (!(key in runtime.en)) errors.push(`missing runtime.en.${key}`);

for (const [, ref] of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) {
  if (!existsSync(join(site, ref))) errors.push(`index.html references a missing file: ${ref}`);
}

if (/\sstyle="/.test(html)) errors.push("inline style attributes are blocked by the Content-Security-Policy");
if (/<script(?![^>]*\bsrc=)[^>]*>/.test(html)) errors.push("inline scripts are blocked by the Content-Security-Policy");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`ok: ${keys.size} translated keys, ${Object.keys(runtime.en).length} runtime strings`);
