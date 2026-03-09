# AGENTS Improvement Spec

Audit date: 2026-03-09  
Auditor: Ona  
Repo: react-plaid-link (v4.1.1)

---

## Current State

- **AGENTS.md**: does not exist
- **`.ona/skills/`**: does not exist
- **`.cursor/rules/`**: does not exist
- **`devcontainer.json`**: exists but has no `postCreateCommand`; environment is not ready on first open
- **`jest.config.js`**: minimal; `test/setup.js` is dead code (wired only to legacy Mocha invocation)

---

## What's Good (preserve)

- TypeScript throughout; types exported from `src/types/index.ts`
- Tests co-located with source files
- CI runs lint + test + build on every push (`.github/workflows/build.yml`)
- ESLint + Prettier configured; husky pre-push hook enforces lint
- `CHANGELOG.md` and `PUBLISH.md` maintained
- `react-script-hook` forked inline with attribution comment
- Deprecated `publicKey` path annotated with `@deprecated` JSDoc

---

## Improvements Required

### 1. Create `AGENTS.md`

**Priority: high**

No agent guidance exists. An agent starting fresh has no way to know:
- How to install dependencies (`yarn`, not `npm install`)
- How to run tests (`make test` or `yarn test`)
- How to build (`make build` — not available via `npm run build`)
- What the `products` sorted-join trick in `usePlaidLink.ts` is for
- That `react-hooks/exhaustive-deps` is intentionally disabled
- That `publicKey` integration is deprecated and should not be used in new code
- That `test/setup.js` is legacy dead code (Mocha era) and should not be modified

**Spec for `AGENTS.md`:**

