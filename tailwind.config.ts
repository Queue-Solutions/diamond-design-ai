import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/services/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px"
      }
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        diamond: {
          frost: "#f7fbff",
          silver: "#d8d0c4",
          graphite: "#121212",
          ink: "#0b0b0b",
          champagne: "#d7c49a",
          pearl: "#eee8dc",
          smoke: "#9b9284"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Cormorant Garamond", "Playfair Display", "Georgia", "serif"]
      },
      boxShadow: {
        glow: "0 0 45px rgba(215, 196, 154, 0.12)",
        luxury: "0 30px 90px rgba(0, 0, 0, 0.5)"
      },
      backgroundImage: {
        "diamond-radial":
          "radial-gradient(circle at 50% 0%, rgba(215,196,154,0.14), transparent 28rem), linear-gradient(180deg, #0b0b0b 0%, #10100f 48%, #0b0b0b 100%)"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        }
      },
      animation: {
        shimmer: "shimmer 1.8s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
