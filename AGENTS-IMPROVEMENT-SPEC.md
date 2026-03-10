# AGENTS Improvement Spec

## Current State

- **AGENTS.md**: does not exist
- **`.ona/skills/`**: does not exist
- **`.cursor/rules/`**: does not exist

No agent guidance of any kind is present in this repository.

---

## Audit

### What's Good

- **Clear project structure**: `src/`, `examples/`, `test/`, `stories/` are well-separated.
- **TypeScript throughout**: All source files are `.ts`/`.tsx`; types are exported from `src/types/index.ts`.
- **Tooling is configured**: ESLint (`.eslintrc.yml`), Prettier (`.prettierrc`), Jest (`jest.config.js`), Rollup (`rollup.config.js`), Babel (`.babelrc`) are all present.
- **Makefile targets**: `lint`, `test`, `build`, `clean`, `setup`, `release-*` are defined and usable.
- **CI pipeline**: `.github/workflows/` runs lint, test, and build on push.
- **Examples**: Four complete examples (`simple.tsx`, `hooks.tsx`, `oauth.tsx`, `component.tsx`) cover the main integration patterns.
- **CHANGELOG.md**: Maintained with version history.
- **PUBLISH.md**: Step-by-step release process documented.
- **Deprecation signaling**: `PlaidLinkOptionsWithPublicKey` is marked `@deprecated` in types.

### What's Missing

1. **AGENTS.md**: No file exists. An agent working on this repo has no guidance on architecture, conventions, or workflows.
2. **Test coverage for `PlaidEmbeddedLink`**: `PlaidEmbeddedLink.test.tsx` exists as a file but its content was not verified; the embedded component has no visible test assertions in the reviewed source.
3. **`react-hooks/exhaustive-deps` is disabled**: ESLint rule is set to `0` (off). The `usePlaidLink` hook has a dependency array that omits `options` callbacks (`onSuccess`, `onExit`, `onEvent`, `onLoad`), which is intentional but undocumented.
4. **`devcontainer.json` is generic**: Uses the 10 GB universal image with no Node version pinning, no `postCreateCommand` to run `yarn install`, and no port forwarding for Storybook (port 6006) or the test runner.
5. **No automations file**: `.devcontainer/automations.yaml` (or equivalent) is absent; `yarn install` and `make build` are not automated on environment start.
6. **No `.ona/skills/` guidance**: No agent skill files exist to encode project-specific workflows (e.g., how to cut a release, how to add a new callback type).
7. **`PlaidLink` component does not expose `ready`**: The button is always enabled unless there is an error; it does not use the `ready` state from `usePlaidLink`, so it can be clicked before Plaid is initialized.
8. **`func-style` ESLint rule is `2` (error) but arrow functions are used everywhere**: This is consistent in practice but the rule description is misleading without a comment.

### What's Wrong

1. **`devcontainer.json` has no `postCreateCommand`**: Developers (and agents) opening this environment must manually run `yarn install` before any `make` target works.
2. **`mocha`, `sinon`, `react-tools` are dead devDependencies**: These are listed in `package.json` but the test suite uses Jest exclusively. The Makefile even has the old Mocha invocation commented out. These add noise and potential confusion.
3. **`rollup` is pinned to `^1.27.0`**: This is a very old major version (current is v4). The `@wessberg/rollup-plugin-ts` dependency is also unmaintained. Build tooling is significantly out of date.
4. **`@storybook/*` packages are v5**: Storybook 5 is EOL. The storybook deploy target may not work correctly with current Node versions.
5. **`typescript` is `^3.8.3`**: TypeScript 3.x is EOL; current is 5.x. This limits use of newer language features and may cause type-checking gaps.
6. **`eslint` is pinned to `6.6.0`**: ESLint 6 is EOL; current is 9.x.
7. **`react-hooks/exhaustive-deps: 0`** combined with the missing `options` callbacks in the `useEffect` dependency array in `usePlaidLink.ts` is a latent stale-closure bug. If a consumer passes inline callbacks, they will not trigger re-initialization. This is intentional (to avoid re-creating the Plaid instance on every render) but is not documented in the code or in AGENTS.md.
8. **`PlaidEmbeddedLink` uses `==` instead of `===`** on line: `if (config.token == null || config.token == '')`. The first comparison (`== null`) is an intentional null/undefined coercion, but the second (`== ''`) should be `=== ''` for consistency with the rest of the codebase.

---

## Improvement Spec

### 1. Create `AGENTS.md`

Create `/workspaces/react-plaid-link/AGENTS.md` with the following sections:

#### 1.1 Project Overview
- This is a React hook + component library wrapping the Plaid Link JS SDK.
- The library is published to npm as `react-plaid-link`.
- Source is TypeScript; output is CJS, ESM, and UMD via Rollup.

