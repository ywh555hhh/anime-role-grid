
import type { GridItem } from '~/types'

export interface EasterEggConfig {
    id: string
    keywords: string[] // 匹配 keywords (包括 label 和 character name)
    title: string
    message: string
    actionLabel?: string
    actionLink?: string
    priority?: number // 在彩蛋内部的优先级
}

// --- Configuration ---
// 这是一个配置表，未来可以无限扩展
const EASTER_EGGS: EasterEggConfig[] = [
    {
        id: 'mygo',
        keywords: [
            'MyGO', 'mygo',
            '高松灯', '高松燈', '高松Tomori',
            '千早爱音', '千早愛音',
            '长崎素世', '長崎素世',
            '椎名立希',
            '要乐奈', '要樂奈',
            '丰川祥子', '豊川祥子',
            '若叶睦', '若葉睦',
            '初华', '初華', '三角初华', '三角初華',
            '喵梦', '八幡海铃', '八幡海鈴', '海铃', '海鈴'
        ],
        title: '原来你也看 MyGO!!!!!',
        message: '“迷茫也没关系，迷路也没关系，只要能前进的话……” \n看来我们有着共同的音乐品味！如果有兴趣，欢迎关注我的 B 站账号，一起交流 MyGO 心得！',
        actionLabel: '前往关注 (Ave Mujica 待机中)',
        actionLink: 'https://space.bilibili.com/36078469'
    },
    {
        id: 'mujica',
        keywords: [
            'Ave Mujica', 'Mujica',
            '丰川祥子', '豊川祥子',
            '若叶睦', '若葉睦',
            '初华', '初華', '三角初华', '三角初華',
            '喵梦',
            '八幡海铃', '八幡海鈴', '海铃', '海鈴'
        ],
        title: '欢迎来到 Ave Mujica 的世界',
        message: '“在这个扭曲的世界里，让我们一起共舞吧。” \n你也期待着她们的出道吗？关注我，获取最新相关动态！',
        actionLabel: '关注开发者',
        actionLink: 'https://space.bilibili.com/36078469'
    },
    // Future eggs...
]

/**
 * 检查并返回匹配的彩蛋配置
 * @param gridItems 当前格子的列表
 */
export function matchEasterEgg(gridItems: GridItem[]): EasterEggConfig | null {
    // 扁平化所有文本以便搜索
    const allText = gridItems.flatMap(item => {
        const texts = []
        if (item.label) texts.push(item.label)
        if (item.character?.name) texts.push(item.character.name)
        // Check for specific subject/anime names if available in future
        return texts
    }).join('').replace(/\s+/g, '').toLowerCase() // Join tight and remove all spaces

    console.log('[EasterEgg] Scanning text:', allText)

    // 查找第一个匹配的彩蛋
    // 逻辑：只要有一个 keyword 命中即可
    for (const egg of EASTER_EGGS) {
        // Keywords should also be space-normalized if needed, but assuming config is clean
        const hit = egg.keywords.some(k => allText.includes(k.replace(/\s+/g, '').toLowerCase()))
        if (hit) {
            return egg
        }
    }

    return null
}
