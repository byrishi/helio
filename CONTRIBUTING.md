# Contributing to Helio

Thanks for helping! Issues and pull requests are welcome.

## Setup
```bash
git clone https://github.com/byrishi/helio.git && cd helio
npm install
cp .env.example .env.local   # optional: only needed for real data
npm run dev                  # http://localhost:3000/demo for sample data
```

## Before opening a PR
- `npm run typecheck` and `npm run build` pass.
- Check `/demo` on a phone-width window (390px) and in dark mode.
- If you touched `lib/shinemonitor.ts`, test with a real account (`npm run test:login`).
- Keep PRs focused; describe what changed and why.

## Wanted

See [Limitations](docs/limitations.md) for context.

- Other monitoring clouds: Solarman, Growatt, SolisCloud, Sungrow iSolarCloud
- Battery / hybrid inverter views
- Translations
- Optional shared rate-limit store and per-person accounts

## Code style
TypeScript, Tailwind CSS v4, components in `components/`, UI primitives in `components/ui/` (Watermelon UI / shadcn). Prefer small, readable functions over abstractions.
