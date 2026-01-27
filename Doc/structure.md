# Invoice App v2.0 - Project Structure

## 📂 Directory Tree

```
Invoice-App-v2.0/
│
├── 🖥️  Server/                          # Backend (Express.js)
│   ├── index.ts                         # Main server entry
│   ├── routes/
│   │   └── example.routes.ts            # API route example
│   ├── controllers/                     # Business logic
│   ├── middleware/                      # Custom middleware
│   ├── models/                          # Data models
│   └── README.md                        # Server documentation
│
├── 🎨 src/                              # Frontend (React + Vite)
│   │
│   ├── App.tsx                          # Root component
│   ├── main.tsx                         # Entry point
│   │
│   ├── 📄 pages/                        # Page Components
│   │   ├── Login.tsx                    # Authentication
│   │   ├── AdminDashboard.tsx           # Admin overview
│   │   ├── AdminCalendar.tsx            # Calendar management
│   │   ├── ManagerDashboard.tsx         # Manager view
│   │   ├── ManagerTeamView.tsx          # Team management
│   │   ├── ContractorDashboard.tsx      # Contractor home
│   │   ├── ContractorProfile.tsx        # Profile settings
│   │   ├── SubmitHoursPage.tsx          # Time submission
│   │   ├── EmployeeDirectory.tsx        # Employee list
│   │   ├── UserAccessManagement.tsx     # Access control
│   │   ├── ErrorBoundary.tsx            # Error handling
│   │   └── ... (drawers, modals, etc.)
│   │
│   ├── 🧩 components/                   # Reusable Components
│   │   │
│   │   ├── ui/                          # UI Library (shadcn/ui)
│   │   │   ├── index.ts                 # ✨ Barrel export
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   └── ... (40+ components)
│   │   │
│   │   └── shared/                      # Shared Components
│   │       └── figma/
│   │           └── ImageWithFallback.tsx
│   │
│   ├── 📚 lib/                          # Library Code
│   │   │
│   │   ├── data/                        # Data Layer
│   │   │   ├── mockData.ts              # Mock data
│   │   │   └── index.ts                 # Data exports
│   │   │
│   │   ├── types/                       # TypeScript Types
│   │   │   └── index.ts                 # Type definitions
│   │   │
│   │   └── utils/                       # Utilities
│   │       ├── cn.ts                    # Tailwind utility
│   │       └── index.ts                 # Util exports
│   │
│   └── 🎨 styles/                       # Global Styles
│       ├── index.css                    # Main stylesheet
│       ├── tailwind.css                 # Tailwind directives
│       ├── theme.css                    # Theme variables
│       └── fonts.css                    # Font definitions
│
├── 📦 public/                           # Static Assets
│   └── (images, icons, etc.)
│
├── 🏗️  dist/                            # Build Output
│   └── (generated files)
│
├── ⚙️  Configuration Files
│   ├── package.json                     # Dependencies & scripts
│   ├── tsconfig.json                    # TS config (frontend)
│   ├── tsconfig.server.json             # TS config (backend)
│   ├── tsconfig.node.json               # TS config (build tools)
│   ├── vite.config.ts                   # Vite configuration
│   ├── tailwind.config.ts               # Tailwind config
│   ├── postcss.config.mjs               # PostCSS config
│   ├── nodemon.json                     # Nodemon config
│   ├── .env                             # Environment variables
│   ├── env.example                      # Env template
│   └── .gitignore                       # Git ignore rules
│
└── 📖 Documentation
    ├── README.md                        # Main documentation
    ├── REFACTORING_NOTES.md             # Refactoring details
    ├── STRUCTURE.md                     # This file
    ├── QUICK_START.md                   # Quick start guide
    ├── DEPLOYMENT.md                    # Deployment guide
    ├── PRODUCTION_CHECKLIST.md          # Production checklist
    └── guidelines/
        └── Guidelines.md                # Development guidelines
```

## 🎯 Key Directories Explained

### `/Server` - Backend API
Express.js server handling all backend operations:
- REST API endpoints
- Authentication & authorization
- Database operations
- Business logic

**Port:** 5001  
**Tech:** Express, TypeScript, Node.js

### `/src/pages` - Page Components
Top-level components representing full pages/views:
- Each file = one page/screen
- Contains page-specific logic
- Imports from components/ui and lib

**Examples:**
- `Login.tsx` - Authentication page
- `AdminDashboard.tsx` - Admin overview
- `ContractorDashboard.tsx` - Contractor home

### `/src/components/ui` - UI Components
Reusable UI components from shadcn/ui:
- Low-level components (buttons, inputs, cards)
- Styled with Tailwind CSS
- Accessible and customizable
- Exported via `index.ts` for clean imports

**Usage:**
```typescript
import { Button, Card, Input } from "../components/ui";
```

### `/src/components/shared` - Shared Components
Custom reusable components:
- Business-specific components
- Composed from UI components
- Used across multiple pages

### `/src/lib` - Library Code
Core utilities, types, and data:

**`lib/data/`** - Data layer
- Mock data for development
- API response types
- Data transformation utilities

**`lib/types/`** - TypeScript types
- Interface definitions
- Type aliases
- Shared types across app

**`lib/utils/`** - Utility functions
- Helper functions
- Common operations
- Reusable logic

## 🔄 Import Patterns

### ✅ Correct Import Patterns

```typescript
// Pages
import { Login } from "./pages/Login";
import { AdminDashboard } from "./pages/AdminDashboard";

// UI Components (with barrel export)
import { Button, Card, Input } from "./components/ui";

// UI Components (direct import)
import { Button } from "./components/ui/button";

// Data & Types
import { mockData } from "./lib/data";
import type { User, Employee } from "./lib/types";

// Utils
import { cn } from "./lib/utils";
```

### ❌ Avoid These Patterns

```typescript
// Don't use old paths
import { Login } from "./app/components/pages/Login"; // ❌
import { Button } from "./app/components/ui/button"; // ❌

// Don't skip proper structure
import { mockData } from "./data/mockData"; // ❌
import type { User } from "./types"; // ❌
```

## 🚀 Development Workflow

### Starting Development
```bash
# Start both frontend and backend
npm run dev

# Or start separately
npm run dev:client   # Frontend only (port 5173)
npm run dev:server   # Backend only (port 5001)
```

### Building for Production
```bash
# Build frontend
npm run build

# Build backend
npm run build:server

# Preview production build
npm run preview
```

### File Organization Tips

1. **Pages** - One page per file, named after the route
2. **Components** - Small, reusable, single responsibility
3. **Lib** - Pure functions, no React dependencies
4. **Types** - Shared types in lib/types, local types in same file

## 📊 File Count Summary

- **Pages:** 20 components
- **UI Components:** 45+ components
- **Server Routes:** 1 example (expandable)
- **Total TypeScript Files:** 70+

## 🔗 Related Documentation

- [REFACTORING_NOTES.md](./REFACTORING_NOTES.md) - Detailed refactoring changes
- [Server/README.md](./Server/README.md) - Backend documentation
- [QUICK_START.md](./QUICK_START.md) - Getting started guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions

---

**Last Updated:** January 6, 2026  
**Structure Version:** 2.0  
**Based on:** [Blank-React-Repo](https://github.com/erinskieasy/Blank-React-Repo)

