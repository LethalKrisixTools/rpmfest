import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-darkest': '#060201',
        'bg-dark': '#0e0d12',
        'bg-mid': '#1a090e',
        'red-dark': '#400a10',
        'red-deep': '#651b21',
        'red-brick': '#703939',
        'red-mid': '#942825',
        gold: '#f79f23',
        cream: '#e3d2b8',
        'white-warm': '#eeeeee',
        'text-muted': '#a17467',
        'border-subtle': '#21171e'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
} satisfies Config;
