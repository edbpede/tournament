# Tournament Generator

A client-side web application for creating and managing various tournament formats. Built with Astro, React, TypeScript, and Tailwind CSS v4.

## Features

- **5 Tournament Types:**
  - Single Elimination (with optional 3rd place match)
  - Double Elimination (with optional split start)
  - Round Robin (1-3 rounds, rank by wins or points)
  - Swiss System (configurable scoring, auto-pairing)
  - Free For All (multiple participants per match)

- **Internationalization:** Full support for English and Danish (default), with Weblate-ready translation files
- **Client-Side Only:** No backend required, all data stored in browser localStorage
- **Import/Export:** Save and share tournaments as JSON files
- **Real-Time Updates:** Live standings and match tracking
- **Modern UI:** Clean, responsive interface with Tailwind CSS v4
- **Type-Safe:** 100% TypeScript for reliability

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The application will be available at `http://localhost:4321/`

## Documentation

- **[Tournament Guide](TOURNAMENT_GUIDE.md)** - Complete user guide for all tournament types
- **[Architecture](ARCHITECTURE.md)** - Technical architecture and design decisions
- **[I18N Setup](I18N_SETUP.md)** - Internationalization implementation and usage guide
- **[CLAUDE.md](CLAUDE.md)** - Project guidance for Claude Code

## Tech Stack

- **Framework:** [Astro](https://astro.build/) with [React](https://react.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **i18n:** [i18next](https://www.i18next.com/) with [react-i18next](https://react.i18next.com/)
- **Storage:** Browser localStorage

## Project Structure

```
src/
├── lib/
│   ├── tournaments/         # Tournament logic
│   │   ├── types/          # Tournament implementations
│   │   ├── BaseTournament.ts
│   │   ├── types.ts        # TypeScript types
│   │   └── factory.ts      # Tournament factory
│   ├── storage/
│   │   └── localStorage.ts # Persistence layer
│   └── i18n/
│       └── config.ts       # i18n configuration
├── locales/                # Translation files (Weblate-ready)
│   ├── en/                 # English translations
│   │   └── translations.json
│   └── da/                 # Danish translations
│       └── translations.json
├── components/
│   ├── tournament/         # Tournament UI components
│   │   ├── TournamentDashboard.tsx
│   │   ├── TournamentCreate.tsx
│   │   └── TournamentView.tsx
│   ├── TournamentApp.tsx   # Main app component
│   └── LanguageSwitcher.tsx # Language switcher
└── pages/
    └── index.astro         # Entry point
```

## Usage

1. **Create a Tournament:** Click "New Tournament" and select a type
2. **Configure Options:** Set tournament-specific options (3rd place match, scoring rules, etc.)
3. **Add Participants:** Add participant names (minimum 2)
4. **Record Matches:** Click matches to record results
5. **View Standings:** See live rankings updated after each match
6. **Export/Import:** Save tournaments to JSON or load existing ones

## Development

### Adding a New Tournament Type

1. Create implementation in `src/lib/tournaments/types/NewType.ts` extending `BaseTournament`
2. Add type to `TournamentType` union in `types.ts`
3. Add state interface extending `BaseTournamentState`
4. Update factory in `factory.ts`
5. (Optional) Create custom UI view component

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed extension guide.

### Key Design Patterns

- **Factory Pattern:** Create tournaments based on type
- **Discriminated Unions:** Type-safe state management
- **Abstract Base Class:** Shared tournament functionality
- **localStorage Service:** Centralized persistence

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript and localStorage support

## License

MIT License

---

**Built with Astro + Tailwind CSS v4**
