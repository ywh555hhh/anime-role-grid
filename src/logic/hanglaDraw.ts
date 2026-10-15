/**
 * /hangla 的导出渲染器
 * ====================
 *
 * ## 为什么单开一个文件而不是复用 canvasDraw.ts
 * `canvasDraw.ts` 是围绕主站的「N 列方格 + 模板标签」几何写的，而 tier list 是
 * 「每层一行、物品在行内换行」的另一种几何。硬塞进去会让两边都难维护。
 *
 * ## 但「像素级统一」是硬要求
 * 下面的常量**逐字对齐主站 `canvasDraw.ts`**，保证两个工具产出的图片是同族的：
 *   单元 300×467.5（2:3，正好是 Bangumi 图原始比例）· 名字条 62.5 · 描边 4
 *   内边距 60 · 标题区 160 · 水印区 180 · 字体 Noto Serif SC · 同一套 logo + 二维码
 * 唯一新增的是**层级标签列**（tier list 特有，主站没有）。
 *
 * ## 渲染细节也对齐
 * 图片按「cover + 顶部对齐」绘制（与主站 drawCellContent 的 scale/偏移算法一致），
 * 所以同一个角色在主站九宫格和 /hangla 榜里的裁切方式是一样的。
 */
import QRCode from "qrcode";
import { THEME } from "~/logic/constants/theme";
import { bgmThumb, proxyImage } from "~/logic/imageUrl";
import { waitForFonts } from "~/logic/fontReady";

// ---------------------------------------------------------------- 与主站一致的像素规格

/** 单元格宽度（主站 canvasDraw.ts 同值） */
const CELL_WIDTH = 300;
/** 单元格高度：由 THEME 的 120/187 长宽比算出 = 467.5 */
const CELL_HEIGHT = CELL_WIDTH / THEME.layout.cellAspectRatio;
/** 名字条高度：467.5 × 25/187 = 62.5 */
const LABEL_HEIGHT = CELL_HEIGHT * THEME.layout.labelHeightRatio;
/** 描边宽度 */
const BORDER_WIDTH = 4;
/** 画布内边距 */
const PADDING = 60;
/** 标题区高度（等同主站 standard 的 160） */
const TITLE_HEIGHT = 160;
/** 底部水印区高度（等同主站带二维码的 180） */
const WATERMARK_HEIGHT = 180;

// ---------------------------------------------------------------- /hangla 特有

/** 层级标签列宽度：刻意等于一格宽，让「一列 = 一格」这件事在版面上自明 */
const TIER_LABEL_WIDTH = CELL_WIDTH;
/** 标题下的副标题行高度 */
const SUBTITLE_HEIGHT = 60;
/** 副标题与主体之间的留白 —— 贴太紧会显得挤（用户反馈） */
const GAP_BEFORE_GRID = 48;
/** 排表人行高度（没填就不占） */
const AUTHOR_HEIGHT = 50;
/** 每行放几个物品：与主站默认 5 列一致 */
export const ITEMS_PER_LINE = 5;
/** 导出时的取图宽度：单元 300px，取 /r/400/ 保证不被放大（canvas 是 1:1 像素） */
const EXPORT_IMAGE_WIDTH = 400;
/** 单张图的客户端加载超时：与主站一样，避免某张图把整次导出挂死 */
const IMAGE_LOAD_TIMEOUT_MS = 25_000;

// ---------------------------------------------------------------- 类型

export interface DrawItem {
    /** 真正唯一的键：Bangumi 的角色 id 与作品 id 是两个独立空间，数值会撞 */
    uid: string;
    id: number;
    name: string;
    image: string;
}

export interface DrawTier {
    name: string;
    color: string;
    items: DrawItem[];
}

export interface HanglaDrawOptions {
    tiers: DrawTier[];
    /** 榜单标题（用户可自行修改） */
    title: string;
    /** 排表人；留空则不占高度也不画 */
    author?: string;
    /** 是否在每格下方显示物品名（PRD 把「物品名显隐」列为可配置项） */
    showNames?: boolean;
    /** 是否画二维码（用户可以关掉） */
    showQr?: boolean;
    /** 二维码指向；不传则不画二维码区域 */
    qrUrl?: string;
}

// ---------------------------------------------------------------- 图片加载

const PLACEHOLDER_GIF =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function placeholder(): HTMLImageElement {
    const img = new Image();
    img.src = PLACEHOLDER_GIF;
    return img;
}

/**
 * 加载一张图。任何失败（超时/解码失败/上游挂了）都降级成占位图，
 * 保证导出永远有确定结局 —— 与主站 canvasDraw.loadImage 同样的策略。
 */
