/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
        accent: '#34d399',
      },
      keyframes: {
        floatAround: {
          '0%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(8px, 6px)' },
          '25%': { transform: 'translate(10vw, 10vh)' },
          '40%': { transform: 'translate(3vw, -2vh)' },
          '60%': { transform: 'translate(-2vw, -3vh)' },
          '80%': { transform: 'translate(6vw, 5vh)' },
          '100%': { transform: 'translate(0, 0)' },
        },
        typewriter: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '15%': { opacity: 1, transform: 'translateY(0)' },
          '85%': { opacity: 1, transform: 'translateY(0)' },
          '100%': { opacity: 0, transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(52,211,153,0.5)' },
          '70%': { boxShadow: '0 0 0 8px rgba(52,211,153,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(52,211,153,0)' },
        },
        floatUp: {
          '0%': { opacity: 1, transform: 'translateY(0) scale(1)' },
          '100%': { opacity: 0, transform: 'translateY(-120px) scale(1.4)' },
        },
        meshMove: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        breathe: {
          '0%, 100%': { opacity: 0.7, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.05)' },
        },
      },
      animation: {
        floatAround: 'floatAround 30s ease-in-out infinite',
        typewriter: 'typewriter 3s ease-in-out infinite',
        shimmer: 'shimmer 3s ease-in-out infinite',
        pulseRing: 'pulseRing 1.5s ease-out infinite',
        floatUp: 'floatUp 2s ease-out forwards',
        meshMove: 'meshMove 15s ease-in-out infinite',
        breathe: 'breathe 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
