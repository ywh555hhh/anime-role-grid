/**
 * 现充 / 生活向模板
 * 生活流、单推、宅属性等"过日子"维度。
 */
import type { Template } from './types';

export const LIFE_TEMPLATES: Template[] = [
    // =================================================================
    // CATEGORY: LIFE (现充/生活)
    // =================================================================
    {
        id: 'merch_itabag',
        name: '痛包/谷子 (3x3)',
        category: 'fun',
        label: '生活',
        cols: 3,
        hot: true,
        defaultTitle: '我的吃谷生涯',
        items: [
            '海景房', '烫门', '冷门',
            '梦情柄', '复数回血', '好价',
            '强娶', '吃土也要买', '这就是我老婆'
        ]
    },
    {
        id: 'pilgrimage',
        name: '圣地巡礼 (3x3)',
        category: 'fun',
        label: '生活',
        cols: 3,
        defaultTitle: '我的圣地巡礼计划',
        items: [
            '已去过(最推荐)', '已去过(最坑)', '计划中(必去)',
            '有生之年', '为了圣地去留学', '因为圣地爱上作品',
            '最想去(日本)', '最想去(国内)', '就在家门口'
        ]
    },
    {
        id: 'drama_j',
        name: '日剧/大河剧 (3x3)',
        category: 'work',
        label: '三次元',
        cols: 3,
        defaultTitle: '我的日剧追剧表',
        items: [
            '入坑神作', 'N刷不腻', '最佳漫改',
            '最佳原创', '最佳悬疑', '最佳恋爱',
            '最意难平', '烂尾之王', '催泪瓦斯'
        ]
    },
    {
        id: 'vtuber_general',
        name: 'VTuber (4x3)',
        category: 'character',
        label: '声优',
        cols: 4,
        hot: true,
        defaultTitle: '我的虚拟主播喜好',
        items: [
            '单推', 'DD头子', '最强清楚', '最强整活',
            '唱歌最好听', '玩游戏最下饭', '杂谈最有趣', '皮套最好看',
            '毕业意难平', '中之人更喜欢', '最想联动', 'Gachi恋'
        ]
    },
    // --- Label: 2026 1月新番 (Jan 2026) ---
    {
        id: 'anime_2026_jan',
        name: '2026 新番喜好 (3x5)',
        category: 'work',
        label: '动画',
        cols: 5,
        hot: true,
        defaultTitle: '我的 2026 1 月新番推荐',
        items: [
            '神作', '最佳剧情', '最佳打斗', '最佳恋爱', '最佳异世界',
            '最佳OP', '最佳ED', '最佳配乐', '最佳CP', '最佳CP',
            '最大黑马', '最逆天', '最无聊', '最过誉', '最被低估'
        ]
    },
    {
        id: 'char_2026_jan',
        name: ' 2026 角色喜好 (2x4)',
        category: 'character',
        label: '番剧角色',
        cols: 4,
        hot: true,
        defaultTitle: '2026 1月新番角色评价',
        items: [
            // Good Tags
            'MVP', '我的超人', '颜值担当', '最佳人设',
            // Bad Tags
            '逆天', '小丑', '颜值诈骗', '人设崩塌'
        ]
    },

    // --- Label: Fun / NSFW ---
    {
        id: 'cup_size',
        name: 'Cup',
        category: 'fun',
        label: '趣味',
        cols: 5,
        hot: true,
        defaultTitle: '我推的 Cup',
        items: ['A', 'B', 'C', 'D', 'E']
    },
    {
        id: 'xp_3x3',
        name: 'XP (3x3)',
        category: 'fun',
        label: '趣味',
        cols: 3,
        hot: true,
        defaultTitle: 'Bro 懂我的 XP',
        items: [
            'XP 1', 'XP 2', 'XP 3',
            'XP 4', 'XP 5', 'XP 6',
            'XP 7', 'XP 8', 'XP 9'
        ]
    },
];
