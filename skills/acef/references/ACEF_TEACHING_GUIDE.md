---
title: "ACEF - Current Architecture and Teaching Guide"
date: 2026-06-18
status: draft
tags:
  - acef
  - sdlc
  - methodology
  - agent
---

# ACEF - Current Architecture and Teaching Guide

This is the portable explanation source for the ACEF agent.

It explains what ACEF is, what it is not, how it should behave for users, and how it adapts to different projects.
Detailed pilot documents may live inside a project repo, but this file is the vault-level methodology reference.

## One Sentence

ACEF is a stack-agnostic SDLC operating system for AI-assisted development: it routes the work, extracts the project's
real adapter, runs only the needed steps, and keeps the user away from unnecessary process.

## What Problem ACEF Solves

Generic systems like BMAD, Kiro, GSD, and gstack are useful, but they stay too generic:

- they do not know this company's repo conventions
- they do not know which code patterns are safe to copy
- they do not know the actual test, CI, release, and risk surface
- they often expose too much process to the wrong role

ACEF solves this by combining:

1. a universal SDLC route model
2. a per-project adapter extracted from the real codebase
3. one managing agent that hides complexity and asks only what is needed

## What ACEF Is Not

ACEF is not:

- a new generic SDLC diagram
- a replacement for BMAD, Kiro, GSD, OpenSpec, or spec-kit
- a stack-specific framework
- a requirement that every task goes through every phase
- a ceremony generator
- a fully autonomous agent that skips human approval

ACEF uses external methods as engines or references when useful, but ACEF remains the orchestrating method.

Formula:

```text
ACEF drives.
External methods assist.
Project adapter grounds.
ACEF artifacts store.
```

## Boundary: Pre-SDLC vs SDLC

Pre-SDLC work is separate from the core ACEF SDLC:

- idea capture
- thinking engine
- council / discussion
- research
- product discovery before there is a buildable brief

These tools can feed ACEF, but they are not the core SDLC route system.

ACEF SDLC starts when there is a request that should become software work.

## Core SDLC Routes

ACEF does not force every task through one pipeline.

The managing agent first routes the request:

1. Small feature
2. Large feature
3. Bug fix
4. Test-case extraction
5. Test automation setup
6. Unit/integration test expansion

Each route runs only the steps it needs.

## Brownfield First

The current ACEF build is focused on brownfield projects: existing codebases.

In brownfield work, the main rule is:

```text
Do not invent the project.
Extract it.
```

That means ACEF should first understand:

- repo layout
- stack and package manager
- test framework and commands
- CI/CD commands and checks
- golden neighbors
- risky areas
- do-not-copy legacy quirks

This extracted data is the Project Adapter.

## Project Adapter

ACEF core does not know whether the project is .NET, Laravel, Rails, Expo, Next, Python, Go, or something else.

The adapter tells ACEF what this project actually uses.

The adapter captures:

- language, framework, and package manager
- repo/module layout
- build/lint/typecheck/test/codegen commands
- CI/CD workflows
- existing tests and test commands
- accepted golden neighbors
- risky areas such as auth, payment, data, migrations, contracts, release

The adapter must be evidence-pinned: project facts should cite the source path when practical.

Do not use unsupported guesses as project truth.

## Golden Neighbor

A golden neighbor is the local example the agent should imitate.

A good neighbor:

- is in the same repo or accepted reference repo
- follows current convention
- is not legacy or do-not-copy
- matches the lifecycle and flow
- uses the same package/framework pattern
- has related tests/docs/twins when applicable

If no qualified neighbor exists, ACEF must escalate to a larger/new-pattern route instead of forcing a bad example.

## Test Bootstrap

Many real repos have no tests.

ACEF should not start by generating broad coverage.

The first test goal is:

```text
Create one approved golden test pattern.
```

Decision order:

1. If tests exist, mirror the best qualified test neighbor.
2. If a framework is configured but no tests exist, use that configured framework.
3. If multiple frameworks exist, ask.
4. If no framework exists, propose the stack-default option and ask before installing anything.

The first test must be buildable, runnable, passing, and useful as a future neighbor.

## Specify

ACEF should not duplicate BMAD, Kiro, OpenSpec, or spec-kit.

Rule:

```text
Generate once.
Normalize and trace once.
```

If BMAD/Kiro/manual artifacts already exist, ACEF imports and normalizes them.

If no artifacts exist and the route needs them, ACEF can guide a lightweight specify flow.

Preferred traceability:

- `FR-###` functional requirements
- `US-###` user stories
- `SC-###` scenarios / acceptance criteria
- tasks tagged back to the relevant IDs

Acceptance criteria should use EARS-style wording when practical.

For brownfield, use deltas when useful:

- ADDED
- MODIFIED
- REMOVED

## Release

Release is adapter-based.

ACEF should read the project's actual workflows and scripts.

It must distinguish:

- deploy workflow
- CI/test gate
- smoke/canary check
- rollback path

Do not claim a deploy workflow is a test gate unless it actually runs tests.

## Managing Agent Behavior

The user talks to one front-door agent.

The agent:

1. receives intent in plain language
2. checks whether this is pre-SDLC or SDLC work
3. checks whether the project adapter exists and is fresh
4. routes the request
5. runs only the needed steps
6. explains briefly by default
7. expands only when the user asks for detail

Default behavior:

- short answer
- selected route/current state
- next artifact/action
- approval needed if there is any side effect

The user should not have to remember skills, phases, tools, or stack rules.

## Honesty Labels

ACEF must keep honest status labels:

- READY: working skill or real artifact exists
- DRAFT: doc/rule/skill definition exists, but not proven
- MISSING: not built or not found

A document is not a working skill.
A skill definition is not proven until dogfooded.

## Current Implementation State

- `acef` front-door skill exists as a research-informed DRAFT.
- Helper skill definitions exist:
  - `acef-router`
  - `acef-adapter`
  - `acef-specify`
  - `acef-test-bootstrap`
  - `acef-release-adapter`
- These are DRAFT, not READY, until exercised on real cases in your own repo.

## External Methods Relationship

ACEF may borrow proven mechanisms:

- GSD / codemap style repo grounding
- aider repo-map and Repomix ideas for adapter extraction
- Kiro EARS
- spec-kit trace IDs
- OpenSpec deltas
- BMAD for large planning when useful
- test-generation tools' detection and filter ladders

But these are components.

ACEF's value is how it binds them to:

- the extracted project adapter
- the correct route
- one managing agent
- no unnecessary ceremony

