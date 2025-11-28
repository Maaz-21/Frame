/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./public/index.html",
    ],
    theme: {
      extend: {
          keyframes: {
            floatAround: {
              '0%':   { transform: 'translate(0, 0)' },
              '10%':  { transform: 'translate(8px, 6px)' },
              '25%':  { transform: 'translate(10vw, 10vh)' },
              '40%':  { transform: 'translate(3vw, -2vh)' },
              '60%':  { transform: 'translate(-2vw, -3vh)' },
              '80%':  { transform: 'translate(6vw, 5vh)' },
              '100%': { transform: 'translate(0, 0)' },
            },
          },
          animation: {
            floatAround: 'floatAround 30s ease-in-out infinite',
          }
      },
    },
  plugins: [],
}

