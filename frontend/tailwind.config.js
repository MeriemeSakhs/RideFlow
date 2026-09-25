/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        spotify: {
          green:   '#1DB954',
          'green-hover': '#1ed760',
          black:   '#121212',
          dark:    '#181818',
          card:    '#282828',
          hover:   '#333333',
          muted:   '#B3B3B3',
        },
        // RideFlow brand palette (marketing site) - see components/landing/
        rideflow: {
          navy: '#172643',
          'navy-light': '#22335a',
          orange: '#FFA313',
          'orange-hover': '#e6920a',
          gray: '#E5E5E5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
