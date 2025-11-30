import { nextTick } from 'vue'

export async function exportGridAsImage(elementId: string, fileName: string) {
    const element = document.getElementById(elementId)
    if (!element) throw new Error('找不到导出目标元素')

    // 1. Dynamic import html-to-image
    let toPng
    try {
        const module = await import('html-to-image')
        toPng = module.toPng
    } catch (e) {
        throw new Error('组件加载失败，请重启服务器')
    }

    // 2. Pre-process images: Convert all images to Base64 manually
    // This bypasses html-to-image's internal fetching, which is often flaky with CORS
    const images = Array.from(element.getElementsByTagName('img'))
    const originalSrcs = new Map<HTMLImageElement, string>()

    await Promise.all(images.map(async (img) => {
        try {
            const src = img.getAttribute('src')
            if (!src || src.startsWith('data:')) return

            originalSrcs.set(img, src)

            // Use proxy to fetch image data
            // Note: The src in the hidden grid is already proxied by Grid.vue, 
            // but we fetch it here to get the blob.
            const response = await fetch(src, { cache: 'force-cache' })
            const blob = await response.blob()

            await new Promise<void>((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => {
                    if (reader.result) {
                        img.src = reader.result as string
                        img.removeAttribute('crossorigin') // Base64 doesn't need crossorigin
                    }
                    resolve()
                }
                reader.readAsDataURL(blob)
            })
        } catch (e) {
            console.warn('Image pre-processing failed:', e)
            // If failed, we leave the original src and hope html-to-image can handle it
            // or it will just show as broken (better than crashing)
        }
    }))

    // Wait for DOM to update with new Base64 srcs
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 500)) // Extra safety buffer

    try {
        // 3. Generate PNG
        const dataUrl = await toPng(element, {
            backgroundColor: '#ffffff',
            pixelRatio: 3,
            cacheBust: true,
            skipOnError: true, // Prevent crash on remaining errors
        } as any)

        // 4. Download
        const link = document.createElement('a')
        link.download = `${fileName}-${Date.now()}.png`
        link.href = dataUrl
        link.click()

    } finally {
        // 5. Restore original srcs (optional, since this is a hidden grid, but good practice)
        originalSrcs.forEach((src, img) => {
            img.src = src
            img.setAttribute('crossorigin', 'anonymous')
        })
    }
}
