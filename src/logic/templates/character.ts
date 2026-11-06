/**
 * 角色类模板
 * 角色 + 角色特攻（含属性、关系投射等）。
 */
import type { Template } from './types';

export const CHARACTER_TEMPLATES: Template[] = [
    // =================================================================
    // CATEGORY: CHARACTER (角色)
    // =================================================================

    // --- Label: 基础 (Basic) ---
    {
        id: 'classic',
        name: '经典 (5x3)',
        category: 'character',
        label: '基础',
        cols: 5,
        defaultTitle: '我的动漫人物喜好果然有问题',
        hot: true,
        items: [
            '本命', '初恋', '最佳人设', '最佳性格', '最强战力',
            '最强智商', '最想结婚', '最想做朋友', '最想做家人', '最想谈恋爱',
            '意难平', '心理阴影', '一生之敌', '无法理解', '也就是脸好看',
        ]
    },
    {
        id: 'extended',
        name: '扩展 (5x6)',
        category: 'character',
        label: '基础',
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

    // --- Label: 极简 (Minimalist) ---
    {
        id: 'char_1x1',
        name: '唯一真神 (1x1)',
        category: 'character',
        label: '极简',
        cols: 1,
        hot: true,
        defaultTitle: '我的唯一真神',
        items: ['My GOAT']
    },
    {
        id: 'char_cp_1x2',
        name: '最佳CP/双壁 (1x2)',
        category: 'character',
        label: '极简',
        cols: 2,
        defaultTitle: '我的最佳CP',
        items: ['左位 (L)', '右位 (R)']
    },
    {
        id: 'char_2x2',
        name: '四大天王 (2x2)',
        category: 'character',
        label: '极简',
        cols: 2,
        hot: true,
        defaultTitle: '我的四大天王',
        items: ['No.1', 'No.2', 'No.3', 'No.4']
    },
    {
        id: 'char_top3',
        name: 'Top 3 (3x1)',
        category: 'character',
        label: '极简',
        cols: 3,
        items: ['Top.1', 'Top.2', 'Top.3']
    },

    // --- Label: 属性 (Attribute) ---
    {
        id: 'oshi',
        name: '真爱/Oshi (4x4)',
        category: 'character',
        label: '属性',
        cols: 4,
        hot: true,
        defaultTitle: '我的 Oshi 果然有问题',
        items: [
            '入坑初心', '颜值取向', '声控福利', '智商担当',
            '美强惨', '小天使', '小恶魔', '搞笑担当',
            '想谈恋爱', '想做兄弟', '想做闺蜜', '想被包养',
            '精神状态', 'XP系统', '电子榨菜', '唯一的王',
        ]
    },
    {
        id: 'losing_heroines',
        name: '败犬大合集 (4x3)',
        category: 'character',
        label: '属性',
        cols: 4,
        hot: true,
        defaultTitle: '我的败犬喜好果然有问题',
        items: [
            '金毛败犬', '幼驯染败犬', '天降败犬', '尽力了',
            '没进线', '届不到', '也就是脸好看', '败犬光环',
            '败犬女主', '败犬男主', '赢了当输', '输了当赢'
        ]
    },
    {
        id: 'sisters_imouto',
        name: '妹妹大合集 (4x3)',
        category: 'character',
        label: '属性',
        cols: 4,
        hot: true,
        defaultTitle: '我的妹妹属性喜好果然有问题',
        items: [
            '实妹', '义妹', '继妹', '干妹',
            '邻家妹妹', '腹黑妹妹', '傲娇妹妹', '兄控妹妹',
            '能干的妹妹', '废柴妹妹', '想要这样的妹妹', '这种妹妹才不要'
        ]
    },
    {
        id: 'sisters_oneesan',
        name: '姐姐大合集 (4x3)',
        category: 'character',
        label: '属性',
        cols: 4,
        defaultTitle: '我的姐姐属性喜好果然有问题',
        items: [
            '实姐', '义姐', '邻家大姐姐', '魅魔姐姐',
            '靠谱姐姐', '废柴姐姐', '弟控姐姐', '严厉姐姐',
            '温柔姐姐', '想要这样的姐姐', '这种姐姐才不要', '合法萝莉姐姐'
        ]
    },
    {
        id: 'moe',
        name: '萌属性 (5x3)',
        category: 'character',
        label: '属性',
        cols: 5,
        defaultTitle: '我的萌属性喜好果然有问题',
        items: [
            '傲娇', '病娇', '元气', '三无', '慵懒',
            '中二病', '毒舌', '天然呆', '腹黑', '电波',
            '高冷', '弱气', '冒失', '地雷系', '变态'
        ]
    },
    {
        id: 'hair_color',
        name: '发色图鉴 (4x3)',
        category: 'character',
        label: '属性',
        cols: 4,
        defaultTitle: '我的发色喜好果然有问题',
        items: [
            '红毛', '黄毛', '绿毛', '蓝毛',
            '紫毛', '粉毛', '金毛', '棕毛',
            '黑毛', '白毛', '挑染', '渐变'
        ]
    },

    // --- Label: 番剧角色 (Anime Roles) ---
    {
        id: 'romance_chars',
        name: '恋爱番角色 (6x3)',
        category: 'character',
        label: '番剧角色',
        cols: 6,
        items: [
            '最帅男主', '最美女主', '最撩男主', '最撩女主', '最佳CP', '最佳CP',
            '最废男主', '最茶女主', '最迟钝男主', '最迟钝女主', '最虐CP', '最虐CP',
            '败犬男主', '败犬女主', '天降系', '青梅竹马', '最佳助攻', '也就是脸好看'
        ]
    },
    {
        id: 'isekai_chars',
        name: '异世界角色 (5x3)',
        category: 'character',
        label: '番剧角色',
        cols: 5,
        defaultTitle: '我的异世界转生果然有问题',
        items: [
            '最想转生', '最强龙傲天', '最惨穿越者', '最废女神', '最佳魔王',
            '最佳勇者', '最佳后宫', '最佳坐骑', '最佳公会', '最想退队',
            '种田流', '复仇流', '搞笑流', '凤傲天', '系统外挂'
        ]
    },
    {
        id: 'idol_chars',
        name: '偶像/音游角色 (4x3)',
        category: 'character',
        label: '番剧角色',
        cols: 4,
        defaultTitle: '我的推果然最可爱',
        items: [
            '绝对C位', '天籁之音', '舞蹈担当', '颜值担当',
            '努力家', '天才', '小恶魔', '天然呆',
            '最想打Call', '最想握手', '最想看Live', '全员推'
        ]
    },
    {
        id: 'campus_chars',
        name: '校园角色 (4x3)',
        category: 'character',
        label: '番剧角色',
        cols: 4,
        defaultTitle: '我的校园恋爱物语',
        items: [
            '同桌', '班长', '学生会长', '风纪委员',
            '学长/学姐', '学弟/学妹', '不良少年', '转校生',
            '社团部长', '校花/校草', '保健室老师', '图书管理员'
        ]
    },
    {
        id: 'magical_girl_chars',
        name: '魔法少女角色 (4x3)',
        category: 'character',
        label: '番剧角色',
        cols: 4,
        defaultTitle: '我的魔法少女喜好果然有问题',
        items: [
            '最强魔法少女', '最美变身', '最强必杀技', '吉祥物/淫兽',
            '粉色担当', '内战幻神', '黑化', '物理魔法',
            '为了世界', '为了自己', '为了朋友', '绝望瞬间'
        ]
    },
    {
        id: 'mecha_chars',
        name: '机战角色 (4x3)',
        category: 'character',
        label: '番剧角色',
        cols: 4,
        defaultTitle: '我的机战喜好果然有问题',
        items: [
            '最佳驾驶员', '最帅机体', '最强浮游炮', '最强光束剑',
            '面具男', '王牌机师', '量产机', '战舰',
            '最惨便当', '和平主义者', '战争疯子', '裸飘'
        ]
    },
    {
        id: 'sports_chars',
        name: '运动番角色 (4x3)',
        category: 'character',
        label: '番剧角色',
        cols: 4,
        defaultTitle: '我的运动番喜好果然有问题',
        items: [
            '王牌', '队长', '经理人', '教练',
            '天才新人', '努力家', '宿敌', '最佳搭档',
            '最后的一球', '魔鬼训练', '带伤上阵', '全国制霸'
        ]
    },
    {
        id: 'mystery_chars',
        name: '悬疑/侦探角色 (4x3)',
        category: 'character',
        label: '番剧角色',
        cols: 4,
        defaultTitle: '我的推理喜好果然有问题',
        items: [
            '名侦探', '怪盗', '幕后黑手', '第一受害者',
            '猪队友警察', '天才助手', '不在场证明', '密室',
            '死亡小学生', '暴风雪山庄', '叙述性诡计', '最后的高潮'
        ]
    },

    // --- Label: 游戏角色 (Game Roles) ---
    {
        id: 'game_rpg_party',
        name: 'RPG 冒险队 (4x3)',
        category: 'character',
        label: '游戏角色',
        cols: 4,
        hot: true,
        defaultTitle: '我的 RPG 冒险队',
        items: [
            '勇者', '智囊', '坦克', '奶妈',
            '刺客', '远程输出', '吉祥物', '内鬼',
            '拖后腿的', '隐藏的大佬', '氪金大佬', '肝帝'
        ]
    },
    {
        id: 'mobile_game_chars',
        name: '二游角色 (3x3)',
        category: 'character',
        label: '游戏角色',
        cols: 3,
        hot: true,
        items: [
            '绝对本命', '强度美', '看板娘',
            '剧情刀', '官方亲女儿', '查无此人',
            '氪金之源', '仓管', '也就是脸好看'
        ]
    },
    // =================================================================
    // CATEGORY: CHARACTER - SPECIAL (特殊角色)
    // =================================================================

    // --- Label: 声优 (Voice Actor) ---
    {
        id: 'va_awards',
        name: '声优大赏 (4x3)',
        category: 'character',
        label: '声优',
        cols: 4,
        hot: true,
        defaultTitle: '我的声优喜好果然有问题',
        items: [
            '本命', '怪物', '御用声优', '最被低估',
            '最想听TA骂我', '入坑原因', '声线怪物', '劳模',
            '最强马甲', '唱歌最好听', '最想见本人', '如果你能闭嘴'
        ]
    },
    {
        id: 'va_staff',
        name: '制作阵容 (4x2)',
        category: 'character',
        label: '声优',
        cols: 4,
        defaultTitle: '我的制作阵容喜好',
        items: [
            '相信的神(监督)', '最稳的脚本', '最绝的配乐', '最神的原作',
            '最强画师', '最想寄刀片(制作人)', '最想寄刀片(编剧)', '最想寄刀片(公司)'
        ]
    },
    {
        id: 'va_memes',
        name: '声优梗图 (4x3)',
        category: 'character',
        label: '声优',
        cols: 4,
        defaultTitle: '你们声优是没别的工作吗',
        items: [
            '考哥.jpg', '精分现场', '不要把声优和角色混为一谈', '唯一神',
            '后宫王', '断手狂魔', '变态专业户', '中二专业户',
            '败犬专业户', '便当专业户', '反派专业户', '被迫害'
        ]
    },
    {
        id: 'va_singers',
        name: '最爱歌手 (3x3)',
        category: 'character',
        label: '声优',
        cols: 3,
        hot: true,
        defaultTitle: '我的歌单常驻歌手',
        items: [
            '歌姬/歌王', '开口跪', '高音怪物',
            '现场的神', '最想看Live', '最想安利',
            '冷门宝藏', '翻唱的神', '全能艺人'
        ]
    },

    // --- Label: 特摄 (Tokusatsu) ---
    {
        id: 'toku_general',
        name: '特摄综合 (4x3)',
        category: 'character',
        label: '特摄',
        cols: 4,
        hot: true,
        defaultTitle: '我的特摄喜好果然有问题',
        items: [
            '入坑作', '最帅皮套', '最强骑士/奥特曼', '最美反派',
            '最强变身', '最燃战斗', '最神剧情', '最想买玩具',
            '意难平', '最强CP', '最佳女角', '最屑反派'
        ]
    },
    {
        id: 'kamen_rider',
        name: '假面骑士 (4x4)',
        category: 'character',
        label: '特摄',
        cols: 4,
        defaultTitle: '我的假面骑士成分表',
        items: [
            '昭和最佳', '平成最佳', '令和最佳', '剧场版最佳',
            '最帅主骑', '最帅二骑', '最美反派', '最强腰带',
            '最想变身', '最烂结局', '最强怪人', '最燃OP',
            '新手推荐', '看一次哭一次', '全靠同行衬托', '东映养猪场'
        ]
    },
    {
        id: 'ultraman',
        name: '奥特曼 (4x3)',
        category: 'character',
        label: '特摄',
        cols: 4,
        defaultTitle: '你相信光吗',
        items: [
            '永远的光', '昭和最强', '平成最强', '新生代最强',
            '最帅人间体', '最帅怪兽', '最强战队', '最感人一集',
            '童年阴影', '最强形态', '最燃BGM', '谢谢你泰罗'
        ]
    },
];
