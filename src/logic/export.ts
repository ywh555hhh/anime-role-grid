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

                // Try to fetch with robust settings
                try {
                    await fetchAndConvertToBase64(fetchUrl, img)
                } catch (e) {
                    console.warn('Proxy fetch failed, trying fallback:', e)
                    if (src.includes('wsrv.nl')) {
                        try {
                            const urlParam = new URL(src).searchParams.get('url')
                            if (urlParam) {
                                await fetchAndConvertToBase64(urlParam, img)
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

    try {
        // 3. Generate PNG
        const dataUrl = await toPng(element, {
            backgroundColor: '#ffffff',
            pixelRatio: 3,
            cacheBust: true,
            skipOnError: true,
            fontEmbedCSS: '', // Skip font embedding to prevent CORS issues with fonts
        } as any)

        // 4. Download
        const link = document.createElement('a')
        link.download = `${fileName}-${Date.now()}.png`
        link.href = dataUrl
        link.click()

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
        cache: 'default',
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
                img.src = reader.result as string
                img.removeAttribute('crossorigin')
                resolve()
            } else {
                reject(new Error('Blob conversion failed'))
            }
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}
