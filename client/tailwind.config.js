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
    },
  },
  plugins: [],
};
