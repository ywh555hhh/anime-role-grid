import { ref } from 'vue'
import type { GridItem } from '~/types'
import * as Mp4Muxer from 'mp4-muxer'
import { THEME } from '~/logic/constants/theme'

interface VideoSettings {
    platform: string
    speed: string
    includeEmpty: boolean
    format: 'mp4' | 'webm'
}

// Feature Detection
export const isMp4Supported = typeof VideoEncoder !== 'undefined'

export function useVideoExport() {
    const isModalOpen = ref(false)
    const isExporting = ref(false)
    const progress = ref(0)
    const statusText = ref('')
    const lastExportFormat = ref<'mp4' | 'webm' | null>(null)

    // Pre-load image helper
    function loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.referrerPolicy = 'no-referrer'

            // Bypass proxy for local blob/data URLs
            if (url.startsWith('blob:') || url.startsWith('data:')) {
                img.src = url
            } else {
                img.src = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png&n=-1`
            }

            img.onload = () => resolve(img)
            img.onerror = () => {
                const placeholder = new Image()
                placeholder.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
                resolve(placeholder)
            }
        })
    }

    async function generateVideo(items: GridItem[], categories: string[], settings: VideoSettings) {
        if (isExporting.value) return
        isExporting.value = true
        progress.value = 0
        statusText.value = '正在准备画布...'
        lastExportFormat.value = null

        try {
            // 1. Filter items
            const validIndices: number[] = []
            items.forEach((item, index) => {
                if (settings.includeEmpty || (item.character && item.character.image)) {
                    validIndices.push(index)
                }
            })

            if (validIndices.length === 0) throw new Error('没有可导出的内容')

            // 2. Setup resolution
            let width = 1080
            let height = 1920
            if (settings.platform === 'bili') { width = 1920; height = 1080 }
            else if (settings.platform === 'square') { width = 1080; height = 1080 }

            // GLOBAL SCALE FACTOR IMPLEMENTATION (Fit to Box)
            const maxCardW = width * 0.8
            const maxCardH = height * 0.8

            const baseCardW = 1080 * 0.8
            const baseCardH = baseCardW / THEME.layout.cellAspectRatio

            const scaleW = maxCardW / baseCardW
            const scaleH = maxCardH / baseCardH

            const scale = Math.min(scaleW, scaleH)

            // 3. Load Assets (Phase 1)
            statusText.value = '正在加载图片素材...'
            const loadedImages: (HTMLImageElement | null)[] = []

            for (let i = 0; i < validIndices.length; i++) {
                const idx = validIndices[i]!
                const item = items[idx]!

                progress.value = (i / validIndices.length) * 0.2 // 0-20%

                if (item.character?.image) {
                    const img = await loadImage(item.character.image)
                    loadedImages.push(img)
                } else {
                    loadedImages.push(null)
                }
            }

            // Canvas Setup
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas not supported')

            // Animation Parameters (Time-based for consistency)
            let durationSeconds = 3
            if (settings.speed === 'fast') durationSeconds = 1.5
            if (settings.speed === 'slow') durationSeconds = 5

            const targetFPS = 30
            const durationPerItem = Math.round(durationSeconds * targetFPS)
            const transitionFrames = Math.round(0.5 * targetFPS)
            const totalFrames = loadedImages.length * durationPerItem

            // Helper to draw a single frame
            function renderFrame(frameIndex: number) {
                const currentIndex = Math.floor(frameIndex / durationPerItem)
                const itemFrame = frameIndex % durationPerItem

                // Background
                const grad = ctx!.createLinearGradient(0, 0, 0, height)
                grad.addColorStop(0, '#f9fafb')
                grad.addColorStop(1, '#e5e7eb')
                ctx!.fillStyle = grad
                ctx!.fillRect(0, 0, width, height)

                // Layout Calculations
                const cardW = baseCardW * scale
                const cardH = baseCardH * scale

                const labelH = cardH * THEME.layout.labelHeightRatio
                const imgH = cardH - labelH

                // Design tokens scaled
                const shadowOffsetY = 10 * scale
                const shadowBlur = 20 * scale
                const strokeWidth = 10 * scale
                const titleFontSize = 80 * scale // ~width * 0.08
                const labelFontSize = 80 * scale


                const drawCard = (x: number, y: number, itemIndex: number) => {
                    const originalIndex = validIndices[itemIndex]!
                    const item = items[originalIndex]!
                    const category = categories[originalIndex] || '格子'
                    const img = loadedImages[itemIndex]

                    const cardX = x + (width - cardW) / 2
                    const cardY = y + (height - cardH) / 2

                    let cursorY = cardY

                    ctx!.save()

                    // 1. Card Container
                    ctx!.fillStyle = THEME.colors.cardBg
                    ctx!.shadowColor = THEME.colors.cardShadow
                    ctx!.shadowBlur = shadowBlur
                    ctx!.shadowOffsetY = shadowOffsetY
                    ctx!.fillRect(cardX, cardY, cardW, cardH)
                    ctx!.shadowColor = 'transparent'

                    // 2. Category Title
                    ctx!.fillStyle = THEME.colors.accent
                    ctx!.font = `bold ${titleFontSize}px ${THEME.typography.fontFamily}`
                    ctx!.textAlign = 'center'
                    ctx!.textBaseline = 'bottom'
                    ctx!.fillText(category, x + width / 2, cardY - 20 * scale)

                    // 3. Image Area
                    const imgAreaX = cardX
                    const imgAreaY = cursorY

                    ctx!.fillStyle = THEME.colors.secondaryBg
                    ctx!.fillRect(imgAreaX, imgAreaY, cardW, imgH)

                    if (img) {
                        const scaleFactor = Math.max(cardW / img.width, imgH / img.height)
                        const w = img.width * scaleFactor
                        const h = img.height * scaleFactor
                        const dx = imgAreaX + (cardW - w) / 2
                        const dy = imgAreaY // Top align

                        ctx!.save()
                        ctx!.beginPath()
                        ctx!.rect(imgAreaX, imgAreaY, cardW, imgH)
                        ctx!.clip()
                        ctx!.drawImage(img, dx, dy, w, h)
                        ctx!.restore()
                    } else {
                        ctx!.fillStyle = THEME.colors.placeholderText
                        ctx!.font = `bold ${width * 0.1}px sans-serif`
                        ctx!.textAlign = 'center'
                        ctx!.textBaseline = 'middle'
                        ctx!.fillText('?', imgAreaX + cardW / 2, imgAreaY + imgH / 2)
                    }

                    // Stroke
                    ctx!.lineWidth = strokeWidth
                    ctx!.strokeStyle = THEME.colors.stroke
                    ctx!.strokeRect(imgAreaX, imgAreaY, cardW, imgH)

                    cursorY += imgH

                    // 4. Label Area
                    const labelCenterY = cursorY + labelH / 2

                    ctx!.fillStyle = THEME.colors.text
                    let fontSize = labelFontSize
                    ctx!.font = `bold ${fontSize}px ${THEME.typography.fontFamily}`

                    // Auto-scale text to fit
                    const maxTextW = cardW * 0.9
                    const nameText = item.character?.name || '未填写'

                    while (ctx!.measureText(nameText).width > maxTextW && fontSize > 10) {
                        fontSize -= 2 * scale // Reduce by 2 scaled pixels
                        ctx!.font = `bold ${fontSize}px ${THEME.typography.fontFamily}`
                    }

                    ctx!.textBaseline = 'middle'
                    ctx!.fillText(nameText, x + width / 2, labelCenterY)

                    // 5. Branding Watermark (Pink + Black)
                    // Visual Breathing Room
                    const wmFontSize = THEME.watermark.fontSize * scale
                    const wmY = cardY + cardH + THEME.watermark.verticalPadding * scale
                    const wmX = x + width / 2

                    ctx!.font = `bold ${wmFontSize}px ${THEME.typography.fontFamily}`
                    ctx!.textBaseline = 'top'

                    // Manual Letter Spacing (Tracking) Calculation
                    // tracking = 0.25em (tracking-widest)
                    const tracking = wmFontSize * THEME.watermark.letterSpacing

                    const text1 = "【我推"
                    const text2 = "的"
                    const text3 = "格子】"

                    const w1 = ctx!.measureText(text1).width
                    const w2 = ctx!.measureText(text2).width
                    const w3 = ctx!.measureText(text3).width

                    // Total width includes the tracking spaces between segments
                    const totalWmW = w1 + w2 + w3 + (tracking * 2)

                    let currentWmX = wmX - totalWmW / 2

                    // Segment 1: Black
                    ctx!.fillStyle = '#000000'
                    ctx!.textAlign = 'left'
                    ctx!.fillText(text1, currentWmX, wmY)
                    currentWmX += w1 + tracking

                    // Segment 2: Pink
                    ctx!.fillStyle = THEME.colors.accent
                    ctx!.fillText(text2, currentWmX, wmY)
                    currentWmX += w2 + tracking

                    // Segment 3: Black
                    ctx!.fillStyle = '#000000'
                    ctx!.fillText(text3, currentWmX, wmY)

                    ctx!.restore()
                }

                // Animation Logic
                const slideStart = durationPerItem - transitionFrames

                if (itemFrame < slideStart || currentIndex === loadedImages.length - 1) {
                    drawCard(0, 0, currentIndex)
                } else {
                    const p = (itemFrame - slideStart) / transitionFrames
                    const ease = p < .5 ? 2 * p * p : -1 + (4 - 2 * p) * p
                    const offset = width * 1.2 * ease
                    drawCard(-offset, 0, currentIndex)

                    const nextIndex = currentIndex + 1
                    if (nextIndex < loadedImages.length) {
                        drawCard(width * 1.2 - offset, 0, nextIndex)
                    }
                }
            }

            statusText.value = settings.format === 'mp4' ? '正在加速渲染 MP4...' : '正在录制 WebM...'

            // DETECTION LOGIC
            const isNativeMp4 = MediaRecorder.isTypeSupported('video/mp4')
            const useNativeMp4 = settings.format === 'mp4' && isNativeMp4

            if (settings.format === 'mp4' && isMp4Supported && !isNativeMp4) {
                // === ENGINE A: High-Quality VideoEncoder (Desktop) ===
                console.log('Using VideoEncoder Engine (Desktop Path)')

                const muxer = new Mp4Muxer.Muxer({
                    target: new Mp4Muxer.ArrayBufferTarget(),
                    video: {
                        codec: 'avc',
                        width,
                        height
                    },
                    fastStart: 'in-memory'
                })

                let hasError = false
                const videoEncoder = new VideoEncoder({
                    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                    error: (e) => {
                        console.error('VideoEncoder error:', e)
                        hasError = true
                    }
                })

                videoEncoder.configure({
                    codec: 'avc1.4d0029', // Main Profile, Level 4.1
                    width,
                    height,
                    bitrate: 4_000_000,
                    framerate: targetFPS
                })

                for (let i = 0; i < totalFrames; i++) {
                    if (hasError || !isExporting.value) break

                    renderFrame(i)

                    const bitmap = await createImageBitmap(canvas)
                    const timestamp = i * (1000000 / targetFPS)

                    const frame = new VideoFrame(bitmap, { timestamp })
                    videoEncoder.encode(frame, { keyFrame: i % 120 === 0 })
                    frame.close()
                    bitmap.close()

                    progress.value = 0.2 + (i / totalFrames) * 0.8
                    if (i % 15 === 0) await new Promise(r => setTimeout(r, 0))
                }

                if (!hasError && isExporting.value) {
                    await videoEncoder.flush()
                    muxer.finalize()
                    const { buffer } = muxer.target
                    const blob = new Blob([buffer], { type: 'video/mp4' })
                    finishExport(blob, 'mp4')
                } else {
                    throw new Error('Encoding failed or cancelled')
                }

            } else {
                // === ENGINE B: MediaRecorder (Hybrid Fallback / Native Mobile MP4) ===
                // This path handles iOS/Android Native MP4 recording and WebM export.

                let mimeType = 'video/webm;codecs=vp9'
                let ext = 'webm'

                if (useNativeMp4) {
                    mimeType = 'video/mp4'
                    ext = 'mp4'
                } else if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'video/webm'
                }

                console.log(`Using MediaRecorder Engine with ${mimeType}`)

                const stream = canvas.captureStream(targetFPS)
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: 4_000_000
                })

                const chunks: Blob[] = []
                mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

                const recordingFinished = new Promise<Blob>(resolve => {
                    mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
                })

                mediaRecorder.start()

                // Precise Timing Loop for 30fps Recording
                let frame = 0
                let lastTime = performance.now()
                const interval = 1000 / targetFPS

                const animate = (time: number) => {
                    if (frame >= totalFrames || !isExporting.value) {
                        if (mediaRecorder.state === 'recording') mediaRecorder.stop()
                        return
                    }

                    const delta = time - lastTime

                    if (delta >= interval) {
                        lastTime = time - (delta % interval)
                        renderFrame(frame)
                        progress.value = 0.2 + (frame / totalFrames) * 0.8
                        frame++
                    }

                    requestAnimationFrame(animate)
                }
                requestAnimationFrame(animate)

                const blob = await recordingFinished
                finishExport(blob, ext)
            }

        } catch (error: any) {
            console.error(error)
            alert('导出失败: ' + (error.message || '未知错误'))
            isExporting.value = false
        }
    }

    const isSuccessModalOpen = ref(false)

    function finishExport(blob: Blob, ext: string) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `anime-grid-export-${Date.now()}.${ext}`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 5000)

        statusText.value = '导出成功！'
        lastExportFormat.value = ext as any

        // Close settings setup, open success confirm
        isModalOpen.value = false
        isSuccessModalOpen.value = true
        isExporting.value = false
    }

    return {
        isModalOpen,
        isSuccessModalOpen,
        isExporting,
        progress,
        statusText,
        lastExportFormat,
        generateVideo
    }
}
