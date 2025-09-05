/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'title': ['var(--font-space-grotesk)', 'Space Grotesk', 'sans-serif'],
        'sans': ['var(--font-manrope)', 'Manrope', 'sans-serif'],
      },
      colors: {
        'primary': {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#2F8556',
          600: '#276749',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        'header': '#1B4332',
        'subheader': '#6C757D',
        'background': '#FDFDFD',
        'card': '#FFFFFF',
        'border': '#E5E7EB',
      },
    },
  },
  plugins: [],
}
