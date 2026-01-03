import { domToPng } from 'modern-screenshot';

export interface ExportOptions {
    fileName: string;
    scale?: number;
    quality?: number; // 0 to 1
    style?: Record<string, string>;
}

export class ExportService {
    private static instance: ExportService;

    public static getInstance(): ExportService {
        if (!ExportService.instance) {
            ExportService.instance = new ExportService();
        }
        return ExportService.instance;
    }

    /**
     * Export a DOM element to PNG and trigger download
     */
    async exportToPng(element: HTMLElement, options: ExportOptions): Promise<void> {
        // 1. Manually clone for full control
        const rect = element.getBoundingClientRect();
        const clone = element.cloneNode(true) as HTMLElement;

        // 2. Position it visibly but hidden (z-index strategy from RFC 012)
        // Must match dimensions of original to ensure layout is correct
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.position = 'absolute';
        clone.style.top = '0';
        clone.style.left = '0';
        clone.style.zIndex = '-9999';
        clone.style.backgroundColor = '#ffffff'; // Ensure opaque background
        clone.style.pointerEvents = 'none';

        // Apply custom style overrides
        if (options.style) {
            Object.assign(clone.style, options.style);
        }

        document.body.appendChild(clone);

        try {
            // 3. Preload & Proxy Images
            // We must wait for all proxy images to actually load successfully
            const images = Array.from(clone.getElementsByTagName('img'));

            const loadPromises = images.map((img) => {
                return new Promise<void>((resolve) => {
                    // Skip data/blob/already proxied
                    if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('blob:') && !img.src.includes('wsrv.nl')) {
                        const originalSrc = img.src;
                        // Use wsrv.nl proxy logic
                        img.crossOrigin = 'anonymous';
                        img.src = `https://wsrv.nl/?url=${encodeURIComponent(originalSrc)}&output=png`;

                        img.onload = () => resolve();
                        img.onerror = () => {
                            console.warn(`Export: Failed to load proxy image ${originalSrc}`);
                            // Fallback? Or just resolve to let capture proceed
                            resolve();
                        };
                    } else {
                        // If already loaded or local
                        if (img.complete) resolve();
                        else {
                            img.onload = () => resolve();
                            img.onerror = () => resolve();
                        }
                    }
                });
            });

            // Wait for images (with 5s fallback timeout)
            await Promise.race([
                Promise.all(loadPromises),
                new Promise(resolve => setTimeout(resolve, 5000))
            ]);

            // Artificial delay to allow layout to settle after image load
            await new Promise(r => setTimeout(r, 100));

            // 4. Capture
            const scale = options.scale || 2;
            const dataUrl = await domToPng(clone, {
                scale,
                quality: options.quality || 1,
                backgroundColor: '#ffffff',
                style: {
                    transform: 'none',
                    transformOrigin: 'top left'
                },
                filter: (node) => {
                    if (node instanceof HTMLElement && node.hasAttribute('data-no-export')) {
                        return false;
                    }
                    return true;
                }
            });

            this.downloadImage(dataUrl, options.fileName);

        } catch (error) {
            console.error('[ExportService] Failed to export:', error);
            throw error;
        } finally {
            // 5. Cleanup
            if (document.body.contains(clone)) {
                document.body.removeChild(clone);
            }
        }
    }

    /**
     * Download a Blob or DataURL directly
     */
    public downloadBlob(blobOrUrl: Blob | string, fileName: string) {
        let url: string;
        if (blobOrUrl instanceof Blob) {
            url = URL.createObjectURL(blobOrUrl);
        } else {
            url = blobOrUrl;
        }

        this.downloadImage(url, fileName);
    }

    private downloadImage(dataUrl: string, fileName: string) {
        const link = document.createElement('a');
        link.download = `${fileName}-${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export const getExportService = () => ExportService.getInstance();
