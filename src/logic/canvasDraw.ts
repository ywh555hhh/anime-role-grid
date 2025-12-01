import type { GridItem } from '~/types'
import { TEMPLATES } from '~/logic/templates'

// Constants matching Grid.vue styling
const CELL_WIDTH = 300 // Higher res for export
const CELL_ASPECT_RATIO = 120 / 187
const CELL_HEIGHT = CELL_WIDTH / CELL_ASPECT_RATIO
const BORDER_WIDTH = 4 // Thicker for high res
const FONT_FAMILY = '"Noto Serif SC", serif'
const LABEL_HEIGHT_RATIO = 25 / 187 // Based on 25px height in 187px total height
const LABEL_HEIGHT = CELL_HEIGHT * LABEL_HEIGHT_RATIO

const COLORS = {
    bg: '#ffffff',
    border: '#000000',
    text: '#000000',
    accent: '#e4007f',
    watermark: '#000000'
}

interface DrawOptions {
    list: GridItem[]
    templateId: string
    customTitle: string
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

        // Bypass proxy for local blob/data URLs
        if (url.startsWith('blob:') || url.startsWith('data:')) {
            return url
        }

        // Use wsrv.nl proxy for CORS support
        // Add cache bust to prevent caching of corrupted images
        // Add n=-1 to disable optimization which might cause issues for some images
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png&n=-1&t=${Date.now()}`
    }

    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'

            img.onload = async () => {
                try {
                    // Force decode to ensure image is fully ready
                    await img.decode()
                    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                        throw new Error('Image loaded but has 0 dimensions')
                    }
                    resolve(img)
                } catch (e) {
                    console.warn(`Image decode failed: ${url}`, e)
                    // Fallback to placeholder
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
        const { list, templateId, customTitle } = options
        const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0]
        if (!template) throw new Error('Template not found')

        const cols = template.cols
        const rows = Math.ceil(list.length / cols)

        // Calculate dimensions
        const gridWidth = cols * CELL_WIDTH
        const gridHeight = rows * CELL_HEIGHT

        // Padding for title and watermark
        const titleHeight = 160
        const padding = 60
        const watermarkHeight = 60

        const canvasWidth = gridWidth + (padding * 2)
        const canvasHeight = titleHeight + gridHeight + watermarkHeight + padding

        // Set canvas size
        this.canvas.width = canvasWidth
        this.canvas.height = canvasHeight

        // Fill background
        this.ctx.fillStyle = COLORS.bg
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        // Draw Title
        this.drawTitle(customTitle, template.name, canvasWidth, titleHeight)

        // Preload all images
        const images = await Promise.all(
            list.map(item => item.character ? this.loadImage(this.getImageUrl(item.character.image)) : Promise.resolve(null))
        )

        // Draw Grid
        const startX = padding
        const startY = titleHeight

        // Draw main grid border (Top and Left)
        this.ctx.lineWidth = BORDER_WIDTH
        this.ctx.strokeStyle = COLORS.border

        // Draw cells
        // Pass 1: Draw Content (Backgrounds, Images, Text)
        for (let i = 0; i < list.length; i++) {
            const col = i % cols
            const row = Math.floor(i / cols)
            const x = startX + col * CELL_WIDTH
            const y = startY + row * CELL_HEIGHT
            const item = list[i]
            const img = images[i] || null

            if (item) {
                this.drawCellContent(x, y, item, img)
            }
        }

        // Pass 2: Draw Borders (Lines)
        // Draw borders after all content to ensure no overlap/clipping
        for (let i = 0; i < list.length; i++) {
            const col = i % cols
            const row = Math.floor(i / cols)
            const x = startX + col * CELL_WIDTH
            const y = startY + row * CELL_HEIGHT

            const isLastCol = col === cols - 1
            const isLastRow = row === rows - 1

            // We draw borders for every cell position, even if empty (if we wanted empty grid)
            // But here list only has items. If list is sparse, we might miss borders.
            // Assuming list is full or we only care about filled slots.
            // Actually, for a grid, we usually want the full grid structure.
            // But current logic relies on `list`. If `list` has gaps, `drawCell` wasn't called.
            // Let's stick to `list` for now as that's what we have.
            if (list[i]) {
                this.drawCellBorders(x, y, isLastCol, isLastRow)
            }
        }

        // Draw outer border for the whole grid to ensure clean edges
        this.ctx.beginPath()
        this.ctx.rect(startX, startY, gridWidth, gridHeight)
        this.ctx.lineWidth = BORDER_WIDTH
        this.ctx.strokeStyle = COLORS.border
        this.ctx.stroke()

        // Draw Watermark
        await this.drawWatermark(canvasWidth, canvasHeight, padding)

        return this.canvas.toDataURL('image/png')
    }

    private drawTitle(customTitle: string, templateName: string, width: number, height: number) {
        const centerX = width / 2

        // Custom Title
        this.ctx.fillStyle = COLORS.text
        this.ctx.font = `bold ${60}px ${FONT_FAMILY}`
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillText(customTitle || '我的动漫人物喜好果然有问题', centerX, height / 2 - 20)

        // Template Name
        this.ctx.fillStyle = COLORS.accent
        this.ctx.font = `bold ${32}px ${FONT_FAMILY}`
        this.ctx.fillText(`— ${templateName} —`, centerX, height / 2 + 40)
    }

    private drawCellContent(x: number, y: number, item: GridItem, img: HTMLImageElement | null) {
        // 1. Draw Image
        const imageAreaHeight = CELL_HEIGHT - LABEL_HEIGHT

        if (img) {
            this.ctx.save()
            this.ctx.beginPath()
            this.ctx.rect(x, y, CELL_WIDTH, imageAreaHeight)
            this.ctx.clip()

            // Object cover logic
            const scale = Math.max(CELL_WIDTH / img.width, imageAreaHeight / img.height)
            const w = img.width * scale
            const h = img.height * scale

            this.ctx.drawImage(img, x + (CELL_WIDTH - w) / 2, y, w, h)
            this.ctx.restore()
        } else {
            this.ctx.fillStyle = COLORS.bg
            this.ctx.fillRect(x, y, CELL_WIDTH, imageAreaHeight)
        }

        // 2. Draw Label Area Background
        const labelY = y + imageAreaHeight
        this.ctx.fillStyle = COLORS.bg
        this.ctx.fillRect(x, labelY, CELL_WIDTH, LABEL_HEIGHT)

        // 3. Draw Label Text
        this.ctx.fillStyle = COLORS.text
        // Increase font size to 32px for better readability
        this.ctx.font = `bold ${32}px ${FONT_FAMILY}`
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillText(item.label, x + CELL_WIDTH / 2, labelY + LABEL_HEIGHT / 2)
    }

    private drawCellBorders(x: number, y: number, isLastCol: boolean, isLastRow: boolean) {
        const imageAreaHeight = CELL_HEIGHT - LABEL_HEIGHT
        const labelY = y + imageAreaHeight

        this.ctx.beginPath()
        this.ctx.lineWidth = BORDER_WIDTH
        this.ctx.strokeStyle = COLORS.border

        // Label top border (Always draw)
        this.ctx.moveTo(x, labelY)
        this.ctx.lineTo(x + CELL_WIDTH, labelY)

        // Cell Right border (Only if not last column)
        if (!isLastCol) {
            this.ctx.moveTo(x + CELL_WIDTH, y)
            this.ctx.lineTo(x + CELL_WIDTH, y + CELL_HEIGHT)
        }

        // Cell Bottom border (Only if not last row)
        if (!isLastRow) {
            this.ctx.moveTo(x, y + CELL_HEIGHT)
            this.ctx.lineTo(x + CELL_WIDTH, y + CELL_HEIGHT)
        }

        this.ctx.stroke()
    }

    private async drawWatermark(width: number, height: number, padding: number) {
        const x = width - padding
        const y = height - padding / 2

        this.ctx.save()
        this.ctx.textAlign = 'right'
        this.ctx.textBaseline = 'bottom'

        // Text: 【我推的格子】
        this.ctx.font = `bold ${28}px ${FONT_FAMILY}`

        // Draw "的" in pink
        // Simple way: draw parts.
        // "【我推"
        const part1 = '【我推'
        const part2 = '的'
        const part3 = '格子】'

        const w2 = this.ctx.measureText(part2).width
        const w3 = this.ctx.measureText(part3).width

        // Load Logo
        try {
            const logo = await this.loadImage('/logo.png')
            const logoSize = 40
            this.ctx.drawImage(logo, x - logoSize, y - logoSize + 5, logoSize, logoSize)

            const textEndX = x - logoSize - 10

            this.ctx.fillStyle = COLORS.text
            this.ctx.fillText(part3, textEndX, y)

            this.ctx.fillStyle = COLORS.accent
            this.ctx.fillText(part2, textEndX - w3, y)

            this.ctx.fillStyle = COLORS.text
            this.ctx.fillText(part1, textEndX - w3 - w2, y)

        } catch (e) {
            // Fallback if logo fails
            this.ctx.fillStyle = COLORS.text
            this.ctx.fillText('【我推的格子】', x, y)
        }

        this.ctx.restore()
    }
}
