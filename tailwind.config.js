/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0f172a',
          secondary: '#1e293b',
          tertiary: '#334155',
        },
        accent: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
        text: {
          primary: '#f9fafb',
          secondary: '#cbd5e1',
          muted: '#94a3b8',
        },
        border: {
          subtle: 'rgba(148, 163, 184, 0.1)',
          normal: 'rgba(148, 163, 184, 0.2)',
          strong: 'rgba(148, 163, 184, 0.4)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
