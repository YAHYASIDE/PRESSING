#!/usr/bin/env bash
# Runs the full verification for مغاسيل صداقة:
#   1) syntax-checks every inline <script> in index.html, sw.js, and manifest JSON
#   2) serves the repo on http://localhost:8123 (if not already served)
#   3) runs every tests/e2e/*.test.js with Playwright (Chromium)
# A suite FAILS if it crashes, logs console/page errors, or prints a boolean
# check that disagrees with its "(expect …)" / "(want …)" annotation.
# Usage:  bash tests/run.sh            # all suites
#         bash tests/run.sh store uid  # only the named suites
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}"

echo "== Syntax =="
node -e '
const fs=require("fs"),vm=require("vm");
const html=fs.readFileSync("index.html","utf8");
const s=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
let ok=true; s.forEach((c,i)=>{ try{ new vm.Script(c); }catch(e){ ok=false; console.log("index.html script",i,"ERROR:",e.message); } });
try{ new vm.Script(fs.readFileSync("sw.js","utf8")); }catch(e){ ok=false; console.log("sw.js ERROR:",e.message); }
try{ JSON.parse(fs.readFileSync("manifest.webmanifest","utf8")); }catch(e){ ok=false; console.log("manifest ERROR:",e.message); }
const v1=(fs.readFileSync("sw.js","utf8").match(/const VERSION = "([^"]+)"/)||[])[1];
const v2=(html.match(/var APP_VERSION = "([^"]+)"/)||[])[1];
if(v1!==v2){ ok=false; console.log("VERSION MISMATCH sw.js="+v1+" index.html="+v2); } else console.log("version", v1);
console.log(ok?"syntax OK":"SYNTAX FAILED"); process.exit(ok?0:1);
' || exit 1

if ! curl -s -o /dev/null http://localhost:8123/index.html; then
  (python3 -m http.server 8123 >/dev/null 2>&1 &)
  sleep 1
fi

echo "== E2E =="
suites=("$@")
if [ ${#suites[@]} -eq 0 ]; then
  for f in tests/e2e/*.test.js; do suites+=("$(basename "$f" .test.js)"); done
fi
fail=0
for t in "${suites[@]}"; do
  f="tests/e2e/$t.test.js"
  [ -f "$f" ] || { echo "MISSING  $t"; fail=1; continue; }
  out="$(timeout 150 node "$f" 2>&1 | grep -viE 'agentproxy|connect_rejected|egress|For details|gstatic|wa\.me')"
  bad=""
  echo "$out" | grep -q "CRASH" && bad="crash"
  echo "$out" | grep -qE "NONE ✅" || bad="${bad:-console errors}"
  mism="$(printf '%s\n' "$out" | node -e '
let s=require("fs").readFileSync(0,"utf8"); const re=/:\s*(true|false)\s*\((?:expect|want) (true|false)\)/g;
for(const line of s.split("\n")){ for(const m of line.matchAll(re)){ if(m[1]!==m[2]){ console.log(line); break; } } }')"
  [ -n "$mism" ] && bad="${bad:+$bad, }failed checks"
  if [ -n "$bad" ]; then echo "FAIL     $t ($bad)"; echo "$out" | sed 's/^/    /' | tail -25; fail=1
  else echo "PASS     $t"; fi
done
echo
[ $fail -eq 0 ] && echo "ALL GREEN ✅" || echo "SOME SUITES FAILED ❌"
exit $fail
