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
    const images = Array.from(element.getElementsByTagName('img'))
    const originalSrcs = new Map<HTMLImageElement, string>()

    // Process images in batches to avoid overwhelming mobile browsers
    const BATCH_SIZE = 3
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
        const batch = images.slice(i, i + BATCH_SIZE)
        await Promise.all(batch.map(async (img) => {
            try {
                const src = img.getAttribute('src')
                if (!src || src.startsWith('data:')) return

                originalSrcs.set(img, src)

                // Use proxy to fetch image data
                let fetchUrl = src
                // Add timestamp to force fresh fetch (bypass browser cache)
                if (fetchUrl.includes('?')) {
                    fetchUrl += `&t=${Date.now()}`
                } else {
                    fetchUrl += `?t=${Date.now()}`
                }

                // Try to fetch with robust settings and timeout
                try {
                    await Promise.race([
                        fetchAndConvertToBase64(fetchUrl, img),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 5s')), 5000))
                    ])
                } catch (e) {
                    console.warn(`Proxy fetch failed for ${fetchUrl}:`, e)
                    if (src.includes('wsrv.nl')) {
                        try {
                            const urlParam = new URL(src).searchParams.get('url')
                            if (urlParam) {
                                await Promise.race([
                                    fetchAndConvertToBase64(urlParam, img),
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 5s')), 5000))
                                ])
                            }
                        } catch (fallbackError) {
                            console.warn('Fallback fetch also failed:', fallbackError)
                        }
                    }
                }
            } catch (e) {
                console.warn('Image pre-processing failed:', e)
            }
        }))
        // Small delay between batches to let UI breathe
        await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Wait for DOM to update with new Base64 srcs
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 500))

    // Detect Mobile/iOS
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

    try {
        // 3. Generate PNG
        // Lower pixelRatio on mobile to prevent memory crashes
        const ratio = isMobile ? 2 : 3

        const dataUrl = await toPng(element, {
            backgroundColor: '#ffffff',
            pixelRatio: ratio,
            cacheBust: true,
            skipOnError: true,
            fontEmbedCSS: '',
        } as any)

        // 4. Download or Open
        if (isIOS) {
            // iOS Safari doesn't support download attribute well, open in new tab
            const win = window.open()
            if (win) {
                win.document.write('<img src="' + dataUrl + '" style="width:100%"/>')
                win.document.title = "长按保存图片"
            } else {
                // Fallback if popup blocked
                window.location.href = dataUrl
            }
        } else {
            const link = document.createElement('a')
            link.download = `${fileName}-${Date.now()}.png`
            link.href = dataUrl
            link.click()
        }

    } finally {
        // 5. Restore original srcs
        originalSrcs.forEach((src, img) => {
            img.src = src
            img.setAttribute('crossorigin', 'anonymous')
        })
    }
}

async function fetchAndConvertToBase64(url: string, img: HTMLImageElement) {
    const response = await fetch(url, {
        cache: 'no-cache',
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
    })
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)

    const blob = await response.blob()

    await new Promise<void>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            if (reader.result) {
                // Wait for image to actually decode and render
                img.onload = () => resolve()
                img.onerror = () => {
                    // Even if render fails, we resolve to continue (it might just be a glitch)
                    console.warn('Image render failed after Base64 conversion')
                    resolve()
                }
                img.src = reader.result as string
                img.removeAttribute('crossorigin')
            } else {
                reject(new Error('Blob conversion failed'))
            }
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}
