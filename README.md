# TournaGen

**Formerly Tournament Generator**

A client-side tournament management web application for creating and managing various tournament formats. Built with Astro, React, TypeScript, and Tailwind CSS v4. All data is stored in browser localStorage—no backend required.

## Features

- **5 Tournament Types:**
  - Single Elimination (with optional 3rd place match)
  - Double Elimination (with optional split start)
  - Round Robin (1-3 rounds, rank by wins or points)
  - Swiss System (configurable scoring, auto-pairing)
  - Free For All (multiple participants per match)

- **Client-Side Only:** No backend or account required—all data stored in browser localStorage
- **Import/Export:** Save and share tournaments as JSON files
- **Internationalization:** Full support for English and Danish (default), Weblate-ready for community translations
- **Modern UI:** Clean, responsive interface built with Shadcn UI and Tailwind CSS v4
- **Type-Safe:** 100% TypeScript with discriminated unions for reliability

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (http://localhost:4321/)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **Framework:** [Astro](https://astro.build/) with [React](https://react.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [Shadcn UI](https://ui.shadcn.com/)
- **i18n:** [i18next](https://www.i18next.com/) with [react-i18next](https://react.i18next.com/)
- **Storage:** Browser localStorage

## Project Structure

```
src/
├── lib/
│   ├── tournaments/           # Tournament logic
│   │   ├── types/            # Tournament implementations
│   │   │   ├── SingleElimination.ts
│   │   │   ├── DoubleElimination.ts
│   │   │   ├── RoundRobin.ts
│   │   │   ├── Swiss.ts
│   │   │   └── FreeForAll.ts
│   │   ├── BaseTournament.ts # Abstract base class
│   │   ├── types.ts          # TypeScript types & discriminated unions
│   │   └── factory.ts        # Tournament factory
│   ├── storage/
│   │   └── localStorage.ts   # Persistence layer
│   └── i18n/
│       └── config.ts         # i18n configuration
├── locales/                  # Translation files (Weblate-ready)
│   ├── en/translations.json
│   └── da/translations.json
├── components/
│   ├── tournament/           # Tournament UI components
│   │   ├── brackets/        # Bracket visualization
│   │   ├── TournamentDashboard.tsx
│   │   ├── TournamentCreate.tsx
│   │   └── TournamentView.tsx
│   ├── ui/                  # Shadcn UI components (auto-generated)
│   ├── TournamentApp.tsx    # Main app component
│   └── LandingPage.tsx      # Landing page
└── pages/
    └── index.astro          # Entry point
```

## Architecture

### Core Design Patterns

- **Factory Pattern:** Type-based tournament creation via `createTournament()`
- **Discriminated Unions:** Type-safe state management with TypeScript
- **Abstract Base Class:** `BaseTournament` provides shared functionality
- **Object-Oriented:** Each tournament type is a class extending `BaseTournament`
- **SSR-Safe:** All browser API access is guarded for Astro compatibility

### Tournament Lifecycle

1. **Create:** `createTournament(options)` → returns tournament instance
2. **Start:** Call `.start()` to generate initial matches/bracket
3. **Update:** Call `.recordMatchResult(matchId, result)` to advance state
4. **Persist:** Call `.export()` to get serializable state → save to localStorage
5. **Restore:** Load state from localStorage → `restoreTournament(state)`

Tournament instances are ephemeral—created, mutated, exported, and destroyed. Fresh instances are created from saved state when reloaded.

## Development

### Adding a New Tournament Type

See [CLAUDE.md](CLAUDE.md) for detailed instructions. Quick overview:

1. Add type to `TournamentType` union in [src/lib/tournaments/types.ts](src/lib/tournaments/types.ts)
2. Create `Options` and `State` interfaces extending base types
3. Create implementation class in `src/lib/tournaments/types/NewType.ts`
4. Update factory functions in [src/lib/tournaments/factory.ts](src/lib/tournaments/factory.ts)
5. Add UI components and translations

### Path Aliases

TypeScript path alias `@/*` maps to `src/*`:
```typescript
import { Button } from '@/components/ui/button';
import { createTournament } from '@/lib/tournaments/factory';
```

### Key Files

- **[CLAUDE.md](CLAUDE.md):** Detailed project documentation for AI-assisted development
- **[components.json](components.json):** Shadcn UI configuration
- **[tsconfig.json](tsconfig.json):** TypeScript configuration with path aliases

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript and localStorage support

## License

GNU Affero General Public License v3.0

