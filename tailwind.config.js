/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand)",
          pressed: "var(--brand-pressed)",
          soft: "var(--brand-soft)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
        },
        surface: "var(--surface)",
        canvas: "var(--canvas)",
        line: "var(--line)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        tint: {
          1: "var(--tint-1)",
          2: "var(--tint-2)",
          3: "var(--tint-3)",
          4: "var(--tint-4)",
          5: "var(--tint-5)",
          6: "var(--tint-6)",
          7: "var(--tint-7)",
          8: "var(--tint-8)",
        },
      },
      fontFamily: {
        sans: [
          "'Plus Jakarta Sans Variable'",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "14px",
        button: "12px",
        input: "12px",
        image: "10px",
        chip: "9999px",
        pill: "9999px",
      },
      boxShadow: {
        floating: "var(--shadow-floating)",
      },
      transitionDuration: {
        state: "160ms",
        sheet: "240ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