function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
        if (!url) return resolve(placeholder());

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.referrerPolicy = "no-referrer";

        const timer = window.setTimeout(() => {
            console.warn(`[hangla] 图片加载超时，降级为占位图: ${url}`);
            resolve(placeholder());
        }, IMAGE_LOAD_TIMEOUT_MS);

        img.onload = async () => {
            window.clearTimeout(timer);
            try {
                await img.decode();
                if (!img.naturalWidth || !img.naturalHeight)
                    throw new Error("0 尺寸");
                resolve(img);
            } catch (e) {
                console.warn("[hangla] 图片解码失败，降级为占位图", e);
                resolve(placeholder());
            }
        };
        img.onerror = () => {
            window.clearTimeout(timer);
            console.warn(`[hangla] 图片加载失败，降级为占位图: ${url}`);
            resolve(placeholder());
        };

        img.src = url;
    });
}

// ---------------------------------------------------------------- 绘制辅助

/** 文字过长时逐级缩小字号，直到塞进 maxWidth（与主站 drawTitle 同法） */
function fitText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    startSize: number,
    minSize = 14,
): number {
    let size = startSize;
    ctx.font = `bold ${size}px ${THEME.typography.fontFamily}`;
    while (ctx.measureText(text).width > maxWidth && size > minSize) {
        size -= 2;
        ctx.font = `bold ${size}px ${THEME.typography.fontFamily}`;
    }
    return size;
}

/** 按「cover + 顶部对齐」把图画进指定区域（与主站 drawCellContent 的算法一致） */
function drawCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
): void {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y, dw, dh);
}

// ---------------------------------------------------------------- 主入口

/**
 * 渲染一张 /hangla 榜，返回 PNG 的 dataURL。
 *
 * 尺寸完全由内容决定：宽度 = 层级标签列 + 5 格 + 两侧内边距；
 * 高度 = 标题区 + 各层级行（按物品数换行）+ 水印区 + 内边距。
 */
