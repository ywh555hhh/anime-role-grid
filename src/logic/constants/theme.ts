export const THEME = {
    colors: {
        bg: '#ffffff',
        text: '#000000',
        accent: '#e4007f', // Core Pink
        border: '#000000',
        watermark: '#000000',
        secondaryBg: '#f3f4f6', // Image area background
        placeholderText: '#d1d5db', // Question mark text
        cardBg: '#ffffff',
        cardShadow: 'rgba(0,0,0,0.2)',
        brandingText: 'rgba(0,0,0,0.3)',
        stroke: '#1f2937' // Dark grey stroke
    },
    typography: {
        fontFamily: '"Noto Serif SC", serif',
    },
    layout: {
        // Cell Aspect Ratio (Width / Height)
        // Derived from: 120 / 187
        cellAspectRatio: 120 / 187,

        // Label Height Ratio (relative to total cell height)
        // Derived from: 25 / 187
        labelHeightRatio: 25 / 187,
    },
    watermark: {
        letterSpacing: 0.1, // Matches 'tracking-widest' (0.1em)
        verticalPadding: 60, // Base pixels relative to 1080p canvas scale
        fontSize: 40 // Base pixels relative to 1080p canvas scale
    }
}
