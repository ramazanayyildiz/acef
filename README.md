# ACEF — Ayyildiz Context Engineering Framework

ACEF is a stack-agnostic SDLC operating system for AI-assisted software work.

It helps an AI agent understand the project first, route the work correctly, and run only the steps needed for that
specific case. ACEF does not replace tools like BMAD, Kiro, GSD, OpenSpec, or spec-kit. It orchestrates them through
the reality of the current project.

## Core Idea

Generic AI development frameworks are useful, but they are not enough for real codebases because they do not know:

- the actual repo structure
- the safe patterns to copy
- the test and CI setup
- the risky areas
- the team's real conventions

ACEF solves this with three layers:

1. **Universal routes** — small feature, large feature, bug fix, test-case extraction, test automation, unit/integration tests.
2. **Project adapter** — extracted from the real codebase: stack, commands, CI, tests, golden neighbors, risks.
3. **ACEF agent** — one front-door agent that routes, coordinates, and teaches without exposing unnecessary process.

## What ACEF Is Not

ACEF is not:

- a generic SDLC poster
- a ceremony-heavy workflow
- a stack-specific framework
- an autonomous agent that skips human approval
- a replacement for human review

## Current Status

This repository is the public-facing home for ACEF.

The current implementation is a research-informed draft:

- the public explanation and website are ready
- the agent skills exist as draft definitions
- real-world dogfooding is still required before calling the system proven

## Website

The site lives in `docs/` and can be published with GitHub Pages.

Recommended GitHub Pages setting:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/docs`

## Repository Structure

```text
docs/
  index.html      Public landing/documentation page
  styles.css      Site styling
  script.js       Small interactions
README.md         Project overview
```

## License

License is not selected yet.

