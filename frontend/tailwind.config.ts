import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cowboy theme colors
        'cowboy': {
          'brown': '#8B4513',
          'tan': '#D2B48C',
          'leather': '#964B00',
          'gold': '#FFD700',
          'rust': '#B7410E',
          'sand': '#F4A460',
          'dark': '#654321',
          'cream': '#FFF8DC',
        },
        // Additional western colors
        'western': {
          'sunset': '#FF6B35',
          'desert': '#FFAB91',
          'sage': '#9CAF88',
          'denim': '#4F6D8E',
        }
      },
      fontFamily: {
        'cowboy': ['Georgia', 'serif'],
        'western': ['Courier New', 'monospace'],
      },
      backgroundImage: {
        'wood-grain': "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGRlZnM+CjxwYXR0ZXJuIGlkPSJ3b29kIiB4PSIwIiB5PSIwIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgo8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiM4QjQ1MTMiLz4KPC9wYXR0ZXJuPgo8L2RlZnM+CjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0idXJsKCN3b29kKSIvPgo8L3N2Zz4=')",
        'leather-texture': "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGRlZnM+CjxwYXR0ZXJuIGlkPSJsZWF0aGVyIiB4PSIwIiB5PSIwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPgo8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiM5NjRCMDAiLz4KPC9wYXR0ZXJuPgo8L2RlZnM+CjxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0idXJsKCNsZWF0aGVyKSIvPgo8L3N2Zz4=')",
      },
      animation: {
        'dust': 'dust 3s ease-in-out infinite',
        'gallop': 'gallop 1s ease-in-out infinite',
        'swing': 'swing 2s ease-in-out infinite',
      },
      keyframes: {
        dust: {
          '0%, 100%': { opacity: '0', transform: 'translateY(0px)' },
          '50%': { opacity: '1', transform: 'translateY(-10px)' },
        },
        gallop: {
          '0%, 100%': { transform: 'translateX(0px)' },
          '50%': { transform: 'translateX(4px)' },
        },
        swing: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
    },
  },
  plugins: [],
}
export default config