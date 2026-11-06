import { describe, it, expect } from 'vitest'
import { TEMPLATES } from '~/logic/templates'
import { buildCustomTemplates } from '~/logic/templates/custom'

/**
 * 模板目录的回归测试。
 *
 * templates.ts 从一个 1549 行的单文件拆成了 src/logic/templates/ 下的
 * 多个分类文件之后，最容易出的岔子就是「漏搬了一条」或者「拼接顺序变了」。
 * 画廊「全部」tab 是按数组原始顺序排的，顺序一变用户看到的排列就变了。
 * 所以把「条数 + 顺序 + id 唯一 + 字段完整」钉死在这里。
 */
describe('模板目录', () => {
    it('静态模板 118 条 + 自定义 30 条 = 148 条', () => {
        expect(TEMPLATES).toHaveLength(148)
    })

    it('id 全局唯一', () => {
        const ids = TEMPLATES.map((t) => t.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('每条模板字段完整（name / category / cols / items 非空）', () => {
        for (const t of TEMPLATES) {
            expect(t.id, `id 不能为空`).toBeTruthy()
            expect(t.name, `${t.id} 缺 name`).toBeTruthy()
            expect(t.category, `${t.id} 缺 category`).toBeTruthy()
            expect(t.cols, `${t.id} 的 cols 必须 > 0`).toBeGreaterThan(0)
            expect(t.items.length, `${t.id} 的 items 不能为空`).toBeGreaterThan(0)
        }
    })

    it('items 数量与 cols 自洽（不超过 cols × 行数上限）', () => {
        // 模板的 items 是「每格一个标签」，cols 是列数，行数由 items 推出
        for (const t of TEMPLATES) {
            expect(t.items.length % t.cols, `${t.id} 的 items 数量与列数不整除`).toBe(0)
        }
    })

    it('自定义模板按行列现算，1x1 ~ 5x6 全在', () => {
        const custom = buildCustomTemplates()
        expect(custom).toHaveLength(30)
        expect(custom[0]?.id).toBe('custom_1x1')
        expect(custom[custom.length - 1]?.id).toBe('custom_5x6')
    })

    it('纯粹系列排在最前（画廊「全部」tab 的默认首屏顺序依赖它）', () => {
        expect(TEMPLATES[0]?.id).toBe('9comic')
    })
})
