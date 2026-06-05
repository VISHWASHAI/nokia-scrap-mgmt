/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nokia: {
          blue:    '#0050FF',
          green:   '#00CC44',
          teal:    '#00AACC',
          dark:    '#0A0A14',
          navy:    '#05071A',
          light:   '#EEF3FF',
          muted:   '#6B7A99',
        },
      },
      backgroundImage: {
        'nokia-gradient': 'linear-gradient(135deg, #0050FF 0%, #00AACC 50%, #00CC44 100%)',
        'nokia-gradient-subtle': 'linear-gradient(135deg, #EEF3FF 0%, #E6FAF0 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.10)',
        nokia: '0 4px 24px 0 rgba(0,80,255,0.15)',
      },
    },
  },
  plugins: [],
};
