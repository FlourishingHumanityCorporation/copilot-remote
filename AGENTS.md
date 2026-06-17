# copilot-remote

Codex guidance for this repository.

## What This Is

External or forked repository kept under CodeProjects for reference, experimentation, or local integration work.

## Workspace Context

- Workspace path: `external/copilot-remote`
- Repository name: `copilot-remote`
- Kind: external checkout/fork
- Registry entry: not listed in `.meta/projects.json`; treat local docs as authoritative.

## Tech Stack Signals

- Node/TypeScript/JavaScript

## Start Here

- Read `/Users/paulrohde/CodeProjects/AGENTS.md` before making cross-project changes.
- Keep changes scoped to this repo unless the user asks for a workspace-wide change.
- Check `.meta/projects.json` before changing ports, dependency relationships, project names, or automation ownership.
- Prefer existing local conventions, scripts, and docs over new machinery.
- Never print secrets from `.env`, local credentials, browser profiles, keychains, or private data stores.
- External checkout: preserve upstream style and avoid CodeProjects-specific refactors unless the task is explicitly local-integration work.

## Local Orientation

- `README.md` is the first local product/usage orientation surface.

## Commands

- Node project: inspect `package.json` scripts and use the package manager already locked in the repo.

## Important Files

- `README.md`
- `package.json`

## Verification

- Run the narrowest relevant local check after edits.
- For user-visible behavior, prefer the real UI, CLI, appcheck, logs, or documented proof surface over a shallow green check.
- If verification cannot run, report the exact blocker and residual risk.
