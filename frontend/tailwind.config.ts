import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Premium space-gray canvas ──────────────────────
        canvas: {
          DEFAULT:  '#0B0F19',
          mid:      '#0D1117',
          surface:  '#111827',
          card:     '#141B2D',
          elevated: '#1A2235',
          hover:    '#1E2A3F',
          border:   '#1E2A3F',
        },
        // ── Cyber-blue primary accent (Gemini blue) ────────
        blue: {
          glow:   '#3B82F6',
          light:  '#60A5FA',
          dim:    '#93C5FD',
          bg:     'rgba(59,130,246,0.1)',
          border: 'rgba(59,130,246,0.25)',
          shadow: 'rgba(59,130,246,0.3)',
        },
        // ── Priority (calm, Gemini-tuned) ──────────────────
        priority: {
          business: '#F87171',
          personal: '#FBBF24',
          general:  '#34D399',
        },
        // ── WhatsApp / Outlook ─────────────────────────────
        wa: { DEFAULT: '#25D366', dark: '#128C7E' },
        outlook: { DEFAULT: '#0078D4' },
      },
      // ── Glassmorphism shadows ──────────────────────────
      boxShadow: {
        glass:    '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        card:     '0 4px 24px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.15)',
        'blue-glow':  '0 0 15px rgba(59,130,246,0.3)',
        'blue-glow-lg': '0 0 30px rgba(59,130,246,0.2)',
      },
      // ── Typography ─────────────────────────────────────
      fontFamily: {
        sans: ['-apple-system','BlinkMacSystemFont','Segoe UI','Inter','system-ui','sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:    ['11px', { lineHeight: '16px' }],
        sm:    ['12px', { lineHeight: '18px' }],
        base:  ['13px', { lineHeight: '20px' }],
        md:    ['14px', { lineHeight: '22px' }],
        lg:    ['16px', { lineHeight: '24px' }],
        xl:    ['18px', { lineHeight: '26px' }],
      },
      // ── Transitions ────────────────────────────────────
      transitionDuration: { DEFAULT: '200ms', fast: '150ms', slow: '300ms' },
      transitionTimingFunction: { smooth: 'cubic-bezier(0.4,0,0.2,1)' },
      // ── Border radius ──────────────────────────────────
      borderRadius: { card: '12px', pill: '999px', lg: '12px' },
      // ── Backdrop blur ──────────────────────────────────
      backdropBlur: { sm: '4px', md: '12px', lg: '20px' },
    },
  },
  plugins: [],
}

export default config
