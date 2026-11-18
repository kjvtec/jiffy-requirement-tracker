import type { Config } from "tailwindcss";

const sansStack = [
  "var(--font-noto-sans-thai)",
  "Noto Sans Thai",
  "Segoe UI",
  "Tahoma",
  "sans-serif",
];

const monoStack = [
  "var(--font-jetbrains-mono)",
  "JetBrains Mono",
  "ui-monospace",
  "SFMono-Regular",
  "Menlo",
  "Monaco",
  "Consolas",
  "monospace",
];

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/types/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Jiffy corporate identity
        jiffy: {
          ink: "#06142E", // deepest navy: headings, nav bar
          navy: "#044492", // primary brand
          blue: "#0086FF", // interactive / links / focus
          sky: "#EFF7FF", // tinted surfaces
          mist: "#DCEBFF", // tinted borders
          yellow: "#FFCB06", // the single call-to-action colour
          gold: "#E5B600", // yellow hover
        },
        canvas: "#F3F6FB", // page background
        line: "#DCE5F2", // default border
      },
      fontFamily: {
        sans: sansStack,
        serif: sansStack,
        mono: monoStack,
      },
      boxShadow: {
        card: "0 1px 2px rgba(6, 20, 46, 0.06), 0 1px 3px rgba(6, 20, 46, 0.04)",
        raised: "0 4px 12px -2px rgba(6, 20, 46, 0.12), 0 2px 4px rgba(6, 20, 46, 0.06)",
        pop: "0 20px 48px -12px rgba(6, 20, 46, 0.32)",
      },
    },
  },
  plugins: [],
};
export default config;
