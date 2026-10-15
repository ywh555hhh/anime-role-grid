import type { ExportTemplateConfig, GridItem } from '~/types'
import { TEMPLATES } from '~/logic/templates'
import { THEME } from '~/logic/constants/theme'
import { proxyImage } from '~/logic/imageUrl'
import { waitForFonts } from '~/logic/fontReady'

// Constants derived from THEME for static export
// We keep CELL_WIDTH = 300 to maintain the high resolution for static image export
const CELL_WIDTH = 300
const CELL_HEIGHT = CELL_WIDTH / THEME.layout.cellAspectRatio
const BORDER_WIDTH = 4
const LABEL_HEIGHT = CELL_HEIGHT * THEME.layout.labelHeightRatio

/**
 * 单张图片的客户端加载超时（毫秒）。
 *
 * 第二道防线：服务端 `/api/img` 已有 20s 回源超时，但这里再兜一次，
 * 保证即使代理或网络完全不响应，导出也会有确定结局（该格降级为空占位图），
 * 而不会让整张图永远卡在某一格上。
 */
const IMAGE_LOAD_TIMEOUT_MS = 25_000

const STANDARD_WATERMARK_HEIGHT = 60
const STANDARD_QR_WATERMARK_HEIGHT = 180

interface DrawOptions {
    list: GridItem[]
    templateId: string
    customTitle: string
    showName?: boolean
    showLabel?: boolean
    showQRCode?: boolean
    templateConfig?: ExportTemplateConfig
    qrCodeUrl?: string
    variant?: 'standard' | 'challenge'
    templateName?: string
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

    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.referrerPolicy = 'no-referrer'

            const timer = setTimeout(() => {
                console.warn(`Image load timed out after ${IMAGE_LOAD_TIMEOUT_MS}ms: ${url}`)
                this.resolvePlaceholder(resolve)
            }, IMAGE_LOAD_TIMEOUT_MS)

