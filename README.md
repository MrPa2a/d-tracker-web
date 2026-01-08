# 📊 Dofus Tracker Web

> A modern, feature-rich web dashboard for real-time market analytics in the MMORPG Dofus. Built with **React 18**, **TypeScript**, **Vite**, and **Tailwind CSS**.

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?style=flat-square&logo=tailwindcss)

---

## 🎯 Project Overview

**Dofus Tracker Web** is the frontend dashboard of a full-stack market intelligence platform. It provides players with actionable insights by analyzing thousands of in-game item prices collected in real-time via packet sniffing.

This project demonstrates proficiency in:
- **Modern React patterns** (hooks, context, custom hooks for data fetching)
- **TypeScript** for type-safe development
- **Data visualization** with interactive charts and sparklines
- **Complex state management** with TanStack Query (React Query)
- **Responsive UI/UX design** with Tailwind CSS
- **RESTful API integration** with a serverless backend

---

## ✨ Key Features

### 📈 Market Analytics Dashboard
- **Real-time market indexes** tracking overall market health per server
- **Top movers** displaying items with biggest price changes
- **Investment opportunities** using statistical analysis (moving averages, volatility)
- **Sell signals** when items are trading above their historical average

### 🔍 Opportunity Scanner
- Multi-criteria filtering (profit margin, freshness, volatility)
- Category-based filtering for targeted searches
- URL-persisted filter state for shareable searches

### 💰 Bank Management
- Personal inventory tracking with real-time valuations
- **Sell opportunities** highlighting overpriced items in your bank
- Craft opportunity detection for profitable crafting
- Historical progression tracking

### 🛠️ Crafting Market
- **Recipe profitability calculator** with ROI analysis
- Job-based filtering (Alchemist, Jeweler, Tailor, etc.)
- Ingredient price tracking with partial data indicators

### 📋 List Management
- Custom watchlists for tracking specific items
- Profile-based data isolation for multi-account support

### 📉 Advanced Visualizations
- **Interactive price charts** with Recharts
- **Sparkline mini-charts** for quick trend overview
- Time range presets (7d, 30d, 90d, 365d)

---

## 🏗️ Architecture & Technical Highlights

### Frontend Architecture
```
src/
├── api.ts              # Centralized API client with type-safe fetch wrappers
├── types.ts            # Shared TypeScript interfaces (~400 lines)
├── components/         # Reusable UI components
│   ├── bank/           # Bank-specific components (summary cards, opportunities)
│   ├── messages/       # Real-time messaging system
│   └── ...             # Modals, charts, filters, context menus
├── hooks/              # Custom React hooks for data fetching
│   ├── useMarketData.ts    # Market analytics (movers, volatility, opportunities)
│   ├── useBank.ts          # Bank data management
│   ├── useCraftOpportunities.ts  # Crafting calculations
│   └── ...
├── pages/              # Route-level components
│   ├── Dashboard.tsx       # Main analytics view
│   ├── MarketScannerPage.tsx   # Opportunity scanner
│   ├── CraftingMarketPage.tsx  # Recipe profitability
│   └── ...
└── layouts/            # Shared layout components (Header, Sidebar)
```

### Key Technical Decisions

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **State Management** | TanStack Query | Efficient server-state caching, background refetching, optimistic updates |
| **Routing** | React Router v7 | URL-based state persistence, deep linking support |
| **Styling** | Tailwind CSS v4 | Rapid UI development, consistent design system, dark mode support |
| **Charts** | Recharts | Declarative, composable, great React integration |
| **Build Tool** | Vite | Fast HMR, optimized production builds |
| **Type Safety** | TypeScript | ~400 lines of type definitions ensuring API contract safety |

### Custom Hooks Pattern
The application leverages a clean hooks-based architecture for data fetching:

```typescript
// Example: Market data hooks composition
const { data: movers } = useMovers(server, dateRange);
const { data: opportunities } = useOpportunities(server, minPrice, maxPrice);
const { data: volatility } = useVolatilityRankings(server, dateRange);
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/dofus-tracker.git
cd dofus-tracker/dofus-tracker-web

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API URL
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API endpoint | `https://api.example.com` |
| `VITE_API_TOKEN` | (Optional) Bearer token for authentication | `your-token` |

### Development

```bash
# Start development server with HMR
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📁 Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/components/` | Reusable UI components (modals, charts, filters) |
| `src/pages/` | Route-level page components |
| `src/hooks/` | Custom React hooks for API data fetching |
| `src/layouts/` | Shared layout components (Header, Sidebar, MainLayout) |
| `src/assets/` | Static assets (icons, images) |
| `public/` | Static files served at root |

---

## 🔗 Related Projects

This frontend is part of the **Dofus Tracker** ecosystem:

- **[Backend API](https://github.com/MrPa2a/d-tracker-backend)** — Serverless API (Node.js, TypeScript, Vercel, Supabase)
- **[Client V3](https://github.com/MrPa2a/d-tracker-client-sniffing)** — Network packet sniffer (Python, Scapy) for real-time data capture

---

## 📄 License

This project is for educational and portfolio purposes. Dofus is a registered trademark of Ankama Games.
