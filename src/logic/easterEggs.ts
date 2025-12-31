
import type { GridItem } from '~/types'
import EASTER_EGGS_JSON from '~/logic/constants/easterEggs.json'

export interface EasterEggConfig {
    id: string
    keywords: string[]
    title: string
    message: string
    actionLabel?: string
    actionLink?: string
    priority?: number
}

// Cast JSON to Typed Array
const EASTER_EGGS: EasterEggConfig[] = EASTER_EGGS_JSON as EasterEggConfig[]

/**
 * 检查并返回匹配的彩蛋配置
 * 支持多重匹配合成
 * @param gridItems 当前格子的列表
 */
export function matchEasterEgg(gridItems: GridItem[]): EasterEggConfig | null {
    // 扁平化所有文本以便搜索
    const allText = gridItems.flatMap(item => {
        const texts = []
        if (item.label) texts.push(item.label)
        if (item.character?.name) texts.push(item.character.name)
        return texts
    }).join('').replace(/\s+/g, '').toLowerCase()

    const matches: EasterEggConfig[] = []

    for (const egg of EASTER_EGGS) {
        const hit = egg.keywords.some(k => allText.includes(k.replace(/\s+/g, '').toLowerCase()))
        if (hit) {
            matches.push(egg)
        }
    }

    if (matches.length === 0) {
        return null
    }

    if (matches.length === 1) {
        return matches[0] || null
    }

    // --- Composite Logic (Multiple Matches) ---
    // 开发者也特别特别爱看这些！
    const titles = matches.map(m => {
        if (m.id === 'mygo') return 'MyGO'
        if (m.id === 'mujica') return 'Mujica'
        if (m.id === 'gbc') return 'GBC'
        if (m.id === 'bocchi') return '孤独摇滚'
        if (m.id === 'bandori') return '邦邦'
        if (m.id === 'kaguya') return '辉夜'
        if (m.id === 'makeine') return '败犬女主'
        if (m.id === 'oshinoko') return '我推的孩子'
        if (m.id === 'oregairu') return '春物'
        if (m.id === 'mushoku') return '无职转生'
        return m.title
    })

    // De-duplicate names
    const uniqueNames = [...new Set(titles)]
    const worksStr = uniqueNames.join('、')

    return {
        id: 'composite_' + matches.map(m => m.id).join('_'),
        keywords: [],
        title: '开发者也特别特别爱看这些！',
        message: `检测到你同时喜欢 ${worksStr} ... \n哇！看来我们的口味高度一致！\n快来关注我的 B 站账号，一起交流吧！`,
        actionLabel: '关注开发者 @我推的祥子丶',
        actionLink: 'https://space.bilibili.com/36078469',
        priority: 999
    }
}
