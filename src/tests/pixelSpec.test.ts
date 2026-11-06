import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
    BORDER_WIDTH,
    CELL_HEIGHT,
    CELL_WIDTH,
    CHALLENGE_TITLE_HEIGHT,
    IMAGE_LOAD_TIMEOUT_MS,
    LABEL_HEIGHT,
    PADDING,
    QR_WATERMARK_HEIGHT,
    TITLE_HEIGHT,
    WATERMARK_HEIGHT,
} from '~/logic/constants/pixelSpec'
import { THEME } from '~/logic/constants/theme'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = resolve(here, '..')

/**
 * 导出图规格的回归测试
 * ======================
 *
 * 主站 canvasDraw（方格）与 /hangla hanglaDraw（层级榜）是两套几何完全不同的
 * 渲染器，但产出的图必须是「同族」的 —— 同样的单元格、同样的名字条、
 * 同样的描边、同样的水印带。
 *
 * 这件事以前靠「两份文件各写一份常量 + 注释提醒对齐」来保证，
 * 注释不是编译器，迟早会漂。现在两边都从 `pixelSpec` import，
 * 再加上下面这个「源码级」守卫：谁敢再写一份本地常量，测试就红。
 */
describe('导出图物理规格', () => {
    it('单元格规格', () => {
        expect(CELL_WIDTH).toBe(300)
        expect(CELL_HEIGHT).toBeCloseTo(467.5, 5) // 300 × 187/120
        expect(LABEL_HEIGHT).toBeCloseTo(62.5, 5) // 467.5 × 25/187
        expect(BORDER_WIDTH).toBe(4)
    })

    it('比例来自 THEME（UI 端与导出图端不会各说各话）', () => {
        expect(CELL_HEIGHT).toBeCloseTo((CELL_WIDTH * 187) / 120, 5)
        expect(LABEL_HEIGHT).toBeCloseTo((CELL_HEIGHT * 25) / 187, 5)
        expect(THEME.layout.cellAspectRatio).toBeCloseTo(120 / 187, 5)
        expect(THEME.layout.labelHeightRatio).toBeCloseTo(25 / 187, 5)
    })

    it('版心规格', () => {
        expect(PADDING).toBe(60)
        expect(TITLE_HEIGHT).toBe(160)
        expect(CHALLENGE_TITLE_HEIGHT).toBe(250)
    })

    it('水印带：带二维码比窄水印带高一截', () => {
        expect(WATERMARK_HEIGHT).toBe(60)
        expect(QR_WATERMARK_HEIGHT).toBe(180)
        expect(QR_WATERMARK_HEIGHT).toBeGreaterThan(WATERMARK_HEIGHT)
    })

    it('客户端图片加载超时（第二道防线，与服务端 20s 回源超时互补）', () => {
        expect(IMAGE_LOAD_TIMEOUT_MS).toBe(25_000)
    })

    it('两个渲染器都不许自己再写一份规格常量', () => {
        const files = ['logic/canvasDraw.ts', 'logic/hanglaDraw.ts']
        const sharedNames = [
            'CELL_WIDTH',
            'CELL_HEIGHT',
            'BORDER_WIDTH',
            'LABEL_HEIGHT',
            'PADDING',
            'TITLE_HEIGHT',
            'CHALLENGE_TITLE_HEIGHT',
            'WATERMARK_HEIGHT',
            'QR_WATERMARK_HEIGHT',
            'IMAGE_LOAD_TIMEOUT_MS',
        ]

        for (const rel of files) {
            const source = readFileSync(resolve(srcRoot, rel), 'utf8')
            for (const name of sharedNames) {
                // 只看「本地 const 声明」；import 里的同名标识符是允许的
                const localDecl = new RegExp(`^\\s*const\\s+${name}\\s*=`, 'm')
                expect(
                    localDecl.test(source),
                    `${rel} 又自己声明了一份 ${name} —— 应该从 ~/logic/constants/pixelSpec import`,
                ).toBe(false)
            }
        }
    })

    it('两个渲染器都确实从 pixelSpec 取规格', () => {
        for (const rel of ['logic/canvasDraw.ts', 'logic/hanglaDraw.ts']) {
            const source = readFileSync(resolve(srcRoot, rel), 'utf8')
            expect(source, `${rel} 没有引用 pixelSpec`).toContain('constants/pixelSpec')
        }
    })
})
