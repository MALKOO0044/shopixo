/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/app/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#5D5FEF",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#00D4FF",
          foreground: "#0f172a",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
      },
    },
  },
  plugins: [],
}
