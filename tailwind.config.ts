import type { Config } from "tailwindcss";

/**
 * Identidade visual Hard Cranes.
 * Verde de marca, chumbo (cabeçalho) e branco de conteúdo.
 * Interface de quiosque: botões enormes, alto contraste (chão de fábrica).
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hard: {
          green: "#2D9D4C",
          "green-dark": "#25823E",
          "green-light": "#E7F5EC",
          coal: "#151516",
          "coal-soft": "#26262A",
        },
        alert: {
          red: "#DC2626",
          "red-bg": "#FEE2E2",
          amber: "#D97706",
          "amber-bg": "#FEF3C7",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      minHeight: {
        // Alvo mínimo de toque para uso com luva no chão de fábrica.
        touch: "3.25rem",
        // Cartões e botões gigantes do quiosque.
        kiosk: "9rem",
      },
    },
  },
  plugins: [],
};

export default config;
