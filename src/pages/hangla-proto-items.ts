/**
 * PROTOTYPE 数据 —— 用完即删。
 *
 * 28 个真实 Bangumi 角色。**只存 large 档位**（原图），显示时按需要派生 /r/{w}/ 缩略图：
 *   small  /r/100/ → 100px    grid /g/ → 75×75（方形，会糊，已弃用）
 *   medium /r/400/ → 400px    large /l/ → 822×1080（原图）
 * 注意 /r/ 前缀不能用在 /g/ 路径上（实测 502），所以必须以 large 为源。
 *
 * 图片一律走主站同源代理，绝不直连 lain.bgm.tv。
 * 正式实现应改为运行时经 /api/search 搜索，而不是硬编码。
 */

export interface ProtoItem {
    id: number
    name: string
    /** Bangumi large 档位原图地址；显示时再派生缩略图 */
    image: string
}

/** 未放入任何层级的候选物品 —— 让原型开箱即用，不必依赖搜索接口 */
export const PROTO_POOL: ProtoItem[] = [
    { id: 10452, name: '初音ミク', image: 'https://lain.bgm.tv/pic/crt/l/00/71/10452_crt_UusO7.jpg?r=1625248340' },
    { id: 184752, name: '初音未來', image: 'https://lain.bgm.tv/pic/crt/l/69/75/184752_crt_5f85k.jpg' },
    { id: 74243, name: '五条悟', image: 'https://lain.bgm.tv/pic/crt/l/12/12/74243_crt_c5h9t.jpg?r=1646562964' },
    { id: 34604, name: '五条館国広', image: 'https://lain.bgm.tv/pic/crt/l/af/a4/34604_crt_iUjyb.jpg' },
    { id: 57311, name: '煉獄杏寿郎', image: 'https://lain.bgm.tv/pic/crt/l/79/c8/57311_crt_OOxzM.jpg?r=1569685045' },
    { id: 189716, name: '煉獄', image: 'https://lain.bgm.tv/pic/crt/l/fd/24/189716_crt_2N26w.jpg' },
    { id: 57305, name: '竈門炭治郎', image: 'https://lain.bgm.tv/pic/crt/l/bd/1e/57305_crt_9ZG90.jpg?r=1610926902' },
    { id: 177853, name: '竈門炭十郎', image: 'https://lain.bgm.tv/pic/crt/l/7d/e1/177853_crt_vGeeP.jpg?r=1749821598' },
    { id: 57306, name: '竈門禰豆子', image: 'https://lain.bgm.tv/pic/crt/l/29/f6/57306_crt_EmNmM.jpg?r=1610926959' },
    { id: 23574, name: '竃門', image: 'https://lain.bgm.tv/pic/crt/l/4f/fe/23574_crt_HnHH5.jpg?r=1392565385' },
    { id: 57307, name: '我妻善逸', image: 'https://lain.bgm.tv/pic/crt/l/f3/e4/57307_crt_BtdWT.jpg' },
    { id: 671, name: '我妻由乃', image: 'https://lain.bgm.tv/pic/crt/l/04/23/671_crt_HkmXG.jpg?r=1733333910' },
    { id: 14671, name: 'アーニャ', image: 'https://lain.bgm.tv/pic/crt/l/fc/67/14671_crt_8Mw8b.jpg' },
    { id: 23434, name: 'アーニャ', image: 'https://lain.bgm.tv/pic/crt/l/36/15/23434_crt_gwgPZ.jpg?r=1393490080' },
    { id: 71477, name: 'ロイド・フォージャー', image: 'https://lain.bgm.tv/pic/crt/l/a9/0d/71477_crt_Gg8D9.jpg?r=1651051630' },
    { id: 17134, name: 'ロイド', image: 'https://lain.bgm.tv/pic/crt/l/7a/bf/17134_crt_AxDxd.jpg' },
    { id: 71478, name: 'ヨル・フォージャー', image: 'https://lain.bgm.tv/pic/crt/l/59/12/71478_crt_pp27D.jpg?r=1651051658' },
    { id: 4794, name: 'ヨル', image: 'https://lain.bgm.tv/pic/crt/l/18/a4/4794_crt_anidb.jpg' },
    { id: 18101, name: 'エレン・イェーガー', image: 'https://lain.bgm.tv/pic/crt/l/e3/2f/18101_crt_343At.jpg?r=1410320023' },
    { id: 8992, name: 'エレン', image: 'https://lain.bgm.tv/pic/crt/l/4a/ee/8992_crt_anidb.jpg' },
    { id: 18102, name: 'ミカサ・アッカーマン', image: 'https://lain.bgm.tv/pic/crt/l/21/40/18102_crt_nVMeD.jpg?r=1700166918' },
    { id: 161166, name: 'ミカサ', image: 'https://lain.bgm.tv/pic/crt/l/1c/2c/161166_crt_8p4vb.jpg' },
    { id: 19546, name: 'リヴァイ', image: 'https://lain.bgm.tv/pic/crt/l/e5/b3/19546_crt_UP2v0.jpg?r=1611927735' },
    { id: 146450, name: 'リミア・デ・ラ・ヴァイナス', image: 'https://lain.bgm.tv/pic/crt/l/4b/7f/146450_crt_rdRuM.jpg' },
    { id: 2358, name: 'モンキー・D・ルフィ', image: 'https://lain.bgm.tv/pic/crt/l/12/c1/2358_crt_3ZoDo.jpg' },
    { id: 3309, name: 'モンキー・D・ドラゴン', image: 'https://lain.bgm.tv/pic/crt/l/8f/9d/3309_crt_0d004.jpg' },
    { id: 2359, name: 'ロロノア・ゾロ', image: 'https://lain.bgm.tv/pic/crt/l/2e/9a/2359_crt_DJdZ1.jpg' },
    { id: 223375, name: 'ルルノア＝ロロ＝トラエッタ', image: 'https://lain.bgm.tv/pic/crt/l/5a/dd/223375_crt_w6MUT.jpg' },
]