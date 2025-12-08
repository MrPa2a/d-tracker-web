#  Dofus Tracker Web

The modern web dashboard for visualizing Dofus market data. Built with **React**, **Vite**, and **Tailwind CSS**.

##  Features

*   **Interactive Charts**: Price history visualization using `Recharts`.
*   **Market Dashboard**: Real-time view of market indexes and top movers.
*   **Opportunity Scanner**: Automatically highlights items with high profit potential based on statistical analysis.
*   **Responsive Design**: Fully responsive UI built with Tailwind CSS.
*   **Dark Mode**: Optimized for long gaming sessions.

##  Tech Stack

*   **Framework**: React 18
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS
*   **State Management**: React Query (TanStack Query)
*   **Charts**: Recharts
*   **Icons**: Lucide React

##  Getting Started

1.  **Install Dependencies**:
    `ash
    npm install
    ` 

2.  **Environment Variables**:
    Create a `.env` file:
    `env
    VITE_API_URL=http://localhost:3000/api  # Or your production URL
    ` 

3.  **Run Development Server**:
    `ash
    npm run dev
    ` 

4.  **Build for Production**:
    `ash
    npm run build
    ` 

##  Project Structure

*   `src/components/`: Reusable UI components.
*   `src/pages/`: Main application views (Dashboard, Item Details, etc.).
*   `src/hooks/`: Custom React hooks for data fetching.
*   `src/lib/`: Utility functions and API clients.