export async function drawHanglaBoard(
    options: HanglaDrawOptions,
): Promise<string> {
    const {
        tiers,
        title,
        author,
        showNames = true,
        showQr = true,
        qrUrl,
    } = options;

    // 按「真正要画的文字」补齐字体子集。
    //
    // 不能只等 fonts.ready：Google Fonts 把 Noto Serif SC 按 unicode-range 切成上百个子集，
    // 只下载 DOM 真的用到的那几个。而层级色块、副标题在 DOM 里用的是系统字体，
    // 从没触发过 Noto 的下载 —— 导出时那些字就逐字回退成别的字体，
    // 成品里个别字（实测是层级名「夯」）会明显和周围不一样。
    const drawnText = [
        title,
        "从夯到拉的排序头脑战",
        author?.trim() ? `排表人：${author.trim()}` : "",
        tiers.map((t) => t.name).join(""),
        tiers.flatMap((t) => t.items.map((i) => i.name)).join(""),
        "oshigrid.me/hangla【我推的格子】",
    ].join("");
    // 子集只看「字体族 + 字重 + 字符」，与字号无关，所以合并成一次调用就够
    await waitForFonts([{ font: `bold 44px ${THEME.typography.fontFamily}`, text: drawnText }]);

    const cellTotalHeight = CELL_HEIGHT + (showNames ? LABEL_HEIGHT : 0);

    // 列数按「最宽那一层」定：最宽的层只有 3 个就是 3 列，右边不留死白。
    // 上限仍是 ITEMS_PER_LINE（与主站 5 列一致）。
    const widestTier = tiers.reduce((m, t) => Math.max(m, t.items.length), 1);
    const columns = Math.min(ITEMS_PER_LINE, widestTier);

    /**
     * 每层占几行（层内超过 columns 就换行）。
     * 注意：**空层也保留**，占 1 行高 + 一个色块标签 —— tier list 的骨架不能少。
     */
    const linesOf = (t: DrawTier) =>
        Math.max(1, Math.ceil(t.items.length / columns));

    const gridWidth = TIER_LABEL_WIDTH + columns * CELL_WIDTH;
    const canvasWidth = gridWidth + PADDING * 2;
    const authorText = author?.trim() ?? "";
    const titleBlockHeight =
        TITLE_HEIGHT +
        SUBTITLE_HEIGHT +
        (authorText ? AUTHOR_HEIGHT : 0) +
        GAP_BEFORE_GRID;
    const gridHeight = tiers.reduce(
        (sum, t) => sum + linesOf(t) * cellTotalHeight,
        0,
    );
    // 用户可以关掉二维码；关掉后底部只留一条窄水印
    const watermarkHeight = qrUrl && showQr ? WATERMARK_HEIGHT : 60;
    const canvasHeight =
        titleBlockHeight + gridHeight + watermarkHeight + PADDING;

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法获取 canvas 2d 上下文");

    // ---- 背景（与主站一致：白底） ----
    ctx.fillStyle = THEME.colors.bg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // ---- 标题 ----
    ctx.fillStyle = THEME.colors.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(ctx, title, canvasWidth - PADDING * 2, 60, 24);
    ctx.fillText(title, canvasWidth / 2, TITLE_HEIGHT / 2);

    ctx.fillStyle = THEME.colors.accent;
    ctx.font = `bold 32px ${THEME.typography.fontFamily}`;
    ctx.fillText(
        "从夯到拉的排序头脑战",
        canvasWidth / 2,
        TITLE_HEIGHT + SUBTITLE_HEIGHT / 2,
    );

    // ---- 排表人（可选，留空则不占高度）----
    if (authorText) {
        ctx.fillStyle = THEME.colors.watermark;
        ctx.font = `bold 30px ${THEME.typography.fontFamily}`;
        ctx.fillText(
            `排表人：${authorText}`,
            canvasWidth / 2,
            TITLE_HEIGHT + SUBTITLE_HEIGHT + AUTHOR_HEIGHT / 2,
        );
    }

    // ---- 逐层绘制 ----
    const gridTop = titleBlockHeight;
    const gridLeft = PADDING;
    const itemsLeft = gridLeft + TIER_LABEL_WIDTH;

    // 先把所有图并发载入（与主站一样，失败降级为占位图）
    const allItems = tiers.flatMap((t) => t.items);
    const images = await Promise.all(
        allItems.map((it) =>
            loadImage(proxyImage(bgmThumb(it.image, EXPORT_IMAGE_WIDTH))),
        ),
    );
    // 按**对象身份**索引图片，而不是按 id / uid。
    // 按 id 会在角色/作品 id 碰撞时串图；按 uid 则依赖调用方一定传对。
    // allItems 与各层的 items 是同一批对象引用，用身份做 key 天然唯一。
    const imageByItem = new Map<DrawItem, HTMLImageElement>();
    allItems.forEach((it, i) => {
        const img = images[i];
        if (img) imageByItem.set(it, img);
    });

    let rowTop = gridTop;
    for (const tier of tiers) {
        const lines = linesOf(tier);
        const tierHeight = lines * cellTotalHeight;

        // ---- 层级标签块：整块填色 + 描边（空层也照常画，骨架要在）----
        ctx.fillStyle = tier.color;
        ctx.fillRect(gridLeft, rowTop, TIER_LABEL_WIDTH, tierHeight);
        ctx.lineWidth = BORDER_WIDTH;
        ctx.strokeStyle = THEME.colors.border;
        ctx.strokeRect(gridLeft, rowTop, TIER_LABEL_WIDTH, tierHeight);

        // 名称居中（长名自动缩字号，并裁在色块内）
        ctx.save();
        ctx.beginPath();
        ctx.rect(gridLeft + 12, rowTop, TIER_LABEL_WIDTH - 24, tierHeight);
        ctx.clip();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        fitText(
            ctx,
            tier.name,
            TIER_LABEL_WIDTH - 32,
            Math.min(44, tierHeight / 2),
            16,
        );
        ctx.fillText(
            tier.name,
            gridLeft + TIER_LABEL_WIDTH / 2,
            rowTop + tierHeight / 2,
        );
        ctx.restore();

        // ---- 逐格绘制：只画「真的有物品」的格子 ----
        // 空位不画任何东西。没填的区域保持完全空白，这是刻意的 ——
        // 用户反馈：填 3 个却给剩下 2 个空位也补上框线，看着很不舒服。
        // 每格 = 一个完整外框 + 图片与名字之间那条分割线（主站 drawCellBorders 的 nameY）。
        for (let i = 0; i < tier.items.length; i++) {
            const item = tier.items[i];
            if (!item) continue;
            const line = Math.floor(i / columns);
            const col = i % columns;
            const x = itemsLeft + col * CELL_WIDTH;
            const y = rowTop + line * cellTotalHeight;

            // 图片区域：cover + 顶部对齐，并裁剪到单元格内
            const img = imageByItem.get(item);
            if (img) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y, CELL_WIDTH, CELL_HEIGHT);
                ctx.clip();
                drawCover(ctx, img, x, y, CELL_WIDTH, CELL_HEIGHT);
                ctx.restore();
            }

            // 名字条
            if (showNames) {
                ctx.fillStyle = THEME.colors.bg;
                ctx.fillRect(x, y + CELL_HEIGHT, CELL_WIDTH, LABEL_HEIGHT);
                ctx.fillStyle = THEME.colors.text;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                fitText(ctx, item.name, CELL_WIDTH - 16, 28, 12);
                ctx.fillText(
                    item.name,
                    x + CELL_WIDTH / 2,
                    y + CELL_HEIGHT + LABEL_HEIGHT / 2,
                );
            }

            // 这一格的外框
            ctx.lineWidth = BORDER_WIDTH;
            ctx.strokeStyle = THEME.colors.border;
            ctx.strokeRect(x, y, CELL_WIDTH, cellTotalHeight);

            // 图片与名字之间的分割线（之前缺的就是这条）
            if (showNames) {
                ctx.beginPath();
                ctx.moveTo(x, y + CELL_HEIGHT);
                ctx.lineTo(x + CELL_WIDTH, y + CELL_HEIGHT);
                ctx.stroke();
            }
        }

        rowTop += tierHeight;
    }

    // ---- 整块外框：最上 / 最左 / 最右 / 最下都要有（用户明确要求）----
    // 内部空位不画线，所以这四条边是「表格边界」的唯一来源。
    ctx.lineWidth = BORDER_WIDTH;
    ctx.strokeStyle = THEME.colors.border;
    ctx.strokeRect(gridLeft, gridTop, gridWidth, gridHeight);

    // ---- 水印：与主站同构（logo + 【我推的格子】 + 二维码） ----
    await drawWatermark(
        ctx,
        canvasWidth,
        canvasHeight,
        qrUrl && showQr ? qrUrl : undefined,
    );

    return canvas.toDataURL("image/png");
}

