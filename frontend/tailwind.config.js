// tailwind.config.js
import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/react/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  /**
   * TODO: Add a dark class to <body> or root for dark mode depending on client preference. @custom-variant dark (&:is(.dark *)) 
   * in hero.ts is also involved;
  */
  darkMode: "class", 
  plugins: [heroui()],
};