export interface Template {
    id: string
    name: string
    cols: number
    items: string[]
    defaultTitle?: string
}

export const TEMPLATES: Template[] = [
    {
        id: 'classic',
        name: '经典 (5x3)',
        cols: 5,
        defaultTitle: '我的动漫人物喜好果然有问题',
        items: [
            '本命', '初恋', '最佳人设', '最佳性格', '最强战力',
            '最强智商', '最想结婚', '最想做朋友', '最想做家人', '最想谈恋爱',
            '意难平', '心理阴影', '一生之敌', '无法理解', '也就是脸好看',
        ]
    },
    // {
    //     id: 'romance',
    //     name: '恋爱番 (6x3)',
    //     cols: 6,
    //     items: [
    //         // Row 1
    //         '最帅男主', '最美女主', '最撩男主', '最撩女主', '最佳CP (男)', '最佳CP (女)',
    //         // Row 2
    //         '最废男主', '最茶女主', '最迟钝男主', '最迟钝女主', '最虐CP (男)', '最虐CP (女)',
    //         // Row 3
    //         '败犬男主', '败犬女主', '天降系', '青梅竹马', '最佳助攻', '也就是脸好看'
    //     ]
    // },
    // {
    //     id: 'mobile_game',
    //     name: '二游 (3x3)',
    //     cols: 3,
    //     items: [
    //         '绝对本命', '强度美', '看板娘',
    //         '剧情刀', '官方亲女儿', '查无此人',
    //         '氪金之源', '仓管', '也就是脸好看'
    //     ]
    // },
    {
        id: 'galgame',
        name: 'Galgame (4x3)',
        cols: 4,
        defaultTitle: '我的 Galgame 喜好果然有问题',
        items: [
            // Row 1: Top Tier / Special
            '永远的白月光', '无法超越的神', '最佳出轨',
            // Row 2: Character Types
            '最佳姐姐', '最佳妹妹', '最佳扶她',
            // Row 3: Story / Emotion
            '最刀', '最冷门', '最想守护',
            // Row 4: Desire / Gag
            '最想推倒', '最想被推倒', '只对脸有感'
        ]
    },
    {
        id: 'extended',
        name: '扩展 (5x6)',
        cols: 5,
        defaultTitle: '我的二次元喜好果然有问题',
        items: [
            // Row 1: 核心关系
            '本命', '初恋', '最佳人设', '最佳性格', '最强战力',
            // Row 2: 情感投射
            '最强智商', '最想结婚', '最想做朋友', '最想谈恋爱', '最想被骂',
            // Row 3: 负面/特殊
            '意难平', '心理阴影', '一生之敌', '无法理解', '也就是脸好看',
            // Row 4: 互动欲望
            '最想一起玩', '最想一起睡', '最想被踩', '最想被杀', '最想守护',
            // Row 5: 角色属性
            '最美反派', '最惨角色', '最强黑化', '最强洗白', '最强配角',
            // Row 6: 抽象/梗
            '我的精神状态', '我的XP系统', '我的嘴替', '我的脑替', '我的腿替'
        ]
    },
    {
        id: 'couple',
        name: 'CP 问卷 (4x4)',
        cols: 4,
        defaultTitle: '我的 CP 喜好果然有问题',
        items: [
            // Row 1
            '最甜 (男)', '最甜 (女)', '最虐 (男)', '最虐 (女)',
            // Row 2
            '颜值最高 (男)', '颜值最高 (女)', '性张力最强 (男)', '性张力最强 (女)',
            // Row 3
            '最互补 (男)', '最互补 (女)', '相爱相杀 (男)', '相爱相杀 (女)',
            // Row 4
            '意难平 (男)', '意难平 (女)', '最冷门 (男)', '最冷门 (女)'
        ]
    },
    {
        id: 'nsfw',
        name: '绅士问卷 (3x3)',
        cols: 3,
        defaultTitle: '我的 XP 果然有问题',
        items: [
            // Row 1
            '本子王', '最佳身材', '最佳脸蛋',
            // Row 2
            '最佳穿搭', '最肉食系', '最想包养',
            // Row 3
            '最想被踩', '最想被榨', '最想舔'
        ]
    },
    {
        id: 'nsfw_classic',
        name: '绅士问卷 (5x3)',
        cols: 5,
        defaultTitle: '我的 XP 果然有问题',
        items: [
            '本子王', '最佳身材', '纯欲天花板', '最想被调教', '最想调教',
            '最骚', '最像卖的', '最魅魔的', '最肉食系的', '最佳痴女',
            '最想被踩', '最想被榨', '最想舔', '最想X', '最想包养'
        ]
    },
    {
        id: 'oshi',
        name: '真爱 (Oshi)',
        cols: 4,
        defaultTitle: '我的 Oshi 果然有问题',
        items: [
            '入坑初心', '颜值取向', '声控福利', '智商担当',
            '美强惨', '小天使', '小恶魔', '搞笑担当',
            '想谈恋爱', '想做兄弟', '想做闺蜜', '想被包养',
            '精神状态', 'XP系统', '电子榨菜', '唯一的王',
        ]
    },
    {
        id: 'moe',
        name: '萌属性 (5x3)',
        cols: 5,
        defaultTitle: '我的萌属性喜好果然有问题',
        items: [
            // Row 1: Energy & Attitude
            '傲娇', '病娇', '元气', '三无', '慵懒',
            // Row 2: Personality Quirk
            '中二病', '毒舌', '天然呆', '腹黑', '电波',
            // Row 3: Social & Special
            '高冷', '弱气', '冒失', '地雷系', '变态'
        ]
    },
    {
        id: 'hair_color',
        name: '发色图鉴 (4x3)',
        cols: 4,
        defaultTitle: '我的发色喜好果然有问题',
        items: [
            // Row 1: Spectrum Hot
            '红毛', '黄毛', '绿毛', '蓝毛',
            // Row 2: Spectrum Cold & Special
            '紫毛', '粉毛', '金毛', '棕毛',
            // Row 3: Achromatic & Multi
            '黑毛', '白毛', '挑染', '渐变'
        ]
    },
    {
        id: 'family',
        name: '关系 (4x4)',
        cols: 4,
        defaultTitle: '我的二次元家庭果然有问题',
        items: [
            // Row 1: Parents
            '最佳老妈', '最屑老妈', '最佳老爸', '最屑老爸',
            // Row 2: Siblings - Older
            '最佳哥哥', '最屑哥哥', '最佳姐姐', '最屑姐姐',
            // Row 3: Siblings - Younger
            '最佳弟弟', '最屑弟弟', '最佳妹妹', '最屑妹妹',
            // Row 4: Romance
            '最佳恋人', '最屑恋人', '最佳前任', '最屑前任'
        ]
    },
    {
        id: 'tropes',
        name: '喜闻乐见 (5x3)',
        cols: 5,
        defaultTitle: '我的喜闻乐见果然有问题',
        items: [
            // Row 1: The Classics
            '败犬', '青梅竹马', '天降系', '欢喜冤家', '命中注定',
            // Row 2: The Story
            '久别重逢', '萍水相逢', '一见钟情', '契约关系', '师徒',
            // Row 3: The Spicy/Complicated
            '一夜情', '倒贴', '替身', '禁断', '相爱相杀'
        ]
    },
    {
        id: 'opinions',
        name: '主观锐评 (4x2)',
        cols: 4,
        defaultTitle: '我的主观锐评果然有问题',
        items: [
            // Row 1: 男角色 (Male)
            '最过誉 (男)', '最被低估 (男)', 'Get不到 (男)', '惨遭尬黑 (男)',
            // Row 2: 女角色 (Female)
            '最过誉 (女)', '最被低估 (女)', 'Get不到 (女)', '惨遭尬黑 (女)'
        ]
    },
    {
        id: 'similarity_2x2',
        name: '简直就是 (2x2)',
        cols: 2,
        defaultTitle: '我们简直一模一样',
        items: [
            '本体', '本体',
            '代餐', '代餐'
        ]
    }
]