/** 底部水印，布局与主站 canvasDraw.drawWatermark 一致，保证品牌呈现同族 */
async function drawWatermark(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    qrUrl?: string,
): Promise<void> {
    // 水印带：与主站一样以 height - PADDING/2 为基准横行居中
    const y = height - PADDING / 2;
    ctx.save();
    ctx.textBaseline = "middle";

    // ---- 左下角：二维码 + 网址，两者并排（不是上下堆叠）----
    let cursorX = PADDING;
    // 网址默认跟品牌行对齐；有二维码时改成与二维码垂直居中
    let urlY = y;
    if (qrUrl) {
        try {
            const qrDataUrl = await QRCode.toDataURL(qrUrl, {
                margin: 1,
                width: 260,
            });
            const qr = await loadImage(qrDataUrl);
            const qrSize = 120;
            // 锚到水印带（同主站 getStandardFooterLayout 的思路），
            // 不能锚在 height - PADDING/2 上 —— 那样下沿会超出画布被裁掉
            const qrY =
                height - WATERMARK_HEIGHT + (WATERMARK_HEIGHT - qrSize) / 2;
            ctx.drawImage(qr, cursorX, qrY, qrSize, qrSize);
            cursorX += qrSize + 18;
            urlY = qrY + qrSize / 2;
        } catch (e) {
            console.warn("[hangla] 二维码生成失败，跳过", e);
        }
    }
    ctx.textAlign = "left";
    ctx.font = `bold 30px ${THEME.typography.fontFamily}`;
    ctx.fillStyle = THEME.colors.watermark;
    ctx.fillText("oshigrid.me/hangla", cursorX, urlY);

    // ---- 右下角：logo + 【我推的格子】----
    ctx.textAlign = "right";
    const part1 = "【我推";
    const part2 = "的";
    const part3 = "格子】";
    const w2 = ctx.measureText(part2).width;
    const w3 = ctx.measureText(part3).width;
    const x = width - PADDING;

    try {
        const logo = await loadImage("/logo.png");
        const logoSize = 40;
        ctx.drawImage(logo, x - logoSize, y - logoSize / 2, logoSize, logoSize);
        const textEndX = x - logoSize - 10;

        ctx.fillStyle = THEME.colors.watermark;
        ctx.fillText(part3, textEndX, y);
        ctx.fillStyle = THEME.colors.accent;
        ctx.fillText(part2, textEndX - w3, y);
        ctx.fillStyle = THEME.colors.watermark;
        ctx.fillText(part1, textEndX - w3 - w2, y);
    } catch {
        ctx.fillStyle = THEME.colors.watermark;
        ctx.fillText("【我推的格子】", x, y);
    }

    ctx.restore();
}