            img.onload = async () => {
                try {
                    await img.decode()
                    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                        throw new Error('Image loaded but has 0 dimensions')
                    }
                    clearTimeout(timer)
                    resolve(img)
                } catch (e) {
                    console.warn(`Image decode failed: ${url}`, e)
                    clearTimeout(timer)
                    this.resolvePlaceholder(resolve)
                }
            }

            img.onerror = () => {
                console.warn(`Failed to load image: ${url}`)
                clearTimeout(timer)
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

    private getFooterLayout(width: number, filler?: string, creator?: string): { mode: 'horizontal' | 'vertical', height: number } {
        // Measure Components
        const padding = 60
        const safeWidth = width - (padding * 2)

        // 1. Brand Width (Logo 50 + Text ~200 + Gap 20)
        // Hardcoded approximation is safer than async measure
        // Logo(50) + Gap(20) + "【我推的格子】"(~210 at 30px bold)
        const brandWidth = 280

        // 2. QR Width (QR 130 + Gap 25 + Text 150)
        // QR(130) + Gap(10) + Text(~180) = ~320
        const qrWidth = 320

        // 3. Attribution Width
        // Depends on text length
        let attrWidth = 0
        if (creator || filler) {
            let text = ''
            if (creator && !filler) text = `制表: ${creator}`
            else if (creator && filler) text = `制表: ${creator}  |  填表: ${filler}`
            else if (!creator && filler) text = `填表: ${filler}`

            // Approx width: Chinese char ~ 30px, Space ~ 10px
            // Simple formula: length * 30 * 0.8 (since not all are wide) + padding
            // Better: use exact measure if ctx available, but here we estimate
            this.ctx.font = `bold 30px ${THEME.typography.fontFamily}`
            attrWidth = this.ctx.measureText(text).width + 60 // +60 for gap
        }

        const totalRequired = brandWidth + attrWidth + qrWidth

        // Decision
        // If fits with some breathing room (e.g. 50px)
        const fitsHorizontal = totalRequired <= safeWidth

        if (fitsHorizontal) {
            return { mode: 'horizontal', height: 160 }
        } else {
            return { mode: 'vertical', height: 320 }
        }
    }

    private getStandardFooterLayout(width: number): { qrSize: number, logoSize: number, fontSize: number, textGap: number } {
        const safeWidth = width - 120

        if (safeWidth <= 540) {
            return { qrSize: 90, logoSize: 42, fontSize: 30, textGap: 14 }
        }

        if (safeWidth <= 780) {
            return { qrSize: 110, logoSize: 48, fontSize: 34, textGap: 16 }
        }

        return { qrSize: 130, logoSize: 54, fontSize: 38, textGap: 18 }
    }

    async generate(options: DrawOptions): Promise<string> {
        // 字体就绪后再画。Noto Serif SC 已改成非阻塞加载（见 index.html 的说明）：
        // 那是为了修「fonts.googleapis.com 被墙时整页白屏」的，代价是首屏可能先用回退字体。
        // 导出成品不能接受这个代价 —— 字不一样，观感就变了。
        // 内部带超时，字体被墙时不会把导出挂死。
        await waitForFonts()

        const { list, templateId, customTitle, templateConfig } = options
        const template = TEMPLATES.find(t => t.id === templateId)

        const cols = template ? template.cols : (templateConfig?.cols || 3)
        const templateTitle = options.templateName || template?.name || '自定义模版'
        const defaultTitle = template?.defaultTitle || customTitle

        const rows = Math.ceil(list.length / cols)
        const gridWidth = cols * CELL_WIDTH

        // 原始逻辑：showName = true 时会增加高度，showLabel = false 时不会减少 CELL_HEIGHT
        // actualCellHeight = CELL_HEIGHT + (showName ? LABEL_HEIGHT : 0)
        const nameHeight = options.showName ? LABEL_HEIGHT : 0
        const actualCellHeight = CELL_HEIGHT + nameHeight

        const isChallenge = options.variant === 'challenge'
        const hasStandardQRCode = options.variant !== 'challenge' && options.showQRCode !== false && !!options.qrCodeUrl
        const gridHeight = rows * actualCellHeight
        const titleHeight = isChallenge ? 250 : 160
        const padding = 60
        const canvasWidth = gridWidth + (padding * 2)

        // Calculate Footer Layout ahead of time
        let watermarkHeight = hasStandardQRCode ? STANDARD_QR_WATERMARK_HEIGHT : STANDARD_WATERMARK_HEIGHT
        let footerLayout: { mode: 'horizontal' | 'vertical', height: number } = { mode: 'horizontal', height: 160 }

        if (isChallenge) {
            footerLayout = this.getFooterLayout(canvasWidth, templateConfig?.filler, templateConfig?.creator)
            watermarkHeight = footerLayout.height
        }

        const canvasHeight = titleHeight + gridHeight + watermarkHeight + padding

        this.canvas.width = canvasWidth
        this.canvas.height = canvasHeight

        // Background
        this.ctx.fillStyle = isChallenge ? '#fafafa' : THEME.colors.bg
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        if (isChallenge) {
            this.ctx.fillStyle = '#ffffff'
            this.ctx.fillRect(0, 0, canvasWidth, canvasHeight)
            this.drawChallengeHeader(customTitle, templateTitle, canvasWidth, titleHeight)
        } else {
            this.drawTitle(customTitle, defaultTitle, templateTitle, canvasWidth, titleHeight)
        }

        // 图片统一走同源代理（/api/img）。
        // 原先用 wsrv.nl + output=png：会把 JPEG 重编码成 PNG（实测膨胀约 8 倍），
        // 且带 t=Date.now() 每次导出都击穿缓存；同源图片另外还不会污染 canvas。
        const images = await Promise.all(
            list.map(item => item.character ? this.loadImage(proxyImage(item.character.image)) : Promise.resolve(null))
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
                this.drawCellContent(x, y, item, img, options.showName, options.showLabel)
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
                this.drawCellBorders(x, y, isLastCol, isLastRow, options.showName, options.showLabel)
            }
        }

        // Outer Border
        this.ctx.beginPath()
        this.ctx.rect(startX, startY, gridWidth, gridHeight)
        this.ctx.lineWidth = BORDER_WIDTH
        this.ctx.strokeStyle = THEME.colors.border
        this.ctx.stroke()

        if (isChallenge && options.qrCodeUrl) {
            await this.drawChallengeFooter(
                options.qrCodeUrl,
                canvasWidth,
                canvasHeight,
                padding,
                footerLayout,
                templateConfig?.filler,
                templateConfig?.creator
            )
        } else {
            await this.drawWatermark(canvasWidth, canvasHeight, padding, options.variant, options.qrCodeUrl, options.showQRCode)
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

    private drawCellContent(x: number, y: number, item: GridItem, img: HTMLImageElement | null, showName?: boolean, showLabel?: boolean) {
        const showLabel_ = showLabel !== false // 默认显示

        // 逻辑：
        // - showName = true 时，名字区域是额外的，格子总高度 = CELL_HEIGHT + LABEL_HEIGHT
        // - showLabel = false 时，标签不显示，但格子总高度不变（图片区域更大）
        // - 图片区域 = 格子总高度 - 名字区域（如果有）- 标签区域（如果有）
        const nameHeight = showName ? LABEL_HEIGHT : 0
        const labelHeight = showLabel_ ? LABEL_HEIGHT : 0

        // 当 showLabel = false 时，格子总高度仍然是 CELL_HEIGHT + nameHeight
        // 图片区域 = 格子总高度 - 名字区域（因为标签隐藏了，所以不减）
        const totalCellHeight = CELL_HEIGHT + nameHeight
        const imageAreaHeight = totalCellHeight - nameHeight - labelHeight

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

            this.ctx.save()
            this.ctx.beginPath()
            this.ctx.rect(x, nameY, CELL_WIDTH, LABEL_HEIGHT)
            this.ctx.clip()

            this.ctx.fillStyle = THEME.colors.text
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

        // Draw Label (Optional)
        if (showLabel_) {
            const labelY = y + imageAreaHeight + nameHeight
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
    }

    private drawCellBorders(x: number, y: number, isLastCol: boolean, isLastRow: boolean, showName?: boolean, showLabel?: boolean) {
        const showLabel_ = showLabel !== false

        // 逻辑与 drawCellContent 一致
        const nameHeight = showName ? LABEL_HEIGHT : 0
        const labelHeight = showLabel_ ? LABEL_HEIGHT : 0
        const totalCellHeight = CELL_HEIGHT + nameHeight
        const imageAreaHeight = totalCellHeight - nameHeight - labelHeight

        const nameY = y + imageAreaHeight
        const labelY = nameY + nameHeight

        this.ctx.beginPath()
        this.ctx.lineWidth = BORDER_WIDTH
        this.ctx.strokeStyle = THEME.colors.border

        // 画图片区域的底线（总是画，因为图片区域始终存在）
        this.ctx.moveTo(x, nameY)
        this.ctx.lineTo(x + CELL_WIDTH, nameY)

        // 画名字和标签之间的分割线（如果显示名字）
        if (showName) {
            this.ctx.moveTo(x, labelY)
            this.ctx.lineTo(x + CELL_WIDTH, labelY)
        }

        const totalHeight = totalCellHeight

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

    private async drawWatermark(width: number, height: number, padding: number, variant?: string, qrCodeUrl?: string, showQRCode?: boolean) {
        const isStandard = variant !== 'challenge'
        const hasStandardQRCode = isStandard && showQRCode !== false && !!qrCodeUrl
        const leftY = height - padding / 2
        const x = width - padding
        const y = leftY

        this.ctx.save()
        this.ctx.textBaseline = 'bottom'

        if (hasStandardQRCode && qrCodeUrl) {
            const { qrSize, logoSize, fontSize, textGap } = this.getStandardFooterLayout(width)

            try {
                const [logo, qr] = await Promise.all([
                    this.loadImage('/logo.png'),
                    this.loadImage(qrCodeUrl)
                ])

                const qrX = padding
                const qrY = height - STANDARD_QR_WATERMARK_HEIGHT + (STANDARD_QR_WATERMARK_HEIGHT - qrSize) / 2
                this.ctx.drawImage(qr, qrX, qrY, qrSize, qrSize)

                this.ctx.textAlign = 'right'
                this.ctx.font = `bold ${fontSize}px ${THEME.typography.fontFamily}`

                const part1 = '【我推'
                const part2 = '的'
                const part3 = '格子】'
                const w2 = this.ctx.measureText(part2).width
                const w3 = this.ctx.measureText(part3).width

                this.ctx.drawImage(logo, x - logoSize, y - logoSize + 8, logoSize, logoSize)

                const textEndX = x - logoSize - textGap
                this.ctx.fillStyle = THEME.colors.watermark
                this.ctx.fillText(part3, textEndX, y)

                this.ctx.fillStyle = THEME.colors.accent
                this.ctx.fillText(part2, textEndX - w3, y)

                this.ctx.fillStyle = THEME.colors.watermark
                this.ctx.fillText(part1, textEndX - w3 - w2, y)
            } catch (e) {
                console.warn('Standard watermark draw failed', e)
                this.ctx.textAlign = 'left'
                this.ctx.font = `bold 20px ${THEME.typography.fontFamily}`
                this.ctx.fillStyle = '#9ca3af'
                this.ctx.fillText('oshigrid.me', padding, leftY)
            }

            this.ctx.restore()
            return
        }

        if (isStandard) {
            this.ctx.textAlign = 'left'
            this.ctx.font = `bold 20px ${THEME.typography.fontFamily}`
            this.ctx.fillStyle = '#9ca3af'
            this.ctx.fillText('oshigrid.me', padding, leftY)
        }

        this.ctx.textAlign = 'right'
        this.ctx.font = `bold 28px ${THEME.typography.fontFamily}`

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
        } catch {
            this.ctx.fillStyle = THEME.colors.watermark
            this.ctx.fillText('【我推的格子】', x, y)
        }

        this.ctx.restore()
    }

    private drawChallengeHeader(title: string, subtitle: string, width: number, height: number) {
        const centerX = width / 2

        // --- 1. Main Title (Dynamic Sizing) ---
        this.ctx.fillStyle = '#111827' // gray-900
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.shadowColor = 'rgba(0,0,0,0.1)'
        this.ctx.shadowBlur = 10

        // Start big, shrink to fit
        const maxWidth = width - 60
        let mainFontSize = 72
        this.ctx.font = `bold ${mainFontSize}px "Noto Serif SC", serif`

        while (this.ctx.measureText(title).width > maxWidth && mainFontSize > 30) {
            mainFontSize -= 2
            this.ctx.font = `bold ${mainFontSize}px "Noto Serif SC", serif`
        }

        // Draw Title - Adjusted Y to be tighter
        const titleY = height / 2 - 25
        this.ctx.fillText(title, centerX, titleY)
        this.ctx.shadowBlur = 0

        // --- 2. Subtitle (Template Name) ---
        // Always show subtitle
        if (subtitle) {
            this.ctx.font = `bold 32px ${THEME.typography.fontFamily}`
            this.ctx.fillStyle = THEME.colors.accent // pink
            this.ctx.fillText(`— ${subtitle} —`, centerX, titleY + mainFontSize / 2 + 35)
        }
    }

    private async drawChallengeFooter(
        qrUrl: string,
        width: number,
        height: number,
        padding: number,
        layout: { mode: 'horizontal' | 'vertical', height: number },
        filler?: string,
        creator?: string
    ) {
        const ctx = this.ctx
        const boxHeight = layout.height
        const boxY = height - boxHeight - padding / 2
        const boxX = padding
        const boxWidth = width - (padding * 2)

        const centerX = boxX + boxWidth / 2

        // Simple Border
        ctx.beginPath()
        ctx.moveTo(boxX, boxY)
        ctx.lineTo(boxX + boxWidth, boxY)
        ctx.lineWidth = 2
        ctx.strokeStyle = '#f3f4f6' // gray-100
        ctx.stroke()

        try {
            const logo = await this.loadImage('/logo.png')
            const qr = await this.loadImage(qrUrl)

            const logoSize = 50
            const qrSize = 130

            // --- VERTICAL STACK LAYOUT ---
            if (layout.mode === 'vertical') {
                // 1. Top Section: Logo + Brand
                const topY = boxY + 50
                ctx.font = `bold 30px ${THEME.typography.fontFamily}`

                const part1 = '【我推'
                const part2 = '的'
                const part3 = '格子】'
                const brandWidth = ctx.measureText(part1 + part2 + part3).width

                const totalTopWidth = logoSize + 20 + brandWidth
                const startX = centerX - totalTopWidth / 2

                ctx.drawImage(logo, startX, topY - logoSize / 2, logoSize, logoSize)

                const textX = startX + logoSize + 20
                ctx.textAlign = 'left'
                ctx.textBaseline = 'middle'

                ctx.fillStyle = THEME.colors.watermark || '#9ca3af'
                ctx.fillText(part1, textX, topY)
                ctx.fillStyle = THEME.colors.accent
                ctx.fillText(part2, textX + ctx.measureText(part1).width, topY)
                ctx.fillStyle = THEME.colors.watermark || '#9ca3af'
                ctx.fillText(part3, textX + ctx.measureText(part1 + part2).width, topY)

                // 2. Attribution (Auto-Shrink)
                let attrY = topY + 50
                const hasCreator = !!creator
                const hasFiller = !!filler

                if (hasCreator || hasFiller) {
                    ctx.textAlign = 'center'
                    ctx.fillStyle = '#6b7280'

                    let text = ''
                    if (hasCreator && !hasFiller) text = `制表: ${creator}`
                    else if (hasCreator && hasFiller) text = `制表: ${creator} | 填表: ${filler}`
                    else if (!hasCreator && hasFiller) text = `填表: ${filler}`

                    // Auto-shrink logic
                    let attrFontSize = 24
                    ctx.font = `bold ${attrFontSize}px ${THEME.typography.fontFamily}`
                    while (ctx.measureText(text).width > boxWidth && attrFontSize > 12) {
                        attrFontSize -= 2
                        ctx.font = `bold ${attrFontSize}px ${THEME.typography.fontFamily}`
                    }

                    ctx.fillText(text, centerX, attrY)
                }

                // 3. QR Code with Text (Side by Side Centered)
                const qrY = boxY + boxHeight - qrSize - 20
                const textBlockWidth = 140
                const totalQRWidth = qrSize + 20 + textBlockWidth
                const qrStartX = centerX - totalQRWidth / 2

                ctx.drawImage(qr, qrStartX, qrY, qrSize, qrSize)

                const textStartX = qrStartX + qrSize + 20
                const qrCenterY = qrY + qrSize / 2

                ctx.textAlign = 'left'
                ctx.fillStyle = '#374151'
                ctx.font = `bold 24px ${THEME.typography.fontFamily}`
                ctx.fillText('扫码接受挑战', textStartX, qrCenterY - 16)

                ctx.fillStyle = '#9ca3af'
                ctx.font = `20px ${THEME.typography.fontFamily}`
                ctx.fillText('长按识别二维码', textStartX, qrCenterY + 16)

            }
            // --- HORIZONTAL LAYOUT ---
            else {
                // Logo Area
                const logoY = boxY + (boxHeight - 50) / 2
                ctx.drawImage(logo, boxX, logoY, logoSize, logoSize)

                // Text
                ctx.textAlign = 'left'
                ctx.textBaseline = 'middle'
                const textX = boxX + logoSize + 20
                const centerY = logoY + logoSize / 2

                ctx.font = `bold 30px ${THEME.typography.fontFamily}`

                // Part 1: Brand
                const part1 = '【我推'
                const part2 = '的'
                const part3 = '格子】'
                const w1 = ctx.measureText(part1).width
                const w2 = ctx.measureText(part2).width
                const w3 = ctx.measureText(part3).width

                ctx.fillStyle = THEME.colors.watermark || '#9ca3af'
                ctx.fillText(part1, textX, centerY)
                ctx.fillStyle = THEME.colors.accent
                ctx.fillText(part2, textX + w1, centerY)
                ctx.fillStyle = THEME.colors.watermark || '#9ca3af'
                ctx.fillText(part3, textX + w1 + w2, centerY)

                // Part 2: Attribution
                const hasCreator = !!creator
                const hasFiller = !!filler
                if (hasCreator || hasFiller) {
                    const brandWidth = w1 + w2 + w3
                    const infoX = textX + brandWidth + 30
                    ctx.fillStyle = '#6b7280'
                    let text = ''
                    if (hasCreator && !hasFiller) text = `制表: ${creator}`
                    else if (hasCreator && hasFiller) text = `制表: ${creator}  |  填表: ${filler}`
                    else if (!hasCreator && hasFiller) text = `填表: ${filler}`

                    // Simple truncating if needed (though getFooterLayout ensure it fits mostly)
                    ctx.fillText(text, infoX, centerY)
                }

                // QR Area
                const qrY = boxY + (boxHeight - qrSize) / 2
                const qrX = boxX + boxWidth - qrSize - 10
                ctx.drawImage(qr, qrX, qrY, qrSize, qrSize)

                ctx.textAlign = 'right'
                ctx.textBaseline = 'middle'
                const qrCenterY = qrY + qrSize / 2

                ctx.fillStyle = '#374151'
                ctx.font = `bold 24px ${THEME.typography.fontFamily}`
                ctx.fillText('扫码接受挑战', qrX - 25, qrCenterY - 16)

                ctx.fillStyle = '#9ca3af'
                ctx.font = `20px ${THEME.typography.fontFamily}`
                ctx.fillText('长按识别二维码', qrX - 25, qrCenterY + 16)
            }

        } catch (e) {
            console.warn('Footer draw failed', e)
        }
    }
}
