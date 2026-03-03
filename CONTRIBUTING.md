# Contributing to RemitLend

Thank you for helping improve RemitLend. This document explains how external developers can report bugs, submit pull requests, and run the project locally.

## Table of contents

- [Code of Conduct](#code-of-conduct)
- [Reporting Bugs](#reporting-bugs)
- [Submitting Pull Requests](#submitting-pull-requests)
- [Run the project locally](#run-the-project-locally)
- [Branching & commit conventions](#branching--commit-conventions)
- [Quick PR checklist](#quick-pr-checklist)

## Code of Conduct

By contributing you agree to follow the project's Code of Conduct: be respectful, inclusive, and constructive.

## Reporting Bugs

Before opening a new issue, search existing issues to avoid duplicates.

When filing a bug, include:

- A short, descriptive title
- Steps to reproduce (minimum reproducible example)
- Expected vs actual behavior
- Environment: OS, Node version, npm/yarn, browser, how you started the app (docker/manual)
- Logs, error messages, and stack traces (if any)
- Screenshots / GIFs (if helpful)
- Which package/component is affected (frontend, backend, contracts)

Optional helpful fields:

- Related PR/Issue links
- A short suggestion for a fix (if you have one)

Bug report minimal template (paste into a new issue):

Title: [bug] short description

Description:

Steps to reproduce:
1. 
2. 

Expected result:

Actual result:

Environment:
- OS: macOS / Linux / Windows
- Node: v18.x
- How started: `docker compose up` or `npm run dev`

Attachments: (logs / screenshots)

Maintainers will triage issues and may ask for more info.

## Submitting Pull Requests

We welcome PRs from external contributors. Follow these steps for a smooth review:

1. Fork the repository and clone your fork.
2. Create a branch from `main` using the branch naming conventions below.
   - Example: `feat/lender-dashboard`, `fix/simulate-endpoint`
3. Implement your change. Prefer small, focused PRs.
4. Add or update tests for any behavior you change.
5. Run linters and tests locally (commands below).
6. Commit following Conventional Commits (see below) and push your branch.
7. Open a PR against the `main` branch. In your PR description:
   - Explain the problem and the solution.
   - List any manual steps to test the change.
   - Link related issues (e.g. `Closes #123`).
8. A maintainer will review. Be responsive to review comments and iterate.

PR review notes:

- Automated CI should pass before merging.
- Large or risky changes may require more than one reviewer.
- A maintainer will merge once reviewers are satisfied.

## Run the project locally

You can run the whole stack quickly with Docker Compose or run each component manually. Use whichever fits your workflow.

Quick (recommended): Docker Compose

From the repository root:

```bash
# Copy envs if needed, then start all services
cp backend/.env.example backend/.env || true
docker compose up --build
```

Services after startup:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001 (Swagger: /api-docs)

Manual Setup

Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env if you need to change PORT or CORS_ALLOWED_ORIGINS
npm run dev        # start dev server with hot reload
# tests
npm test
# lint
npm run lint
```

Available backend scripts (see `backend/package.json`):
- `npm run dev` - dev server
- `npm run build` - compile TypeScript
- `npm start` - run compiled app
- `npm test` - run tests
- `npm run lint` / `npm run lint:fix`

Frontend

```bash
cd frontend
npm install
npm run dev
# open http://localhost:3000
# tests
npm test
# lint
npm run lint
```

Smart contracts (Rust / Soroban)

Prerequisites: Rust toolchain and wasm target, Soroban CLI

```bash
rustup target add wasm32-unknown-unknown
cargo install --locked soroban-cli || true
cd contracts
cargo build --target wasm32-unknown-unknown --release
cargo test
```

Notes:

- The repository README contains more details and deploy examples.
- If you prefer yarn or pnpm, you can use those instead of npm.

## Branching & commit conventions

Branch naming:

- `feat/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`
- `refactor/<short-description>`

Commit messages: follow Conventional Commits. Examples:

- `feat(backend): add simulation endpoint`
- `fix(frontend): correct wallet connection logic`

## Quick PR checklist

- [ ] Branched from latest `main`
- [ ] Tests added/updated and passing
- [ ] Linting and formatting applied
- [ ] Update or add documentation when behavior changes
- [ ] PR description explains the why + how to test

## External developer guide

This short guide is for external contributors who want to file bugs, open PRs, or run the project locally.

### 1) Report a bug

When filing a bug from an external fork or account, please:

- Search existing issues to avoid duplicates.
- Use a clear title prefixed with [bug].
- Include steps to reproduce (a short, reproducible example helps a lot).
- Add expected vs actual behavior and any error messages / stack traces.
- Specify which part of the monorepo is affected (frontend / backend / contracts).
- Provide environment details (OS, Node version, how you ran the project: `docker compose up` or `npm run dev`).

Quick issue template you can copy into a new GitHub issue:

Title: [bug] short description

Description:

Steps to reproduce:
1. 
2. 

Expected result:

Actual result:

Environment:
- OS: macOS / Linux / Windows
- Node: v18.x
- How started: `docker compose up` or `npm run dev`

Attachments: (logs / screenshots)

Maintainers will triage and request additional information if needed.

### 2) Submit a Pull Request

Steps to submit a PR as an external contributor:

1. Fork the repository on GitHub and clone your fork locally.
2. Create a branch from `main` using a descriptive name, e.g. `feat/your-feature` or `fix/brief-description`.
3. Implement small, focused changes and add tests where appropriate.
4. Run the project's linters and tests locally (commands below).
5. Commit using Conventional Commits (e.g. `feat(frontend): add widget`) and push your branch to your fork.
6. Open a PR against `main` in the upstream repository. In the PR description:
   - Describe the problem and your solution.
   - Add testing instructions and any manual verification steps.
   - Link related issues (e.g. `Closes #123`).
7. Address review feedback; maintainers will merge when CI and reviews are green.

Notes:
- Keep PRs small and focused when possible.
- Automated CI checks (tests & lint) should pass before merging.

### 3) Run the project locally (summary)

You can run everything via Docker Compose (recommended) or run each package manually.

Quick (recommended): run all services with Docker Compose from the repo root:

```bash
# copy backend env if needed and start all services
cp backend/.env.example backend/.env || true
docker compose up --build
```

Manual per-package (use if you prefer to run components individually):

Backend (Express/TypeScript):

```bash
cd backend
npm install
cp .env.example .env
# edit .env if you need to change PORT or CORS_ALLOWED_ORIGINS
npm run dev
# run tests
npm test
# lint
npm run lint
```

Frontend (Next.js):

```bash
cd frontend
npm install
npm run dev
# open http://localhost:3000
# run tests
npm test
# lint
npm run lint
```

Contracts (Rust / Soroban):

```bash
rustup target add wasm32-unknown-unknown
cargo install --locked soroban-cli || true
cd contracts
cargo build --target wasm32-unknown-unknown --release
cargo test
```

If you need help setting up or running tests locally, please open an issue and tag the maintainers.

***
