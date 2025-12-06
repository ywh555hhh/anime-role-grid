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
        const { list, templateId, customTitle } = options
        const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0]
        if (!template) throw new Error('Template not found')

        const cols = template.cols
        const rows = Math.ceil(list.length / cols)

        const gridWidth = cols * CELL_WIDTH
        const gridHeight = rows * CELL_HEIGHT

        const titleHeight = 160
        const padding = 60
        const watermarkHeight = 60

        const canvasWidth = gridWidth + (padding * 2)
        const canvasHeight = titleHeight + gridHeight + watermarkHeight + padding

        this.canvas.width = canvasWidth
        this.canvas.height = canvasHeight

        this.ctx.fillStyle = THEME.colors.bg
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        this.drawTitle(customTitle, template.name, canvasWidth, titleHeight)

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
            const y = startY + row * CELL_HEIGHT
            const item = list[i]
            const img = images[i] || null

            if (item) {
                this.drawCellContent(x, y, item, img)
            }
        }

        // Draw Borders
        for (let i = 0; i < list.length; i++) {
            const col = i % cols
            const row = Math.floor(i / cols)
            const x = startX + col * CELL_WIDTH
            const y = startY + row * CELL_HEIGHT
            const isLastCol = col === cols - 1
            const isLastRow = row === rows - 1

            if (list[i]) {
                this.drawCellBorders(x, y, isLastCol, isLastRow)
            }
        }

        // Outer Border
        this.ctx.beginPath()
        this.ctx.rect(startX, startY, gridWidth, gridHeight)
        this.ctx.lineWidth = BORDER_WIDTH
        this.ctx.strokeStyle = THEME.colors.border
        this.ctx.stroke()

        await this.drawWatermark(canvasWidth, canvasHeight, padding)

        return this.canvas.toDataURL('image/png')
    }

    private drawTitle(customTitle: string, templateName: string, width: number, height: number) {
        const centerX = width / 2

        this.ctx.fillStyle = THEME.colors.text
        this.ctx.font = `bold ${60}px ${THEME.typography.fontFamily}`
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillText(customTitle || '我的动漫人物喜好果然有问题', centerX, height / 2 - 20)

        this.ctx.fillStyle = THEME.colors.accent
        this.ctx.font = `bold ${32}px ${THEME.typography.fontFamily}`
        this.ctx.fillText(`— ${templateName} —`, centerX, height / 2 + 40)
    }

    private drawCellContent(x: number, y: number, item: GridItem, img: HTMLImageElement | null) {
        const imageAreaHeight = CELL_HEIGHT - LABEL_HEIGHT

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

        const labelY = y + imageAreaHeight
        this.ctx.fillStyle = THEME.colors.bg
        this.ctx.fillRect(x, labelY, CELL_WIDTH, LABEL_HEIGHT)

        this.ctx.fillStyle = THEME.colors.text
        this.ctx.font = `bold ${32}px ${THEME.typography.fontFamily}`
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillText(item.label, x + CELL_WIDTH / 2, labelY + LABEL_HEIGHT / 2)
    }

    private drawCellBorders(x: number, y: number, isLastCol: boolean, isLastRow: boolean) {
        const imageAreaHeight = CELL_HEIGHT - LABEL_HEIGHT
        const labelY = y + imageAreaHeight

        this.ctx.beginPath()
        this.ctx.lineWidth = BORDER_WIDTH
        this.ctx.strokeStyle = THEME.colors.border

        this.ctx.moveTo(x, labelY)
        this.ctx.lineTo(x + CELL_WIDTH, labelY)

        if (!isLastCol) {
            this.ctx.moveTo(x + CELL_WIDTH, y)
            this.ctx.lineTo(x + CELL_WIDTH, y + CELL_HEIGHT)
        }

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
}