#### 1.2 Architecture
- `src/usePlaidLink.ts` — primary hook; loads the Plaid script and manages the handler lifecycle.
- `src/factory.ts` — wraps `window.Plaid.create()` to manage open/exit/destroy state.
- `src/PlaidLink.tsx` — thin button component wrapping `usePlaidLink`.
- `src/PlaidEmbeddedLink.tsx` — embedded iframe variant using `window.Plaid.createEmbedded()`.
- `src/types/index.ts` — all exported TypeScript types; this is the source of truth for the public API.
- `src/react-script-hook/` — forked script loader (do not modify without understanding the fork rationale).
- `examples/` — runnable integration examples; keep these in sync with API changes.

#### 1.3 Key Conventions
- **Dependency array in `usePlaidLink`**: The `useEffect` intentionally omits callback props (`onSuccess`, `onExit`, `onEvent`, `onLoad`) from its dependency array. This prevents re-creating the Plaid iframe on every render when consumers pass inline functions. If you add new options that should trigger re-initialization (like `token` or `publicKey`), add them to the dependency array. Callbacks should not be added.
- **`eslint-disable-line no-console`**: `console.error` and `console.warn` are used deliberately in the hook for SDK-level errors. The ESLint `no-console` rule is set to `0` globally; do not add `console.log` for debugging.
- **Deprecation**: `PlaidLinkOptionsWithPublicKey` is deprecated. New features should only be added to `PlaidLinkOptionsWithLinkToken`.
- **Type exports**: All public types must be exported from `src/types/index.ts` and re-exported via `src/index.ts`.

#### 1.4 Development Workflow
```
make setup       # yarn install
make lint        # ESLint
make test        # Jest
make build       # Rollup → dist/
make clean       # rm -rf dist lib
```

- Node version: see `.nvmrc` (use `nvm use` or the devcontainer).
- Package manager: Yarn 1.x (see `.yarnrc` and `packageManager` field).
- Do not use `npm install`; use `yarn` or `make setup`.

#### 1.5 Release Process
- See `PUBLISH.md` for the full release workflow.
- Releases use the `xyz` npm package via `make release-(patch|minor|major)`.
- Always update `CHANGELOG.md` before releasing.
- Do not publish from the `master` branch directly; use a `release-x.y.z` branch.

#### 1.6 Testing
- Tests live in `src/*.test.tsx`.
- `useScript` from `./react-script-hook` is always mocked in tests; do not test the script loading itself.
- `window.Plaid` must be mocked in `beforeEach`; see `usePlaidLink.test.tsx` for the mock shape.
- Run `make test` before committing.

#### 1.7 Known Technical Debt (do not fix without discussion)
- `mocha`, `sinon`, `react-tools` in `devDependencies` are unused; removal requires verifying no hidden dependency.
- Rollup, Storybook, TypeScript, and ESLint are significantly out of date. Upgrades are non-trivial and should be done in isolation.
- `react-hooks/exhaustive-deps` is disabled globally. See §1.3 for rationale.

---

### 2. Fix `devcontainer.json`

Replace the generic universal image with a Node-specific image pinned to the version in `.nvmrc`, add `postCreateCommand: "yarn install"`, and add a `forwardPorts` entry for Storybook (6006).

```json
{
  "name": "react-plaid-link",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:20",
  "postCreateCommand": "yarn install",
  "forwardPorts": [6006],
  "portsAttributes": {
    "6006": { "label": "Storybook" }
  }
}
```

---

### 3. Fix `PlaidEmbeddedLink` strict equality

In `src/PlaidEmbeddedLink.tsx`, change:

```ts
// before
if (config.token == null || config.token == '') {

// after
if (config.token == null || config.token === '') {
```

The `== null` coercion (catches both `null` and `undefined`) is intentional and correct. The empty-string check should use strict equality.

---

### 4. Remove dead devDependencies

From `package.json`, remove:
- `mocha`
- `sinon`
- `react-tools`

These are not referenced anywhere in the current test suite or build pipeline.

---

### 5. Document the `ready` gap in `PlaidLink`

The `PlaidLink` component does not pass `ready` to the button's `disabled` prop. This means the button is clickable before Plaid is initialized (clicking it is a no-op because `open` is `openNoOp` when `plaid` is null). Either:

- **Option A**: Pass `ready` to `disabled` in `PlaidLink` (breaking change for consumers who rely on the button being enabled immediately).
- **Option B**: Document this behavior in `AGENTS.md` and in the component's JSDoc so future agents do not "fix" it unknowingly.

Recommended: Option B for now, Option A in the next major version.

---

### Priority Order

| Priority | Item | Effort |
|----------|------|--------|
| 1 | Create `AGENTS.md` | Low |
| 2 | Fix `devcontainer.json` | Low |
| 3 | Fix `PlaidEmbeddedLink` strict equality | Trivial |
| 4 | Remove dead devDependencies | Low |
| 5 | Document `PlaidLink` `ready` gap | Low |
| 6 | Upgrade Rollup / TypeScript / ESLint / Storybook | High (do separately) |
