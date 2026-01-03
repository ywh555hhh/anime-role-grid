import QRCode from 'qrcode';

// --- Types ---
export interface CanvasGridItem {
    visual?: { src?: string; label?: string };
    meta?: { name?: string };
}

export interface CanvasDrawOptions {
    items: CanvasGridItem[];
    cols: number;
    title: string;
    templateName: string;
    showNames: boolean;
    qrCodeUrl?: string; // Optional URL to generate QR for
    creator?: string;
    filler?: string;
}

// --- Theme Constants (Ported from V1) ---
const THEME = {
    colors: {
        bg: '#ffffff',
        text: '#000000',
        accent: '#e4007f', // Core Pink
        border: '#000000',
        watermark: '#000000',
        secondaryBg: '#f3f4f6', // Image area background
        placeholderText: '#d1d5db',
        cardBg: '#ffffff',
        brandingText: 'rgba(0,0,0,0.3)',
    },
    typography: {
        fontFamily: '"Noto Serif SC", serif',
    },
    layout: {
        cellAspectRatio: 120 / 187,
        labelHeightRatio: 25 / 187,
    }
};

const CELL_WIDTH = 300;
const CELL_HEIGHT = CELL_WIDTH / THEME.layout.cellAspectRatio;
const BORDER_WIDTH = 4;
const LABEL_HEIGHT = CELL_HEIGHT * THEME.layout.labelHeightRatio;

export class CanvasGenerator {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;

    constructor() {
        this.canvas = document.createElement('canvas');
        const ctx = this.canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        this.ctx = ctx;
    }

