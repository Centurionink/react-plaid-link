# AGENTS.md

Guidance for AI agents working on this repository.

## Project Overview

`react-plaid-link` is a React hook and component library that wraps the
[Plaid Link JS SDK](https://plaid.com/docs/link/web/). It is published to npm
and supports React 16.8–19.x.

The library outputs three bundle formats (CJS, ESM, UMD) via Rollup. Source is
TypeScript. Package manager is Yarn 1.x.

## Architecture

| File | Purpose |
|------|---------|
| `src/usePlaidLink.ts` | Primary hook. Loads the Plaid script and manages handler lifecycle. |
| `src/factory.ts` | Wraps `window.Plaid.create()` to manage open/exit/destroy state. |
| `src/PlaidLink.tsx` | Button component wrapping `usePlaidLink`. |
| `src/PlaidEmbeddedLink.tsx` | Embedded iframe variant using `window.Plaid.createEmbedded()`. |
| `src/types/index.ts` | All exported TypeScript types. Source of truth for the public API. |
| `src/react-script-hook/` | Forked script loader. Do not modify without understanding the fork rationale. |
| `src/constants.ts` | Plaid CDN URL constant. |
| `examples/` | Runnable integration examples. Keep in sync with API changes. |

## Key Conventions

### Dependency array in `usePlaidLink`

The `useEffect` in `usePlaidLink.ts` intentionally omits callback props
(`onSuccess`, `onExit`, `onEvent`, `onLoad`) from its dependency array. This
prevents re-creating the Plaid iframe on every render when consumers pass
inline functions.

- If you add options that should trigger re-initialization (e.g., `token`,
  `publicKey`), add them to the dependency array.
- Do not add callbacks to the dependency array.

The `react-hooks/exhaustive-deps` ESLint rule is disabled globally for this
reason.

### Deprecation

`PlaidLinkOptionsWithPublicKey` is deprecated. New features belong only in
`PlaidLinkOptionsWithLinkToken`.

### Type exports

All public types must be exported from `src/types/index.ts` and re-exported
via `src/index.ts`.

### Console usage

`console.error` and `console.warn` are used deliberately in the hook for
SDK-level errors. The `no-console` ESLint rule is off globally. Do not add
`console.log` for debugging.

### `PlaidLink` button and `ready` state

The `PlaidLink` component does not pass `ready` to the button's `disabled`
prop. The button is enabled immediately; clicking before Plaid initializes
triggers a no-op with a console warning. This is intentional. Do not add
`ready` to `disabled` without a major version bump.

## Development Workflow

```sh
make setup       # yarn install
make lint        # ESLint
make test        # Jest (NODE_ENV=test)
make build       # Rollup → dist/
make clean       # rm -rf dist lib
make test-watch  # Jest in watch mode
```

- Node version: see `.nvmrc`. Use `nvm use` or the devcontainer.
- Do not use `npm install`. Use `yarn` or `make setup`.
- A pre-push hook runs `npm run lint` via Husky.

## Testing

- Tests live in `src/*.test.tsx`.
- `useScript` from `./react-script-hook` is always mocked. Do not test script
  loading directly.
- `window.Plaid` must be mocked in `beforeEach`. See `usePlaidLink.test.tsx`
  for the expected mock shape.
- Run `make test` before committing.

## Release Process

See `PUBLISH.md` for the full workflow. Key points:

- Use a `release-x.y.z` branch; do not release from `master`.
- Update `CHANGELOG.md` before running the release command.
- Releases use `make release-(patch|minor|major)` via the `xyz` npm package.

## Known Technical Debt

Do not fix these without discussion:

- `mocha`, `sinon`, `react-tools` in `devDependencies` are unused leftovers
  from a previous test setup.
- Rollup (`^1.27.0`), TypeScript (`^3.8.3`), ESLint (`6.6.0`), and Storybook
  (`^5.x`) are significantly out of date. Upgrades are non-trivial and should
  be done in isolation.
