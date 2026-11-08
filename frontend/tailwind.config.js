/**
 * Not used by Tailwind v4: the real design tokens live in src/index.css (@theme).
 * Kept only so editors that read this file see the same palette.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F1115',
        surface: '#1A1D24',
        accent: '#06B6D4',
        drill: '#F59E0B',
        breach: '#DC2626',
      },
    },
  },
  plugins: [],
};