    // --- Image Utilities ---
    private getImageUrl(url?: string): string {
        if (!url) return '';
        if (url.startsWith('blob:') || url.startsWith('data:')) {
            return url;
        }
        // Use V1 Proxy Logic for CORS
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png&n=-1&t=${Date.now()}`;
    }

    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.referrerPolicy = 'no-referrer';

            img.onload = async () => {
                try {
                    await img.decode();
                    if (img.naturalWidth === 0 || img.naturalHeight === 0) throw new Error('Zero dimension');
                    resolve(img);
                } catch (e) {
                    console.warn(`Image decode failed: ${url}`, e);
                    this.resolvePlaceholder(resolve);
                }
            };

            img.onerror = () => {
                console.warn(`Failed to load image: ${url}`);
                this.resolvePlaceholder(resolve);
            };

            img.src = url;
        });
    }

    private resolvePlaceholder(resolve: (value: HTMLImageElement) => void) {
        const placeholder = new Image();
        // 1x1 Transparent GIF
        placeholder.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        resolve(placeholder);
    }

    // --- Layout Logic ---
    private getFooterLayout(width: number, filler?: string, creator?: string): { mode: 'horizontal' | 'vertical', height: number } {
        const padding = 60;
        const safeWidth = width - (padding * 2);
        const brandWidth = 280; // Logo + Text
        const qrWidth = 320; // QR + Text
        let attrWidth = 0;

        if (creator || filler) {
            this.ctx.font = `bold 30px ${THEME.typography.fontFamily}`;
            let text = '';
            if (creator && !filler) text = `制表: ${creator}`;
            else if (creator && filler) text = `制表: ${creator}  |  填表: ${filler}`;
            else text = `填表: ${filler}`;
            attrWidth = this.ctx.measureText(text).width + 60;
        }

        const totalRequired = brandWidth + attrWidth + qrWidth;
        const fitsHorizontal = totalRequired <= safeWidth;

        return fitsHorizontal ? { mode: 'horizontal', height: 160 } : { mode: 'vertical', height: 320 };
    }

    // --- Main Generation ---
    async generate(options: CanvasDrawOptions): Promise<Blob> {
        const { items, cols, title, templateName, showNames } = options;

        // Default Title Logic
        const effectiveTitle = (title && title.trim()) ? title : '我的二次元成分表';
        const effectiveTemplateName = templateName || '自定义模板';

        const rows = Math.ceil(items.length / cols);
        const gridWidth = cols * CELL_WIDTH;
        const nameHeight = showNames ? LABEL_HEIGHT : 0;
        const actualCellHeight = CELL_HEIGHT + nameHeight;

        // Challenge Mode (Default for V3 Export)
        const titleHeight = 250;
        const padding = 60;
        const canvasWidth = gridWidth + (padding * 2);

        // QR Code Generation
        let qrDataUrl = '';
        if (options.qrCodeUrl) {
            try {
                qrDataUrl = await QRCode.toDataURL(options.qrCodeUrl, { margin: 1 });
            } catch (e) {
                console.warn('QR Gen Failed', e);
            }
        }

        // Footer Layout
        const footerLayout = this.getFooterLayout(canvasWidth, options.filler, options.creator);
        const footerHeight = footerLayout.height;
        const canvasHeight = titleHeight + (rows * actualCellHeight) + footerHeight + padding;

        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;

        // Background
        this.ctx.fillStyle = '#fafafa'; // Challenge Mode BG
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw Header
        this.drawHeader(effectiveTitle, effectiveTemplateName, canvasWidth, titleHeight);

        // Load Images
        const images = await Promise.all(
            items.map(item => item.visual?.src ? this.loadImage(this.getImageUrl(item.visual.src)) : Promise.resolve(null))
        );

        const startX = padding;
        const startY = titleHeight;

        this.ctx.lineWidth = BORDER_WIDTH;
        this.ctx.strokeStyle = THEME.colors.border;
        this.ctx.lineCap = 'square'; // Ensure crisp corners

        // Loop 1: Draw Content First (Background)
        for (let i = 0; i < items.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * CELL_WIDTH;
            const y = startY + row * actualCellHeight;
            const item = items[i];
            const img = images[i];

            if (item) {
                this.drawCellContent(x, y, item, img || null, showNames);
            }
        }

        // Loop 2: Draw Borders On Top (Foreground)
        // This prevents next cell's background from overdrawing previous cell's border
        this.ctx.lineWidth = BORDER_WIDTH;
        this.ctx.strokeStyle = THEME.colors.border;
        this.ctx.lineCap = 'square';

        for (let i = 0; i < items.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * CELL_WIDTH;
            const y = startY + row * actualCellHeight;
            const item = items[i];

            const isLastCol = col === cols - 1;
            const isLastRow = row === rows - 1;

            if (item) {
                this.drawCellBorders(x, y, isLastCol, isLastRow, showNames);
            }
        }

        // Outer Border (V1 Logic: Single Rect around everything)
        // Note: Canvas strokeRect draws centered on the path. 
        // V1 BORDER_WIDTH = 4. 
        this.ctx.beginPath();
        this.ctx.rect(startX, startY, gridWidth, rows * actualCellHeight);
        this.ctx.lineWidth = BORDER_WIDTH;
        this.ctx.strokeStyle = THEME.colors.border;
        this.ctx.stroke();

        // Draw Footer
        if (qrDataUrl) {
            await this.drawFooter(qrDataUrl, canvasWidth, canvasHeight, padding, footerLayout, options.filler, options.creator);
        } else {
            // Fallback simple watermark if needed
            this.drawSimpleWatermark(canvasWidth, canvasHeight, padding);
        }

        return new Promise<Blob>((resolve, reject) => {
            this.canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas to Blob failed'));
            }, 'image/png');
        });
    }

    private drawHeader(title: string, subtitle: string, width: number, height: number) {
        const centerX = width / 2;
        this.ctx.fillStyle = '#111827';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let fontSize = 72;
        this.ctx.font = `bold ${fontSize}px ${THEME.typography.fontFamily}`;
        const maxWidth = width - 60;

        while (this.ctx.measureText(title).width > maxWidth && fontSize > 30) {
            fontSize -= 2;
            this.ctx.font = `bold ${fontSize}px ${THEME.typography.fontFamily}`;
        }

        const titleY = height / 2 - 25;
        this.ctx.fillText(title, centerX, titleY);

        if (subtitle) {
            this.ctx.font = `bold 32px ${THEME.typography.fontFamily}`;
            this.ctx.fillStyle = THEME.colors.accent;
            this.ctx.fillText(`— ${subtitle} —`, centerX, titleY + fontSize / 2 + 35);
        }
    }

    private drawCellContent(x: number, y: number, item: CanvasGridItem, img: HTMLImageElement | null, showNames: boolean) {
        this.ctx.lineWidth = BORDER_WIDTH; // Reset safety
        const imageAreaHeight = CELL_HEIGHT - LABEL_HEIGHT;

        // Image
        if (img) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.rect(x, y, CELL_WIDTH, imageAreaHeight);
            this.ctx.clip();
            // Object Fit: Cover (simplified)
            const scale = Math.max(CELL_WIDTH / img.width, imageAreaHeight / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            this.ctx.drawImage(img, x + (CELL_WIDTH - w) / 2, y, w, h);
            this.ctx.restore();
        } else {
            this.ctx.fillStyle = THEME.colors.bg;
            this.ctx.fillRect(x, y, CELL_WIDTH, imageAreaHeight);
        }

        // Character Name Area
        if (showNames) {
            const nameY = y + imageAreaHeight;
            this.ctx.fillStyle = THEME.colors.bg;
            this.ctx.fillRect(x, nameY, CELL_WIDTH, LABEL_HEIGHT);

            // Text
            this.ctx.fillStyle = THEME.colors.text;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            let fs = 28;
            this.ctx.font = `bold ${fs}px ${THEME.typography.fontFamily}`;
            const text = item.visual?.label || '';

            while (this.ctx.measureText(text).width > CELL_WIDTH * 0.9 && fs > 10) {
                fs--;
                this.ctx.font = `bold ${fs}px ${THEME.typography.fontFamily}`;
            }
            this.ctx.fillText(text, x + CELL_WIDTH / 2, nameY + LABEL_HEIGHT / 2);

            // Separator Line
            this.ctx.beginPath();
            this.ctx.moveTo(x, nameY);
            this.ctx.lineTo(x + CELL_WIDTH, nameY);
            this.ctx.stroke();
        }

        // Slot Label Area (Meta Name)
        const labelY = y + imageAreaHeight + (showNames ? LABEL_HEIGHT : 0);
        this.ctx.fillStyle = THEME.colors.bg;
        this.ctx.fillRect(x, labelY, CELL_WIDTH, LABEL_HEIGHT);

        this.ctx.fillStyle = THEME.colors.text;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        let fs = 32;
        this.ctx.font = `bold ${fs}px ${THEME.typography.fontFamily}`;
        const label = item.meta?.name || '';
        while (this.ctx.measureText(label).width > CELL_WIDTH * 0.9 && fs > 10) {
            fs--;
            this.ctx.font = `bold ${fs}px ${THEME.typography.fontFamily}`;
        }
        this.ctx.fillText(label, x + CELL_WIDTH / 2, labelY + LABEL_HEIGHT / 2);

        // Separator between Img and Label (if no name) OR Name and Label
        this.ctx.beginPath();
        const lineY = showNames ? labelY : y + imageAreaHeight;
        this.ctx.moveTo(x, lineY);
        this.ctx.lineTo(x + CELL_WIDTH, lineY);
        this.ctx.stroke();
    }

    private drawCellBorders(x: number, y: number, isLastCol: boolean, isLastRow: boolean, showNames: boolean) {
        this.ctx.lineWidth = BORDER_WIDTH; // Reset safety
        const totalHeight = CELL_HEIGHT + (showNames ? LABEL_HEIGHT : 0);

        this.ctx.beginPath();

        // Right Border (Internal Only: if not last col)
        if (!isLastCol) {
            this.ctx.moveTo(x + CELL_WIDTH, y);
            this.ctx.lineTo(x + CELL_WIDTH, y + totalHeight);
        }

        // Bottom Border (Internal Only: if not last row)
        if (!isLastRow) {
            this.ctx.moveTo(x, y + totalHeight);
            this.ctx.lineTo(x + CELL_WIDTH, y + totalHeight);
        }

        this.ctx.stroke();
    }

    private async drawFooter(qrDataUrl: string, width: number, height: number, padding: number, layout: { mode: string, height: number }, filler?: string, creator?: string) {
        const boxHeight = layout.height;
        const boxY = height - boxHeight - padding / 2;
        const boxX = padding;
        const boxWidth = width - (padding * 2);

        this.ctx.strokeStyle = '#f3f4f6';
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        // Draw Text Brand "【我推的格子】"
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = `bold 30px ${THEME.typography.fontFamily}`;

        const centerY = boxY + boxHeight / 2;
        const textX = boxX + 20;

        // Brand
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.fillText('【我推', textX, centerY);
        const w1 = this.ctx.measureText('【我推').width;
        this.ctx.fillStyle = THEME.colors.accent;
        this.ctx.fillText('的', textX + w1, centerY);
        const w2 = this.ctx.measureText('的').width;
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.fillText('格子】', textX + w1 + w2, centerY);

        // QR
        if (qrDataUrl) {
            const qrSize = 130;
            const qrImg = await this.loadImage(qrDataUrl);
            const qrX = boxX + boxWidth - qrSize - 20;
            const qrY = boxY + (boxHeight - qrSize) / 2;
            this.ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

            // "Scan Me"
            this.ctx.textAlign = 'right';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#374151';
            this.ctx.font = `bold 24px ${THEME.typography.fontFamily}`;
            this.ctx.fillText('扫码接受挑战', qrX - 20, centerY - 10);
        }

        // Draw Creator / Filler Info
        if (creator || filler) {
            this.ctx.textAlign = 'right';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = THEME.colors.text;
            this.ctx.font = `bold 30px ${THEME.typography.fontFamily}`;

            let text = '';
            if (creator && !filler) text = `制表: ${creator}`;
            else if (creator && filler) text = `制表: ${creator}  |  填表: ${filler}`;
            else text = `填表: ${filler}`;

            // Assuming horizontal fits:
            const infoX = width - padding - (qrDataUrl ? 350 : 20);
            this.ctx.fillText(text, infoX, centerY);
        }
    }

    private drawSimpleWatermark(w: number, h: number, p: number) {
        this.ctx.fillStyle = '#ccc';
        this.ctx.font = '20px sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('Generated by AnimeGrid V3', w - p, h - p / 2);
    }
}
