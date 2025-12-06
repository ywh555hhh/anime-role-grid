import { ref } from 'vue'
import type { GridItem } from '~/types'
import * as Mp4Muxer from 'mp4-muxer'

interface VideoSettings {
    platform: string
    speed: string
    includeEmpty: boolean
    format: 'mp4' | 'webm'
}

const FONT_FAMILY = '"Noto Serif SC", serif'
const COLORS = {
    bg: '#ffffff',
    text: '#000000',
    accent: '#e4007f'
}

export const isMp4Supported = typeof VideoEncoder !== 'undefined'

export function useVideoExport() {
    const isModalOpen = ref(false)
    const isExporting = ref(false)
    const progress = ref(0)
    const statusText = ref('')
    const lastExportFormat = ref<'mp4' | 'webm' | null>(null)

    function loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.src = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png&n=-1`
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
            const validIndices: number[] = []
            items.forEach((item, index) => {
                if (settings.includeEmpty || (item.character && item.character.image)) {
                    validIndices.push(index)
                }
            })

            if (validIndices.length === 0) throw new Error('没有可导出的内容')

            let width = 1080
            let height = 1920
            if (settings.platform === 'bili') { width = 1920; height = 1080 }
            else if (settings.platform === 'square') { width = 1080; height = 1080 }

            statusText.value = '正在加载图片素材...'
            const loadedImages: (HTMLImageElement | null)[] = []

            for (let i = 0; i < validIndices.length; i++) {
                const idx = validIndices[i]!
                const item = items[idx]!
                progress.value = (i / validIndices.length) * 0.2
                if (item.character?.image) {
                    const img = await loadImage(item.character.image)
                    loadedImages.push(img)
                } else {
                    loadedImages.push(null)
                }
            }

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas not supported')

            let durationPerItem = 180
            if (settings.speed === 'fast') durationPerItem = 90
            if (settings.speed === 'slow') durationPerItem = 300

            const transitionFrames = 40
            const totalFrames = loadedImages.length * durationPerItem
            const targetFPS = 60

            function renderFrame(frameIndex: number) {
                const currentIndex = Math.floor(frameIndex / durationPerItem)
                const itemFrame = frameIndex % durationPerItem

                const grad = ctx!.createLinearGradient(0, 0, 0, height)
                grad.addColorStop(0, '#f9fafb')
                grad.addColorStop(1, '#e5e7eb')
                ctx!.fillStyle = grad
                ctx!.fillRect(0, 0, width, height)

                const drawCard = (x: number, y: number, itemIndex: number) => {
                    const originalIndex = validIndices[itemIndex]!
                    const item = items[originalIndex]!
                    const category = categories[originalIndex] || '格子'
                    const img = loadedImages[itemIndex]

                    const cardW = width * 0.8
                    const cardH = height * 0.8
                    const cardX = x + (width - cardW) / 2
                    const cardY = y + (height - cardH) / 2

                    ctx!.save()

                    ctx!.fillStyle = '#ffffff'
                    ctx!.shadowColor = 'rgba(0,0,0,0.2)'
                    ctx!.shadowBlur = 20
                    ctx!.shadowOffsetY = 10
                    ctx!.fillRect(cardX, cardY, cardW, cardH)
                    ctx!.shadowColor = 'transparent'

                    ctx!.fillStyle = COLORS.accent
                    ctx!.font = `bold ${width * 0.08}px ${FONT_FAMILY}`
                    ctx!.textAlign = 'center'
                    ctx!.textBaseline = 'top'
                    ctx!.fillText(category, x + width / 2, cardY + cardH * 0.05)

                    const imgAreaW = cardW * 0.8
                    const imgAreaH = cardH * 0.6
                    const imgAreaX = cardX + (cardW - imgAreaW) / 2
                    const imgAreaY = cardY + cardH * 0.15

                    ctx!.fillStyle = '#f3f4f6'
                    ctx!.fillRect(imgAreaX, imgAreaY, imgAreaW, imgAreaH)

                    if (img) {
                        const scale = Math.max(imgAreaW / img.width, imgAreaH / img.height)
                        const w = img.width * scale
                        const h = img.height * scale
                        const dx = imgAreaX + (imgAreaW - w) / 2
                        const dy = imgAreaY + (imgAreaH - h) / 2

                        ctx!.save()
                        ctx!.beginPath()
                        ctx!.rect(imgAreaX, imgAreaY, imgAreaW, imgAreaH)
                        ctx!.clip()
                        ctx!.drawImage(img, dx, dy, w, h)
                        ctx!.restore()
                    } else {
                        ctx!.fillStyle = '#d1d5db'
                        ctx!.font = `bold ${width * 0.1}px sans-serif`
                        ctx!.textAlign = 'center'
                        ctx!.textBaseline = 'middle'
                        ctx!.fillText('?', imgAreaX + imgAreaW / 2, imgAreaY + imgAreaH / 2)
                    }

                    ctx!.lineWidth = 10
                    ctx!.strokeStyle = '#1f2937'
                    ctx!.strokeRect(imgAreaX, imgAreaY, imgAreaW, imgAreaH)

                    const nameY = imgAreaY + imgAreaH + cardH * 0.05
                    ctx!.fillStyle = '#111827'
                    ctx!.font = `bold ${width * 0.08}px ${FONT_FAMILY}`
                    ctx!.textBaseline = 'top'
                    ctx!.fillText(item.character?.name || '未填写', x + width / 2, nameY)

                    ctx!.fillStyle = 'rgba(0,0,0,0.3)'
                    ctx!.font = `bold ${width * 0.04}px ${FONT_FAMILY}`
                    ctx!.fillText('【我推的格子】', x + width / 2, cardY + cardH - cardH * 0.05)

                    ctx!.restore()
                }

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

            if (settings.format === 'mp4' && isMp4Supported) {
                // === ENGINE A: MP4 (WebCodecs) ===
                const muxer = new Mp4Muxer.Muxer({
                    target: new Mp4Muxer.ArrayBufferTarget(),
                    video: {
                        codec: 'avc', // H.264
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
                    codec: 'avc1.4d002a', // Main Profile, Level 4.2 (1080p60)
                    width,
                    height,
                    bitrate: 8_000_000,
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
                // === ENGINE B: WebM (Fallback) ===
                const stream = canvas.captureStream(targetFPS)
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp9',
                    videoBitsPerSecond: 8000000
                })

                const chunks: Blob[] = []
                mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

                const recordingFinished = new Promise<Blob>(resolve => {
                    mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
                })

                mediaRecorder.start()

                let frame = 0
                const animate = () => {
                    if (frame >= totalFrames || !isExporting.value) {
                        if (mediaRecorder.state === 'recording') mediaRecorder.stop()
                        return
                    }
                    renderFrame(frame)
                    progress.value = 0.2 + (frame / totalFrames) * 0.8
                    frame++
                    requestAnimationFrame(animate)
                }
                animate()

                const blob = await recordingFinished
                finishExport(blob, 'webm')
            }

        } catch (error: any) {
            console.error(error)
            alert('导出失败: ' + (error.message || '未知错误'))
        } finally {
            isExporting.value = false
        }
    }

    function finishExport(blob: Blob, ext: string) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `anime-grid-export-${Date.now()}.${ext}`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 5000)

        statusText.value = '导出成功！'
        lastExportFormat.value = ext as any

        if (ext === 'mp4') {
            setTimeout(() => { isModalOpen.value = false }, 1000)
        }
    }

    return {
        isModalOpen,
        isExporting,
        progress,
        statusText,
        lastExportFormat,
        generateVideo
    }
}
