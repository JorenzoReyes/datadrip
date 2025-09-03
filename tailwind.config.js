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
        'title': ['Vastago Grotesk', 'sans-serif'],
        'sans': ['var(--font-manrope)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
