/**
 * 社群（QQ 群）数据 —— 唯一真相源
 * ==================================
 *
 * ## 为什么集中到一处
 * 之前这些信息散在三个组件里，各写各的，出了两个实实在在的问题：
 *
 * 1. **同一个群两套链接，两处文案还不一致**
 *    FirstTimeGuide 的卡片写着「加入【我推的ACNG】」，
 *    点的却是 `qm.qq.com/q/Jkf6Vgmyw8`；
 *    CommunityGroupLinks 里的「【我推的ACN】」用的是另一条 400 字符的分享链接。
 *    两边其实是**同一个群（1018213653）**，但群名一个叫 ACN 一个叫 ACNG，
 *    链接也长得完全不一样 —— 下次换链接，必然漏掉一处。
 *
 * 2. **400 字符的分享链接硬编码 5 处**
 *    QQ 的群分享链接长这样：
 *        https://qun.qq.com/universal-share/share?ac=1&authKey=...&busi_data=...&data=...&svctype=4
 *    散在组件里几乎没法维护 —— 群链接过期要改好几处，还容易改漏。
 *
 * 现在群名、定位、描述、群号、链接全在一处，组件只读数据。
 * **「写的」和「指的」不可能再对不上。**
 *
 * ## 链接为什么优先用短链
 * QQ 的群分享链接有两种形态：
 *
 * - `qm.qq.com/q/<code>` —— **短链**。每次访问都会 302 到一条
 *   **当场新签发的** universal-share 链接（authKey 每次都不一样）。
 *   所以它不会因为 authKey 过期而失效。
 * - `qun.qq.com/universal-share/share?...authKey=<固定的>` —— authKey
 *   是签发时就烤进 URL 的，过期后就是死链。
 *
 * 实测：ACN 群在源码里存的是 `authKey=1LsjjxDEHjGWTDq3...`，
 * 而短链现签的是 `authKey=kpd88Rcxtuf...` —— 确实是两个不同的 key。
 *
 * **所以：能拿到短链的群一律用短链。** 拿不到的（其余三个）暂时保留
 * 原来的分享链接 —— 但 `groupCode` 一起存着，链接真挂了还能靠群号搜进去。
 *
 * ## 群号为什么单独存一份
 * 群分享链接会过期，**群号不会**。
 * 所以界面上直接把群号显示出来 —— 既是保底手段，也方便用户手动搜索进群。
 */

export interface CommunityGroup {
    /** 唯一 id。改动会让老链接失效，慎改 */
    id: string;
    /** 群名 */
    name: string;
    /** 一行定位（分类标签） */
    tagline: string;
    /** 一句说明：这个群在聊什么、适合谁 */
    desc: string;
    /** 群号。链接失效时的保底手段 */
    groupCode: string;
    /** 入群链接 */
    url: string;
    /** UnoCSS 图标类名 */
    icon: string;
    /** 主推。列表里排在最前并高亮 */
    featured?: boolean;
}

/**
 * 全部社群。
 *
 * 顺序 = 展示顺序。第一个是主推群。
 */
