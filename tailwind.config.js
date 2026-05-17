/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        kazi: {
          green: '#166951',
          'green-dark': '#0f4a39',
          'green-light': '#e4f2ee',
          cream: '#f2f8f6',
          'cream-dark': '#d5ebe4',
          sand: '#9fc8bc',
          charcoal: '#0b2a22',
          'charcoal-light': '#163d30',
          slate: '#1b4d3c',
          'slate-light': '#346b57',
          gold: '#C9A96E',
          'gold-light': '#E0CA9E',
          white: '#FFFFFF',
          offwhite: '#f5faf8',
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Europa Grotesk"', 'sans-serif'],
      },
      spacing: {
        'section': '140px',
        'section-mobile': '80px',
      },
      transitionTimingFunction: {
        'luxury': 'cubic-bezier(.16, 1, .3, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(2.5rem)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'clip-reveal': {
          '0%': { clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)' },
          '100%': { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'line-grow': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        'slide-right': {
          '0%': { opacity: '0', transform: 'translateX(-2rem)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 1s cubic-bezier(.16, 1, .3, 1) forwards',
        'fade-in': 'fade-in 1s cubic-bezier(.16, 1, .3, 1) forwards',
        'clip-reveal': 'clip-reveal 1.2s cubic-bezier(.16, 1, .3, 1) forwards',
        'scale-in': 'scale-in 1s cubic-bezier(.16, 1, .3, 1) forwards',
        'line-grow': 'line-grow 5s linear forwards',
        'slide-right': 'slide-right 1s cubic-bezier(.16, 1, .3, 1) forwards',
      },
    },
  },
  plugins: [],
};
