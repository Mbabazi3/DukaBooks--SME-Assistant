# GPT Platform SDK Lab

Two ways of testing [`@gpt-platform/client`](https://www.npmjs.com/package/@gpt-platform/client):

| Folder | What it is | Needs credentials? |
|---|---|---|
| [`sdk-contract-tests/`](sdk-contract-tests/) | Offline Vitest suite: a fake platform checks every request the SDK builds and how it unwraps responses | No |
| [`dukabooks-app/`](dukabooks-app/) | DukaBooks, a Nuxt 3 SME app. Frontend in `pages/`, backend in `server/api/` calling the real SDK | Yes |

The contract tests prove each SDK call in isolation; the app proves the calls
work together as a product.

## Quick start

```bash
npm run install:all       # installs both folders (use `npx -y npm@11` if local npm misbehaves)
npm test                  # run all SDK contract tests
# put your GPT Platform settings in dukabooks-app/.env (see dukabooks-app/README.md)
npm run dev               # DukaBooks on http://localhost:3000
```

## Docs

- [`sdk-contract-tests/TEST-NOTES.md`](sdk-contract-tests/TEST-NOTES.md): every verified call, endpoint shapes, SDK findings
- [`dukabooks-app/BACKEND-NEEDS.md`](dukabooks-app/BACKEND-NEEDS.md): what each screen needs, route → SDK map, questions for the platform team
- [`HANDOFF.md`](HANDOFF.md): project status and next phases

## License

No license has been selected yet.