export const COMMUNITY_GROUPS: CommunityGroup[] = [
    {
        id: "main",
        name: "综合交流主群",
        tagline: "官方总群",
        desc: "站点官方群：反馈 Bug、报活动、找同好都在这儿。也是主力水群，日常闲聊吹水。",
        groupCode: "1055591064",
        url: "https://qun.qq.com/universal-share/share?ac=1&authKey=axd5YDW0i5ZiyX8jTultFRVHCHv9FAsCnqHq40itBLuQEoUOdCo06bAh05W%2Bv1c7&busi_data=eyJncm91cENvZGUiOiIxMDU1NTkxMDY0IiwidG9rZW4iOiJMazMxZ1pPZHdQejMyS1BaSFZ2UkJIdHp5b29NbTI4VU9NaGhSSW96T0NpcS9ha0oyZzJEVmpPRXZ1Nit2eTVNIiwidWluIjoiMTkxNjY0NzYxNiJ9&data=Tsay2nkLgPoS1UGFPbFnpdAsQeLPgFErKFco7mYPmWPldhqQme_u6smVnM0ifq8X5nO5TiLUbxgl57S9deOLIw&svctype=4&tempid=h5_group_info",
        icon: "i-carbon-chat",
        featured: true,
    },
    {
        id: "acn",
        name: "【我推的ACN】",
        tagline: "青春 · 恋爱 · 校园",
        desc: "只聊青春恋爱向的动画、漫画、轻小说。《败犬》《春物》《我推》都在这儿。",
        groupCode: "1018213653",
        url: "https://qm.qq.com/q/Jkf6Vgmyw8",
        icon: "i-carbon-notebook",
    },
    {
        id: "gacha",
        name: "【我推的二游】",
        tagline: "手游 · 抽卡 · 强度",
        desc: "二次元手游专门群：晒卡、配队、深渊攻略、版本节奏吐槽。",
        groupCode: "859361099",
        url: "https://qun.qq.com/universal-share/share?ac=1&authKey=N%2Bfruq0iPx8IhUvbksaoNR2vPtCr7tTmrRRPfmGvuYlExWoy2LZsGfaL183PzNXO&busi_data=eyJncm91cENvZGUiOiI4NTkzNjEwOTkiLCJ0b2tlbiI6Ii9DQy9KZ0l4bzNObWFrOXJwbEV0Q3cxRmVNNmtOOGpDZFNLOCt1bHNxb05WL29zQVo1UlE4czVTWDM4dU8vZUsiLCJ1aW4iOiIxOTE2NjQ3NjE2In0%3D&data=caBB9HR43RsqoEKBASBC1plB48DZi3RsJLnQ7dgEYPj8fmVGnVqGWLn7YbYe_oZcAHod8KqRzsdl5hXVUQ9OaQ&svctype=4&tempid=h5_group_info",
        icon: "i-carbon-game-console",
    },
    {
        id: "gal",
        name: "【我推的旮旯】",
        tagline: "Gal · 视觉小说",
        desc: "剧情向游戏与视觉小说的同好聚集地，聊角色、聊线路、聊体验。",
        groupCode: "176186019",
        url: "https://qun.qq.com/universal-share/share?ac=1&authKey=KgGU8v2up7Umiwm97tlf6w9sQtNEHYrre4N%2BMKTxBsGS8b0mjwfgCm32QT3wafRj&busi_data=eyJncm91cENvZGUiOiIxNzYxODYwMTkiLCJ0b2tlbiI6InFTd2dSWmNyWXgvaHJvaHl3akd2bCtpdFRyOUd1QVdsM2t6MXNuczdpRjkyUHdyYzY4bngwbnVWV1MwYkI3WjYiLCJ1aW4iOiIzNjYzNTU4MDg3In0%3D&data=q2YUZm5dBCs7tzjCofgNzBxV77kTJNI5nHbeQ8b7zp8M3AeiUa2dqAyois_Pg4RFdwC-SJF4XpuYpAy9twSURg&svctype=4&tempid=h5_group_info",
        icon: "i-carbon-game-wireless",
    },
    {
        id: "chat",
        name: "【我推的神人】",
        tagline: "综合 · 水群",
        desc: "什么都聊的杂烩群：主播圈、数码、生活琐事，一天到晚没个完。",
        groupCode: "945640593",
        url: "https://qm.qq.com/q/kHNDRQUhj4",
        icon: "i-carbon-chat-bot",
    },
];

/**
 * 主推群。
 *
 * 引流入口（首屏引导、导出成功后的邀请）都指向它 —— 一个入口只推一个群，
 * 比摆五个让人自己挑转化率高得多。想换主推群，改 COMMUNITY_GROUPS 的顺序
 * 和 featured 标记即可。
 */
export function getFeaturedGroup(): CommunityGroup {
    const featured = COMMUNITY_GROUPS.find((g) => g.featured);
    if (featured) return featured;

    const first = COMMUNITY_GROUPS[0];
    if (!first) throw new Error("COMMUNITY_GROUPS 是空的");
    return first;
}

/** 按 id 找群 */
export function getCommunityGroup(id: string): CommunityGroup | undefined {
    return COMMUNITY_GROUPS.find((g) => g.id === id);
}
