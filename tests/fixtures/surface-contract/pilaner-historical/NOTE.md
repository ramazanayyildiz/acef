# Pilaner historical regression fixture

This fixture is the runnable PROXY for the real Pilaner CRM persistence bug and
its fix. The closeout verifier's cold-process fresh-read is exercised against
the shared proxy stores:

- PRE-fix (RED):  `../stores/inmemory/{write,read}.js` — a module-level
  `let crmStore` singleton. State lives only in the Node heap, so a fresh
  process reads nothing. Models `src/lib/crm/app-store.ts` before the fix.
- POST-fix (GREEN): `../stores/durable/{write,read}.js` — state persisted
  outside the process (a file here; Postgres in real Pilaner). A fresh process
  reads what the writer wrote. Models commit `e288157`
  ("Persist CRM workspace data in Postgres").

The shipped CRM tests stayed green on BOTH commits because they read in the same
process. The cold-process fresh-read is what separates them.

## Verified against the REAL Pilaner code (not the proxy)

The real-code RED→GREEN proof — running the cold-process check against the
actual Pilaner commits via git worktrees (pre-fix in-memory CRM RED; post-fix
CRM against a throwaway Postgres GREEN), using the same `runCrmCommandForRole`/
`getCrmWorkspaceData` entrypoints at both commits — is recorded at:

    /Users/ramazanayyildiz/CODE/acef-rgsc/historical/PILANER-REAL.md

That note is the evidence that this proxy is faithful: same entrypoints, only
persistence changed; RED on `e288157^`, GREEN on `e288157`.
