import type { GridItem } from '~/types'
import { TEMPLATES } from '~/logic/templates'
import { THEME } from '~/logic/constants/theme'

// Constants derived from THEME for static export
// We keep CELL_WIDTH = 300 to maintain the high resolution for static image export
const CELL_WIDTH = 300
const CELL_HEIGHT = CELL_WIDTH / THEME.layout.cellAspectRatio
const BORDER_WIDTH = 4
const LABEL_HEIGHT = CELL_HEIGHT * THEME.layout.labelHeightRatio

interface DrawOptions {
    list: GridItem[]
    templateId: string
    customTitle: string
    showName?: boolean
    templateConfig?: { cols: number }
    qrCodeUrl?: string
    variant?: 'standard' | 'challenge'
}

export class CanvasGenerator {
    private ctx: CanvasRenderingContext2D
    private canvas: HTMLCanvasElement

    constructor() {
        this.canvas = document.createElement('canvas')
        const ctx = this.canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas context')
        this.ctx = ctx
    }

    private getImageUrl(url: string): string {
        if (!url) return ''
        if (url.startsWith('blob:') || url.startsWith('data:')) {
            return url
        }
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png&n=-1&t=${Date.now()}`
    }

    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.referrerPolicy = 'no-referrer'

            img.onload = async () => {
                try {
                    await img.decode()
                    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                        throw new Error('Image loaded but has 0 dimensions')
                    }
                    resolve(img)
                } catch (e) {
                    console.warn(`Image decode failed: ${url}`, e)
                    this.resolvePlaceholder(resolve)
                }
            }

            img.onerror = () => {
                console.warn(`Failed to load image: ${url}`)
                this.resolvePlaceholder(resolve)
            }

            img.src = url
        })
    }

    private resolvePlaceholder(resolve: (value: HTMLImageElement) => void) {
        const placeholder = new Image()
        placeholder.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        resolve(placeholder)
    }

    async generate(options: DrawOptions): Promise<string> {
        const { list, templateId, customTitle, templateConfig } = options
        const template = TEMPLATES.find(t => t.id === templateId)

        // Fallback or Custom logic
        const cols = template ? template.cols : (templateConfig?.cols || 3)
        const templateTitle = template?.name || '自定义模版'
        const defaultTitle = template?.defaultTitle || customTitle

        const rows = Math.ceil(list.length / cols)

        const gridWidth = cols * CELL_WIDTH
        // Adjust cell height if showing name
        const nameHeight = options.showName ? LABEL_HEIGHT : 0
        const actualCellHeight = CELL_HEIGHT + nameHeight

        const isChallenge = options.variant === 'challenge'

        const gridHeight = rows * actualCellHeight

        const titleHeight = isChallenge ? 250 : 160
        const padding = 60
        const watermarkHeight = isChallenge ? 180 : 60

        const canvasWidth = gridWidth + (padding * 2)
        const canvasHeight = titleHeight + gridHeight + watermarkHeight + padding

        this.canvas.width = canvasWidth
        this.canvas.height = canvasHeight

        // Background
        this.ctx.fillStyle = isChallenge ? '#fafafa' : THEME.colors.bg
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        // Decor for challenge
        // Decor for challenge
        if (isChallenge) {
            // Clean white background for consistency
            this.ctx.fillStyle = '#ffffff'
            this.ctx.fillRect(0, 0, canvasWidth, canvasHeight)
        }

        if (isChallenge) {
            this.drawChallengeHeader(customTitle, canvasWidth, titleHeight)
        } else {
            this.drawTitle(customTitle, defaultTitle, templateTitle, canvasWidth, titleHeight)
        }

        const images = await Promise.all(
            list.map(item => item.character ? this.loadImage(this.getImageUrl(item.character.image)) : Promise.resolve(null))
        )

        const startX = padding
        const startY = titleHeight

        this.ctx.lineWidth = BORDER_WIDTH
        this.ctx.strokeStyle = THEME.colors.border

        // Draw Content
        for (let i = 0; i < list.length; i++) {
            const col = i % cols
            const row = Math.floor(i / cols)
            const x = startX + col * CELL_WIDTH
            const y = startY + row * actualCellHeight
            const item = list[i]
            const img = images[i] || null

            if (item) {
                this.drawCellContent(x, y, item, img, options.showName)
            }
        }

        // Draw Borders
        for (let i = 0; i < list.length; i++) {
            const col = i % cols
            const row = Math.floor(i / cols)
            const x = startX + col * CELL_WIDTH
            const y = startY + row * actualCellHeight
            const isLastCol = col === cols - 1
            const isLastRow = row === rows - 1

            if (list[i]) {
                this.drawCellBorders(x, y, isLastCol, isLastRow, options.showName)
            }
        }

        // Outer Border
        this.ctx.beginPath()
        this.ctx.rect(startX, startY, gridWidth, gridHeight)
        this.ctx.lineWidth = BORDER_WIDTH
        this.ctx.strokeStyle = THEME.colors.border
        this.ctx.stroke()

        this.ctx.stroke()

        if (isChallenge && options.qrCodeUrl) {
            await this.drawChallengeFooter(options.qrCodeUrl, canvasWidth, canvasHeight, padding)
        } else {
            await this.drawWatermark(canvasWidth, canvasHeight, padding)
        }

        return this.canvas.toDataURL('image/png')
    }

    private drawTitle(customTitle: string, defaultTitle: string | undefined, templateName: string, width: number, height: number) {
        const centerX = width / 2

        this.ctx.fillStyle = THEME.colors.text
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'

        // Prioritize Custom > Default > Generic Fallback
        const titleText = customTitle || defaultTitle || '我的二次元成分表'

        // Dynamic Font Sizing (Shrink to fit)
        // Max width is canvas width minus padding (30px on each side)
        const maxWidth = width - 60
        let fontSize = 60
        this.ctx.font = `bold ${fontSize}px ${THEME.typography.fontFamily}`

        // Measure and shrink if needed
        while (this.ctx.measureText(titleText).width > maxWidth && fontSize > 20) {
            fontSize -= 2
            this.ctx.font = `bold ${fontSize}px ${THEME.typography.fontFamily}`
        }

        this.ctx.fillText(titleText, centerX, height / 2 - 20)

        this.ctx.fillStyle = THEME.colors.accent
        this.ctx.font = `bold ${32}px ${THEME.typography.fontFamily}`
        this.ctx.fillText(`— ${templateName} —`, centerX, height / 2 + 40)
    }

    private drawCellContent(x: number, y: number, item: GridItem, img: HTMLImageElement | null, showName?: boolean) {
        const imageAreaHeight = CELL_HEIGHT - LABEL_HEIGHT
        // When showing name, we don't change imageAreaHeight, we just push the label down by LABEL_HEIGHT (reused for name)

        if (img) {
            this.ctx.save()
            this.ctx.beginPath()
            this.ctx.rect(x, y, CELL_WIDTH, imageAreaHeight)
            this.ctx.clip()

            const scale = Math.max(CELL_WIDTH / img.width, imageAreaHeight / img.height)
            const w = img.width * scale
            const h = img.height * scale

            this.ctx.drawImage(img, x + (CELL_WIDTH - w) / 2, y, w, h)
            this.ctx.restore()
        } else {
            this.ctx.fillStyle = THEME.colors.bg
            this.ctx.fillRect(x, y, CELL_WIDTH, imageAreaHeight)
        }

        // Draw Name Area (Optional)
        if (showName) {
            const nameY = y + imageAreaHeight
            this.ctx.fillStyle = THEME.colors.bg
            this.ctx.fillRect(x, nameY, CELL_WIDTH, LABEL_HEIGHT)

            // Top border of name area (which is bottom of image)
            // Will be drawn by borders function or implied?
            // Actually, we expect the background to be white so it's fine.

            this.ctx.save()
            this.ctx.beginPath()
            this.ctx.rect(x, nameY, CELL_WIDTH, LABEL_HEIGHT)
            this.ctx.clip()

            this.ctx.fillStyle = THEME.colors.text
            // Name font size slightly smaller? Or same? 
            // Logic: Label is 32px. Name should be similar.
            let fontSize = 28
            this.ctx.font = `bold ${fontSize}px ${THEME.typography.fontFamily}`
            this.ctx.textAlign = 'center'
            this.ctx.textBaseline = 'middle'

            const nameText = item.character?.name || ''
            const maxNameWidth = CELL_WIDTH * 0.9

            while (this.ctx.measureText(nameText).width > maxNameWidth && fontSize > 10) {
                fontSize -= 1
                this.ctx.font = `bold ${fontSize}px ${THEME.typography.fontFamily}`
            }

            this.ctx.fillText(nameText, x + CELL_WIDTH / 2, nameY + LABEL_HEIGHT / 2)
            this.ctx.restore()
        }

        const labelY = y + imageAreaHeight + (showName ? LABEL_HEIGHT : 0)
        this.ctx.fillStyle = THEME.colors.bg
        this.ctx.fillRect(x, labelY, CELL_WIDTH, LABEL_HEIGHT)

        this.ctx.save()
        this.ctx.beginPath()
        this.ctx.rect(x, labelY, CELL_WIDTH, LABEL_HEIGHT)
        this.ctx.clip()

        this.ctx.fillStyle = THEME.colors.text
        let labelFontSize = 32
        this.ctx.font = `bold ${labelFontSize}px ${THEME.typography.fontFamily}`
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'

        const maxLabelWidth = CELL_WIDTH * 0.9
        while (this.ctx.measureText(item.label).width > maxLabelWidth && labelFontSize > 10) {
            labelFontSize -= 1
            this.ctx.font = `bold ${labelFontSize}px ${THEME.typography.fontFamily}`
        }

        this.ctx.fillText(item.label, x + CELL_WIDTH / 2, labelY + LABEL_HEIGHT / 2)
        this.ctx.restore()
    }

    private drawCellBorders(x: number, y: number, isLastCol: boolean, isLastRow: boolean, showName?: boolean) {
        const imageAreaHeight = CELL_HEIGHT - LABEL_HEIGHT
        const nameY = y + imageAreaHeight
        const labelY = nameY + (showName ? LABEL_HEIGHT : 0)

        this.ctx.beginPath()
        this.ctx.lineWidth = BORDER_WIDTH
        this.ctx.strokeStyle = THEME.colors.border

        // Line between Image and Name (or Label if no Name)
        this.ctx.moveTo(x, nameY)
        this.ctx.lineTo(x + CELL_WIDTH, nameY)

        // Line between Name and Label (if Name exists)
        if (showName) {
            this.ctx.moveTo(x, labelY)
            this.ctx.lineTo(x + CELL_WIDTH, labelY)
        }

        const totalHeight = CELL_HEIGHT + (showName ? LABEL_HEIGHT : 0)

        if (!isLastCol) {
            this.ctx.moveTo(x + CELL_WIDTH, y)
            this.ctx.lineTo(x + CELL_WIDTH, y + totalHeight)
        }

        if (!isLastRow) {
            this.ctx.moveTo(x, y + totalHeight)
            this.ctx.lineTo(x + CELL_WIDTH, y + totalHeight)
        }

        this.ctx.stroke()
    }

    private async drawWatermark(width: number, height: number, padding: number) {
        const x = width - padding
        const y = height - padding / 2

        this.ctx.save()
        this.ctx.textAlign = 'right'
        this.ctx.textBaseline = 'bottom'

        this.ctx.font = `bold ${28}px ${THEME.typography.fontFamily}`

        // Draw colored text parts
        const part1 = '【我推'
        const part2 = '的'
        const part3 = '格子】'

        const w2 = this.ctx.measureText(part2).width
        const w3 = this.ctx.measureText(part3).width

        try {
            const logo = await this.loadImage('/logo.png')
            const logoSize = 40
            this.ctx.drawImage(logo, x - logoSize, y - logoSize + 5, logoSize, logoSize)

            const textEndX = x - logoSize - 10

            this.ctx.fillStyle = THEME.colors.watermark
            this.ctx.fillText(part3, textEndX, y)

            this.ctx.fillStyle = THEME.colors.accent
            this.ctx.fillText(part2, textEndX - w3, y)

            this.ctx.fillStyle = THEME.colors.watermark
            this.ctx.fillText(part1, textEndX - w3 - w2, y)

        } catch (e) {
            this.ctx.fillStyle = THEME.colors.watermark
            this.ctx.fillText('【我推的格子】', x, y)
        }

        this.ctx.restore()
    }

    private drawChallengeHeader(title: string, width: number, height: number) {
        const centerX = width / 2
        const y = height / 2

        // Tag
        this.ctx.save()
        this.ctx.font = `bold 24px sans-serif`
        this.ctx.fillStyle = '#000000'
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'bottom'
        this.ctx.fillText('CHALLENGE', centerX, y - 50)

        // Title
        this.ctx.font = `bold 80px "Noto Serif SC", serif`
        this.ctx.fillStyle = '#111827' // gray-900
        this.ctx.textBaseline = 'middle'
        this.ctx.shadowColor = 'rgba(0,0,0,0.1)'
        this.ctx.shadowBlur = 10
        this.ctx.fillText(title, centerX, y + 10)
        this.ctx.shadowBlur = 0

        // Decorative Line
        this.ctx.fillStyle = THEME.colors.accent // pink
        this.ctx.beginPath()
        this.ctx.roundRect(centerX - 60, y + 60, 120, 6, 3)
        this.ctx.fill()
        this.ctx.restore()
    }

    private async drawChallengeFooter(qrUrl: string, width: number, height: number, padding: number) {
        const ctx = this.ctx
        const boxHeight = 120 // Slightly smaller footer
        const boxY = height - boxHeight - padding / 2
        const boxX = padding
        const boxWidth = width - (padding * 2)

        // Simple Border at top of footer
        ctx.beginPath()
        ctx.moveTo(boxX, boxY)
        ctx.lineTo(boxX + boxWidth, boxY)
        ctx.lineWidth = 2
        ctx.strokeStyle = '#f3f4f6' // gray-100
        ctx.stroke()

        // Logo Area
        const logoY = boxY + (boxHeight - 40) / 2
        try {
            // Align with watermark logic
            const logo = await this.loadImage('/logo.png')
            const logoSize = 40
            ctx.drawImage(logo, boxX, logoY, logoSize, logoSize)

            // Text
            ctx.textBaseline = 'middle'
            ctx.textAlign = 'left'
            const textX = boxX + logoSize + 10

            // "我推的格子"
            ctx.fillStyle = THEME.colors.text
            ctx.font = `bold 28px ${THEME.typography.fontFamily}`
            ctx.fillText('我推的格子', textX, logoY + logoSize / 2)

            // "ANIME ROLE GRID"
            ctx.fillStyle = THEME.colors.accent
            ctx.font = `bold 14px ${THEME.typography.fontFamily}`
            // ctx.fillText('ANIME ROLE GRID', textX, logoY + logoSize/2 + 20) // Optional, maybe too cluttered

        } catch (e) {
            console.warn('Logo failed', e)
        }

        // QR Area (Right aligned)
        try {
            const qr = await this.loadImage(qrUrl)
            const qrSize = 90
            const qrY = boxY + (boxHeight - qrSize) / 2
            const qrX = boxX + boxWidth - qrSize

            ctx.drawImage(qr, qrX, qrY, qrSize, qrSize)

            // Text left of QR
            ctx.textAlign = 'right'
            ctx.textBaseline = 'middle'

            ctx.fillStyle = '#374151'
            ctx.font = `bold 18px ${THEME.typography.fontFamily}`
            ctx.fillText('扫码接受挑战', qrX - 15, qrY + qrSize / 2 - 10)

            ctx.fillStyle = '#9ca3af'
            ctx.font = `14px ${THEME.typography.fontFamily}`
            ctx.fillText('长按识别二维码', qrX - 15, qrY + qrSize / 2 + 10)

        } catch (e) { console.warn('QR load failed') }
    }
}
