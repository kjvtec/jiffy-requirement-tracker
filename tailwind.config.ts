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
      },
      fontFamily: {
        sans: sansStack,
        serif: sansStack,
        mono: monoStack,
      },
    },
  },
  plugins: [],
};
export default config;
