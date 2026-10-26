/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
        "2xl": "3rem",
      },
    },
    extend: {
      // ---------------- 深色质感色板 ----------------
      colors: {
        // 页面底色：越靠后越深
        ink: {
          50: "#f4f6fb",
          100: "#e6eaf3",
          200: "#c8d0e0",
          300: "#9aa7c2",
          400: "#6b7a99",
          500: "#48566f",
          600: "#2f3a52",
          700: "#1f2739",
          800: "#141a28",
          850: "#111827",
          900: "#0B0F17",
          950: "#060911",
        },
        // 品牌强调色：紫蓝青渐变三色
        brand: {
          blue: "#3b82f6",
          indigo: "#6366f1",
          purple: "#a855f7",
          cyan: "#22d3ee",
          teal: "#2dd4bf",
        },
        // 语义色
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#f87171",
        info: "#38bdf8",
      },

      // ---------------- 字体 ----------------
      fontFamily: {
        // 中文优先的系统字体栈：不依赖任何外部字体请求，加载零延迟
        sans: [
          '"PingFang SC"',
          '"HarmonyOS Sans SC"',
          '"Microsoft YaHei"',
          '"Source Han Sans SC"',
          '"Noto Sans SC"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        // 长文阅读字体：衬线体提升阅读舒适度
        serif: [
          '"Songti SC"',
          '"Source Han Serif SC"',
          '"Noto Serif SC"',
          "Georgia",
          '"Times New Roman"',
          "serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"Cascadia Code"',
          "Consolas",
          '"Courier New"',
          "monospace",
        ],
      },

      // ---------------- 尺寸 ----------------
      maxWidth: {
        content: "72rem",
        prose: "46rem",
      },

      // ---------------- 圆角 ----------------
      borderRadius: {
        "4xl": "2rem",
      },

      // ---------------- 阴影 / 发光 ----------------
      boxShadow: {
        glass:
          "0 8px 32px 0 rgba(2, 6, 23, 0.55), inset 0 1px 0 0 rgba(255,255,255,0.05)",
        "glass-hover":
          "0 20px 48px -12px rgba(99, 102, 241, 0.45), inset 0 1px 0 0 rgba(255,255,255,0.08)",
        glow: "0 0 24px -4px rgba(99, 102, 241, 0.55)",
        "glow-lg": "0 0 48px -6px rgba(139, 92, 246, 0.55)",
        "glow-cyan": "0 0 28px -6px rgba(34, 211, 238, 0.55)",
        card: "0 4px 24px -8px rgba(0, 0, 0, 0.6)",
        "inner-glow": "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },

      // ---------------- 背景图 ----------------
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #a855f7 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(99,102,241,0.18) 50%, rgba(168,85,247,0.18) 100%)",
        "cyan-gradient":
          "linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%)",
        "mesh-dark":
          "radial-gradient(at 18% 10%, rgba(59,130,246,0.16) 0px, transparent 55%), radial-gradient(at 82% 8%, rgba(168,85,247,0.16) 0px, transparent 55%), radial-gradient(at 50% 95%, rgba(34,211,238,0.10) 0px, transparent 55%)",
        "grid-lines":
          "linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)",
      },

      backgroundSize: {
        grid: "44px 44px",
      },

      // ---------------- 动画 ----------------
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "gradient-x": {
          "0%, 100%": {
            "background-position": "0% 50%",
          },
          "50%": {
            "background-position": "100% 50%",
          },
        },
        shimmer: {
          "0%": { "background-position": "-500px 0" },
          "100%": { "background-position": "500px 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.85)", opacity: "0.7" },
          "70%": { transform: "scale(1.4)", opacity: "0" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        "heart-pop": {
          "0%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.35)" },
          "70%": { transform: "scale(0.92)" },
          "100%": { transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        float: "float 6s ease-in-out infinite",
        "gradient-x": "gradient-x 8s ease infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.24, 0, 0.38, 1) infinite",
        "heart-pop": "heart-pop 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-right": "slide-in-right 0.3s ease-out both",
        "spin-slow": "spin-slow 2.4s linear infinite",
      },

      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },

  // ---------------- DaisyUI 主题 ----------------
  daisyui: {
    logs: false,
    themes: [
      {
        moyun: {
          primary: "#6366f1",
          "primary-content": "#eef2ff",
          secondary: "#a855f7",
          "secondary-content": "#faf5ff",
          accent: "#22d3ee",
          "accent-content": "#083344",
          neutral: "#141a28",
          "neutral-content": "#c8d0e0",
          "base-100": "#0B0F17",
          "base-200": "#111827",
          "base-300": "#141a28",
          "base-content": "#e6eaf3",
          info: "#38bdf8",
          success: "#34d399",
          warning: "#fbbf24",
          error: "#f87171",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "1.9rem",
          "--animation-btn": "0.25s",
          "--animation-input": "0.2s",
          "--btn-focus-scale": "0.98",
          "--border-btn": "1px",
          "--tab-border": "1px",
          "--tab-radius": "0.75rem",
        },
      },
    ],
  },

  plugins: [],
};
