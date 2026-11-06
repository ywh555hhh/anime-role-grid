/**
 * 2025 年新增模板
 * 2025 Edition 系列（年度动画 / 年度游戏等）。
 */
import type { Template } from './types';

export const NEW_2025_TEMPLATES: Template[] = [
    // =================================================================
    // NEW TEMPLATES (2025 Added)
    // =================================================================

    // --- Work: Movie/Donghua/Yuri/BL/Ghibli ---
    {
        id: 'anime_movie',
        name: '动画电影/剧场版 (4x3)',
        category: 'work',
        label: '动画',
        cols: 4,
        items: [
            '入坑神作', '画质天花板', '剧情天花板', '最催泪',
            '最震撼', '欠一张电影票', '最佳配乐', '二刷三刷',
            '带着对象看', '一个人看哭', '童年回忆', '只看脸'
        ]
    },
    {
        id: 'donghua',
        name: '国漫/国产动画 (4x3)',
        category: 'work',
        label: '动画',
        cols: 4,
        items: [
            '国漫之光', '最佳3D', '最佳2D', '最佳剧情',
            '最强IP', '有生之年', '最佳配音', '最佳动作',
            '文化输出', '魔改/烂尾', '小说改', '漫画改'
        ]
    },
    {
        id: 'yuri',
        name: '百合作品 (3x3)',
        category: 'work',
        label: '动画',
        cols: 3,
        items: [
            '橘里橘气', '硬核百合', '轻百合',
            '最甜', '最虐', '最扭曲',
            '我要我觉得', '官方发糖', '脑补'
        ]
    },
    {
        id: 'bl',
        name: '耽美/BL作品 (3x3)',
        category: 'work',
        label: '动画',
        cols: 3,
        items: [
            '清水', '肉香', '剧情向',
            '最甜', '最虐', '意难平',
            '从头叫到尾', '画风如画', '声优不要钱'
        ]
    },
    {
        id: 'ghibli',
        name: '吉卜力/宫崎骏 (3x3)',
        category: 'work',
        label: '动画',
        cols: 3,
        items: [
            '童年最爱', '画面最美', '音乐最神',
            '最爱男主', '最爱女主', '最爱生物',
            '美食诱惑', '反战/环保', '看不懂'
        ]
    },

    // --- Character: Villains/Non-human/Fate/Touhou ---
    {
        id: 'villains',
        name: '反派角色 (4x3)',
        category: 'character',
        label: '番剧角色',
        cols: 4,
        items: [
            '魅力反派', '纯粹的恶', '悲情反派', '洗白弱三分',
            '颜值即正义', '智商碾压', '最终BOSS', '二五仔',
            '比主角还帅', '死得其所', '也是苦命人', '除了坏没毛病'
        ]
    },
    {
        id: 'non_human',
        name: '人外/异形 (3x3)',
        category: 'character',
        label: '番剧角色',
        cols: 3,
        items: [
            '最想rua', '最帅人外', '最美人外',
            '掉SAN值', '超越种族', '机械/机娘',
            '兽人/Furry', '魔物娘', '不可名状'
        ]
    },
    {
        id: 'magical_creatures',
        name: '吉祥物/神兽 (3x3)',
        category: 'character',
        label: '番剧角色',
        cols: 3,
        items: [
            '淫兽', '卖萌担当', '这也算生物',
            '想养一只', '战斗力爆表', '智商担当',
            '周边狂魔', '声音好听', '其实是本体'
        ]
    },
    {
        id: 'fate_chars',
        name: 'Fate系列 (4x3)',
        category: 'character',
        label: '番剧角色',
        cols: 4,
        items: [
            '最强Saber', '最强Archer', '最强Lancer', '最强Rider',
            '最强Caster', '最强Assassin', '最强Berserker', '最强Extra',
            '最爱御主', '最惨御主', '最想召唤', '老公/老婆'
        ]
    },
    {
        id: 'touhou_chars',
        name: '东方Project (4x3)',
        category: 'character',
        label: '番剧角色',
        cols: 4,
        items: [
            '本命', '二命', '音乐最神', '符卡最难',
            '二创最多', '本子最多', '最想去幻想乡', '最想被退治',
            '红魔馆', '永远亭', '地灵殿', '守矢神社'
        ]
    },

    // --- Game: Souls/FPS/Rhythm/Otome/Pokemon ---
    {
        id: 'soulslike',
        name: '魂类/受苦 (3x3)',
        category: 'work',
        label: '游戏',
        cols: 3,
        items: [
            '受苦开始', '摔手柄', '也是过了',
            '最强BOSS', '最像BOSS的小怪', '地图恶意',
            '剧情碎片', '老婆', '赞美太阳'
        ]
    },
    {
        id: 'fps_moba',
        name: '竞技游戏 (4x3)',
        category: 'work',
        label: '游戏',
        cols: 4,
        items: [
            '本命英雄/枪', '绝活', '只会这个', '版本陷阱',
            '最强段位', '最坑队友', '最强对手', '带我躺赢',
            '祖安语录', '皮肤花最多', '退坑又回坑', '电子竞技没有爱情'
        ]
    },
    {
        id: 'rhythm',
        name: '音游 (3x3)',
        category: 'work',
        label: '游戏',
        cols: 3,
        items: [
            '拇指党', '食指党', '多指党',
            'AP/FC', '手残', '读谱困难',
            '为了听歌', '为了抽卡', '为了Rank'
        ]
    },
    {
        id: 'otome',
        name: '乙女游戏 (3x3)',
        category: 'work',
        label: '游戏',
        cols: 3,
        items: [
            '本命', '最想攻略', '最难攻略',
            '剧本最神', '画风最神', '声优不要钱',
            '我的钱包', '肝败吓疯', '又是BadEnd'
        ]
    },
    {
        id: 'pokemon_team',
        name: '我的宝可梦队伍 (6x1)',
        category: 'character',
        label: '游戏',
        cols: 6,
        items: [
            '位置1', '位置2', '位置3', '位置4', '位置5', '位置6'
        ]
    },

    // --- Fun: Vtuber/Cosplay/Conventions/Roommates ---
    {
        id: 'vtuber',
        name: '虚拟主播 (4x3)',
        category: 'fun',
        label: '生活',
        cols: 4,
        items: [
            '单推', 'DD头子', '清楚担当', '整活担当',
            '歌势', '游戏势', '杂谈势', '画画势',
            '中之人', '皮套', '毕业', '切片'
        ]
    },
    {
        id: 'cosplay',
        name: 'Cosplay (3x3)',
        category: 'fun',
        label: '生活',
        cols: 3,
        items: [
            '出过最满意', '最想出', '黑历史',
            '假发地狱', '道具地狱', '妆娘/摄影',
            '最还原', '最OOC', '为了爱'
        ]
    },
    {
        id: 'conventions',
        name: '漫展回忆 (3x3)',
        category: 'fun',
        label: '生活',
        cols: 3,
        items: [
            '去过最远', '排队最久', '花钱最多',
            '面基对象', '集邮成就', '社死瞬间',
            '最想要签名', '最想要合影', '下次还去'
        ]
    },
    {
        id: 'roommates',
        name: '二次元室友 (3x3)',
        category: 'relation',
        label: '生活',
        cols: 3,
        items: [
            '负责做饭', '负责打扫', '负责赚钱',
            '一起打游戏', '一起看番', '一起发疯',
            '吐槽役', '能打的', '吉祥物'
        ]
    },
    {
        id: 'nsfw_situations',
        name: '喜好场景(R18) (3x3)',
        category: 'nsfw',
        label: '绅士',
        cols: 3,
        items: [
            '纯爱战神', '牛头人', '恶堕',
            '调教', '露出', '多人运动',
            '异种', '触手', '性转'
        ]
    },
];
