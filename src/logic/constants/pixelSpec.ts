/**
 * 导出图的物理规格 —— 唯一真相
 * ==============================
 *
 * ## 为什么要有这个文件
 * 主站 `canvasDraw.ts`（N 列方格）和 /hangla `hanglaDraw.ts`（每层一行）
 * 是两套几何完全不同的渲染器，但它们产出的图**必须是同族的**：
 * 同样的单元格尺寸、同样的名字条高度、同样的描边、同样的内边距、
 * 同样的水印带高度 —— 用户看不出这是「另一个工具」做的图。
 *
 * 以前这件事靠「两份文件里各写一份常量 + 注释提醒要对齐」来保证。
 * 注释不是编译器，所以迟早会漂。
 *
 * 现在改成：**两个渲染器都从这里 import**，物理上就不可能不一致。
 * 想改单元格尺寸？改这一个文件，两边同时生效。
 *
 * ## 数值来源
 * 比例全部来自 `THEME.layout`（Bangumi 图原始比例 120/187、名字条 25/187），
 * 所以 UI 端与导出图端的规格也不会各说各话。
 */
import { THEME } from './theme';

/**
 * 单元格宽度（px）。
 *
 * 保持 300 是为了导出高清图：最终图是 2k+ 分辨率，
 * 一格 300px 在 5 列时画布就有 1620px 宽。
 */
export const CELL_WIDTH = 300;

/** 单元格高度 = 300 × 187/120 = 467.5 */
export const CELL_HEIGHT = CELL_WIDTH / THEME.layout.cellAspectRatio;

/** 名字条高度 = 467.5 × 25/187 = 62.5 */
export const LABEL_HEIGHT = CELL_HEIGHT * THEME.layout.labelHeightRatio;

/** 格子描边宽度 */
export const BORDER_WIDTH = 4;

/** 画布四周内边距 */
export const PADDING = 60;

/** 标题区高度（标准导出） */
export const TITLE_HEIGHT = 160;

/** 标题区高度（挑战版导出，主站用） */
export const CHALLENGE_TITLE_HEIGHT = 250;

/**
 * 底部水印带高度（不带二维码的窄条）。
 *
 * 带二维码的水印带见 `QR_WATERMARK_HEIGHT`。
 */
export const WATERMARK_HEIGHT = 60;

/**
 * 底部水印带高度（带二维码）。
 *
 * 二维码是 130px 见方 + 上下留白，所以比窄水印带高得多。
 */
export const QR_WATERMARK_HEIGHT = 180;

/**
 * 单张图片的客户端加载超时（毫秒）。
 *
 * 第二道防线：服务端 `/api/img` 已有 20s 回源超时，但这里再兜一次，
 * 保证即使代理或网络完全不响应，导出也会有确定结局（该格降级为空占位图），
 * 而不会让整张图永远卡在某一格上。
 */
export const IMAGE_LOAD_TIMEOUT_MS = 25_000;
