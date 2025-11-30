import { defineConfig, presetAttributify, presetUno, presetIcons } from 'unocss'

export default defineConfig({
    presets: [
        presetUno(),
        presetAttributify(),
        presetIcons(),
    ],
    theme: {
        colors: {
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
})
