export interface ChangelogItem {
    tag: string;
    type: 'new' | 'opt' | 'up' | 'fix';
    content: string;
}

export interface Changelog {
    date: string;
    isOpen: boolean;
    items: ChangelogItem[];
}

export const changelogs: Changelog[] = [
    {
        date: '2025.12.15',
        isOpen: true,
        items: [
            { tag: 'NEW', type: 'new', content: '<b>我出题 你来填</b>：独创“制表”模式！制作你的专属模版，邀请好友来填坑！' },
            { tag: 'NEW', type: 'new', content: '<b>热门角色速递</b>：不知道填谁？搜索页新增热门趋势，看看最近谁最火！' },
            { tag: 'OPT', type: 'opt', content: '<b>智能排版升级</b>：窄图也能自动堆叠排版，强迫症福音。' }
        ]
    },
    {
        date: '2025.12.08',
        isOpen: false,
        items: [
            { tag: 'NEW', type: 'new', content: '<b>标签自由修改</b>：点击格子上的标签文字，即可自定义修改！' },
            { tag: 'NEW', type: 'new', content: '<b>人物/音乐搜索</b>：搜索全面升级，支持搜声优、歌手' },
            { tag: 'UP', type: 'up', content: '<b>20+ 新模版</b>：声优梗图、特摄、我的歌单、痛包展示... 等你来玩！' },
            { tag: 'FX', type: 'fix', content: '<b>视频导出修复</b>：现在视频也会正确显示你修改后的标签啦。' }
        ]
    },
    {
        date: '2025.12.07',
        isOpen: false,
        items: [
            { tag: 'NEW', type: 'new', content: '<b>全新搜索升级</b>：动漫、漫画、游戏、小说... ACG全领域一网打尽！' },
            { tag: 'NEW', type: 'new', content: '<b>2025年度模版</b>：新增年度动画/游戏专属盘点，记录你的2025。' },
            { tag: 'NEW', type: 'new', content: '<b>懒人极简模式</b>：新增 1x1 真神 / 2x2 四大天王等懒人模版。' },
            { tag: 'UP', type: 'up', content: '<b>模版大扩充</b>：新增 败犬/妹妹/RPG 等数十款趣味合集。' }
        ]
    },
    {
        date: '2025.12.06',
        isOpen: false,
        items: [
            { tag: 'NEW', type: 'new', content: '<b>视频导出功能 (Beta)</b> 上线！支持生成酷炫的动态视频。' },
            { tag: 'NEW', type: 'new', content: '支持<b>自定义上传图片命名</b>，修复长名字显示问题。' },
            { tag: 'OPT', type: 'opt', content: '优化水印样式与间距，整体视觉更协调。' }
        ]
    }
]
