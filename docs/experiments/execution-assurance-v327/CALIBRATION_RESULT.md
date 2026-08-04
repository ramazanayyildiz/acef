# V3.27 role-routing calibration result

Status: **PASS for the OpenAI Code Review medium floor**.

Both candidates independently found the held-out HIGH fail-open authorization defect and returned REVISE. The blind
Judge scored candidate A 28/30 and candidate B 30/30, with no unsupported HIGH findings, and selected B. Allocation
reveal: A was `gpt-5.6-sol/high`; B was `gpt-5.6-sol/medium`. The reveal string reproduces the preregistered allocation
commitment, and the revealed oracle reproduces its preregistered SHA-256.

The medium candidate therefore satisfies every preregistered qualification rule and becomes the default Code Review
floor for V3.27. This is narrow evidence: it does not lower ATDD, Development, Patch Assurance, or Process Judge.

The frozen input, parallel candidates, and blind adjudication completed within approximately four active minutes,
well below the 15-minute budget. The practical V3.27 matrix is model-free mechanics, standard/medium conductor,
frontier/high ATDD and Development, standard/medium Code Review, frontier/high Patch Assurance, and frontier/high
Process Judge. Provider-neutral tiers are mapped to concrete provider runtimes separately so equivalent Anthropic,
Google, or other provider models can be calibrated without changing the ACEF lifecycle.
