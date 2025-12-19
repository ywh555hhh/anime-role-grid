import { defineConfig, presetAttributify, presetUno, presetIcons } from 'unocss'

export default defineConfig({
    presets: [
        presetUno(),
        presetAttributify(),
        presetIcons(),
    ],
    theme: {
        colors: {
            primary: {
                DEFAULT: '#e4007f',
                hover: '#c2006b',
                light: '#fce7f3', // pink-100
            },
            black: '#000000',
            white: '#ffffff',
            gray: {
                50: '#f9fafb',
                100: '#f3f4f6',
                200: '#e5e7eb',
                300: '#d1d5db',
                400: '#9ca3af',
                500: '#6b7280',
                600: '#4b5563',
                700: '#374151',
                800: '#1f2937',
                900: '#111827',
                950: '#030712',
            },
            blue: {
                50: '#eff6ff',
                100: '#dbeafe',
                200: '#bfdbfe',
                300: '#93c5fd',
                400: '#60a5fa',
                500: '#3b82f6',
                600: '#2563eb',
                700: '#1d4ed8',
                800: '#1e40af',
                900: '#1e3a8a',
                950: '#172554',
            },
            // Semantics
            border: {
                DEFAULT: '#e5e7eb',
                dark: '#374151'
            }
        },
        borderRadius: {
            'std': '0.75rem',  // rounded-xl
            'btn': '9999px',   // rounded-full
            'inp': '0.5rem',   // rounded-lg
        },
        animation: {
            keyframes: {
                'bounce-low': '{ 0%, 100% { transform: translateY(-18.75%); animation-timing-function: cubic-bezier(0.8,0,1,1) } 50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1) } }',
            },
            durations: {
                'bounce-low': '1s',
            },
            counts: {
                'bounce-low': 'infinite',
            },
        },
    },
    shortcuts: {
        // Base button class: consolidates default styles + cleaner focus state (no double pink border)
        'btn': 'border-none rounded-btn cursor-pointer transition-all duration-200 outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed',

        'btn-primary': 'btn bg-primary text-white hover:bg-primary-hover px-4 py-2 flex items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg',
        'btn-outline-primary': 'btn bg-white text-primary border-2 border-primary hover:bg-primary-light px-4 py-2 flex items-center justify-center gap-2 font-bold shadow-sm',
        'card-base': 'bg-white dark:bg-gray-800 rounded-std border border-border dark:border-border-dark shadow-sm',
        'input-std': 'rounded-inp border border-gray-300 px-4 py-3 bg-white text-black outline-none focus:border-primary',
        'icon-btn': 'p-1 rounded bg-gray-100 hover:bg-primary-light transition-colors text-gray-600 hover:text-primary',
    }
})
