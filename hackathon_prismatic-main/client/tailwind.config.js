/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0B',
        card: '#111113',
        'card-border': '#1E1E22',
        accent: '#EF4444',
        'accent-amber': '#F59E0B',
        'accent-green': '#22C55E',
        'text-primary': '#F5F5F5',
        'text-secondary': '#9CA3AF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        headline: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Roboto Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
