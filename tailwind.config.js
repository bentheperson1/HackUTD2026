/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0D11',
        card: '#151921',
        cardHover: '#1C212C',
        border: '#262C38',
        hazard: {
          yellow: '#F59E0B',
          bright: '#FACC15',
          dark: '#B45309',
        },
      },
    },
  },
  plugins: [],
}

