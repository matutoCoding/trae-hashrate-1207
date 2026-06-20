/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        sandalwood: {
          50: "#f7f5f4",
          100: "#ebe5e2",
          200: "#d6cbc5",
          300: "#b9a79e",
          400: "#9a8278",
          500: "#7d655b",
          600: "#655048",
          700: "#513f3a",
          800: "#453531",
          900: "#3E2723",
          950: "#2a1a17",
        },
        gold: {
          50: "#fbf8ed",
          100: "#f5ecc9",
          200: "#ecd68b",
          300: "#e3bd57",
          400: "#d4af37",
          500: "#c29825",
          600: "#a5761e",
          700: "#86591c",
          800: "#70481e",
          900: "#603c1e",
          950: "#381f0d",
        },
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        warmGray: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
          950: "#0c0a09",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"Noto Sans SC"', "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      boxShadow: {
        "card": "0 2px 8px -2px rgba(62, 39, 35, 0.08), 0 4px 16px -4px rgba(62, 39, 35, 0.06)",
        "card-hover": "0 8px 24px -4px rgba(62, 39, 35, 0.12), 0 16px 48px -8px rgba(62, 39, 35, 0.1)",
      },
    },
  },
  plugins: [],
};
