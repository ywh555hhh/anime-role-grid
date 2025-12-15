import QRCode from 'qrcode'
import { CanvasGenerator } from './canvasDraw'
import type { GridItem } from '~/types'

export async function exportGridAsImage(list: GridItem[], templateId: string, customTitle: string, fileName: string, showName: boolean = false, templateConfig?: any, qrCodeUrl?: string, variant?: 'standard' | 'challenge', templateName?: string) {
    try {
        // Generate QR Code if needed (for challenge mode)
        if (variant === 'challenge' && !qrCodeUrl) {
            try {
                // Use current URL
                qrCodeUrl = await QRCode.toDataURL(window.location.href, { margin: 1 })
            } catch (e) {
                console.warn('QR Code generation failed', e)
            }
        }

        const generator = new CanvasGenerator()
        const dataUrl = await generator.generate({ list, templateId, customTitle, showName, templateConfig, qrCodeUrl, variant, templateName })

        // Detect Mobile/iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

        if (isIOS) {
            // iOS Safari doesn't support download attribute well, open in new tab
            const win = window.open()
            if (win) {
                win.document.write('<img src="' + dataUrl + '" style="width:100%"/>')
                win.document.title = "长按保存图片"
            } else {
                // Fallback if popup blocked
                // window.location.href = dataUrl // This often fails or replaces page
            }
        } else {
            const link = document.createElement('a')
            link.download = `${fileName}-${Date.now()}.png`
            link.href = dataUrl
            link.click()
        }

        return dataUrl
    } catch (error) {
        console.error('Export failed:', error)
        throw error
    }
}
