/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#171717",
        muted: "#525252",
        line: "#e7e5e4",
        surface: "#f5f5f4",
        canvas: "#fafaf9",
        accent: "#1d5c47",
      },
      maxWidth: {
        shell: "72rem",
      },
    },
  },
  plugins: [],
};
