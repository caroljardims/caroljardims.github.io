/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        peachy: {
          50: '#F8EDEB',
          100: '#FAE1DD',
          200: '#FCD5CE',
          300: '#FEC5BB',
          400: '#FFE5D9',
          500: '#FFD7BA',
          600: '#FEC89A',
          700: '#ECE4DB',
        },
        neutral: {
          50: '#F8EDEB',
          100: '#E8E8E4',
          200: '#D8E2DC',
        },
        primary: '#FEC89A',
        dark: '#0f172a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};