```markdown
# AGENTS.md

## Setup

Use yarn, not npm:

    yarn install

## Commands

| Task        | Command          |
|-------------|------------------|
| Install     | `yarn install`   |
| Test        | `make test`      |
| Lint        | `make lint`      |
| Build       | `make build`     |
| Lint + fix  | `make lint-fix`  |

`npm run build` does not exist. Always use `make build`.

## Project Structure

- `src/usePlaidLink.ts` — primary hook; the main public API
- `src/PlaidLink.tsx` — thin wrapper component around the hook (for class component consumers)
- `src/PlaidEmbeddedLink.tsx` — embedded (inline) variant; uses `window.Plaid.createEmbedded`
- `src/factory.ts` — wraps `window.Plaid.create` to manage lifecycle (open/exit/destroy state)
- `src/react-script-hook/` — forked from hupe1980/react-script-hook; do not replace with the npm package
- `src/types/index.ts` — all exported TypeScript types
- `src/constants.ts` — Plaid CDN URL
- `test/setup.js` — legacy Mocha setup; not used by Jest; do not modify or reference

## Key Conventions

### Dependency array in `usePlaidLink`

The `useEffect` in `usePlaidLink.ts` intentionally omits `options` from its dependency array.
Instead, it tracks `options.token`, `options.publicKey`, and a sorted-joined `products` string.
This avoids re-creating the Plaid instance on every render when the caller passes a new object
reference with the same values. `react-hooks/exhaustive-deps` is disabled in `.eslintrc.yml`
for this reason.

Do not add `options` to the dependency array. Do not enable `react-hooks/exhaustive-deps`.

### Deprecated `publicKey` path

`PlaidLinkOptionsWithPublicKey` and the `publicKey` field are deprecated per Plaid's
link-token migration guide. Do not use `publicKey` in new examples, tests, or documentation.
The existing support must remain for backward compatibility.

### Console output

`no-console` ESLint rule is disabled. `console.error` and `console.warn` calls in source
are intentional (user-facing warnings). Do not remove them.

## Testing

Tests use Jest + @testing-library/react. `window.Plaid` is mocked in each test file's
`beforeEach`. `useScript` (from `./react-script-hook`) is mocked via `jest.mock`.

Run tests:

    make test

Tests live alongside source files (`src/*.test.tsx`), not in `test/`.

## What Not to Do

- Do not run `npm install` or `npm run build`
- Do not modify `test/setup.js` (dead code)
- Do not add `publicKey` to new examples or tests
- Do not add `options` to the `useEffect` dependency array in `usePlaidLink.ts`
- Do not upgrade Storybook without a dedicated effort (currently v5; major breaking changes in v6+)
- Do not replace `src/react-script-hook/` with the npm package (incompatible with React 19 peer deps)
```

---

### 2. Fix `devcontainer.json`

**Priority: high**

The current config uses the 10 GB universal image with no automation. An agent or developer
opening this environment must manually run `yarn install` before anything works.

**Change:**

Add `postCreateCommand` to `devcontainer.json`:

```json
"postCreateCommand": "yarn install"
```

Optionally switch to a smaller Node.js image for faster startup:

```json
"image": "mcr.microsoft.com/devcontainers/javascript-node:20"
```

---

### 3. Fix dead `test/setup.js`

**Priority: medium**

`test/setup.js` uses `jsdom` from the old Mocha test setup. It is not referenced by Jest
(`jest.config.js` has no `setupFiles` or `setupFilesAfterFramework`). The file imports
`jsdom` directly, which is not installed as a dependency.

**Options (pick one):**
- Delete `test/setup.js` and the `test/` directory if empty
- Add a comment to `test/setup.js` marking it as legacy/unused so agents don't try to fix it

The `jest.config.js` correctly uses `jest-environment-jsdom` for DOM simulation; no setup
file is needed.

---

### 4. Add `build` script to `package.json`

**Priority: medium**

`npm run build` fails silently — there is no `build` script in `package.json`. Agents
defaulting to npm scripts will be confused.

**Change:** Add to `package.json` scripts:

```json
"build": "rollup -c"
```

This mirrors what `make build` does and makes the project work with standard npm/yarn
script conventions.

---

### 5. Document non-obvious code patterns inline

**Priority: low**

Two patterns in `usePlaidLink.ts` are non-obvious and have caused confusion in past PRs:

**a) `products` sorted-join (line ~30):**
```ts
// Serialize product array to a stable string so the effect only re-runs
// when the actual product values change, not on every render (reference equality).
const products = ((options as PlaidLinkOptionsWithPublicKey).product || [])
  .slice()
  .sort()
  .join(',');
```

**b) `ready` computation (line ~70):**
```ts
// ready is true once a Plaid instance exists AND either the script has
// finished loading OR the iframe has signalled onLoad.
const ready = plaid != null && (!loading || iframeLoaded);
```

---

### 6. Tighten `PlaidFactory` types in `factory.ts`

**Priority: low**

`PlaidFactory` uses `Function` as a type for `open`, `submit`, `exit`, and `destroy`.
This loses type safety at the interface boundary.

**Change:** Replace with specific signatures matching the implementation:

```ts
export interface PlaidFactory {
  open: () => void;
  submit: (data: PlaidHandlerSubmissionData) => void;
  exit: (exitOptions: { force?: boolean }, callback: () => void) => void;
  destroy: () => void;
}
```

---

### 7. `PlaidLink` should disable button when not ready

**Priority: low**

`PlaidLink` only disables the button on `error`. When `ready` is false (script loading,
token not yet available), the button is enabled but clicking it logs a console warning.
This is a usability gap.

**Change:** Expose `ready` from `usePlaidLink` in `PlaidLink` and set `disabled={!ready || Boolean(error)}`.

---

## Summary Table

| # | Item | Priority | File(s) |
|---|------|----------|---------|
| 1 | Create `AGENTS.md` | high | `AGENTS.md` (new) |
| 2 | Add `postCreateCommand` to devcontainer | high | `.devcontainer/devcontainer.json` |
| 3 | Fix/remove dead `test/setup.js` | medium | `test/setup.js` |
| 4 | Add `build` npm script | medium | `package.json` |
| 5 | Add inline comments for non-obvious patterns | low | `src/usePlaidLink.ts` |
| 6 | Tighten `PlaidFactory` types | low | `src/factory.ts` |
| 7 | Disable `PlaidLink` button when not ready | low | `src/PlaidLink.tsx` |
