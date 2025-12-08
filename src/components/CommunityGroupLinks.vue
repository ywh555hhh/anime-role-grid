<script setup lang="ts">
const groups = [
  {
    title: '综合交流主群',
    tag: '推荐',
    desc: '官方大群 / 反馈 Bug / 闲聊吹水',
    icon: 'i-carbon-chat',
    url: 'https://qun.qq.com/universal-share/share?ac=1&authKey=axd5YDW0i5ZiyX8jTultFRVHCHv9FAsCnqHq40itBLuQEoUOdCo06bAh05W%2Bv1c7&busi_data=eyJncm91cENvZGUiOiIxMDU1NTkxMDY0IiwidG9rZW4iOiJMazMxZ1pPZHdQejMyS1BaSFZ2UkJIdHp5b29NbTI4VU9NaGhSSW96T0NpcS9ha0oyZzJEVmpPRXZ1Nit2eTVNIiwidWluIjoiMTkxNjY0NzYxNiJ9&data=Tsay2nkLgPoS1UGFPbFnpdAsQeLPgFErKFco7mYPmWPldhqQme_u6smVnM0ifq8X5nO5TiLUbxgl57S9deOLIw&svctype=4&tempid=h5_group_info'
  },
  {
    title: '【我推的ACN】',
    tag: '青春 · 恋爱 · 校园',
    desc: '核心题材讨论区。只聊动画、漫画、轻小说。聊《败犬》《春物》《我推》等校园恋爱番',
    icon: 'i-carbon-notebook',
    url: 'https://qun.qq.com/universal-share/share?ac=1&authKey=1LsjjxDEHjGWTDq3%2FRSfv4Qcb3ESkVgBC3mQmdOPhuFBeEfIbQnuHFGI%2BEA4QLIE&busi_data=eyJncm91cENvZGUiOiIxMDE4MjEzNjUzIiwidG9rZW4iOiJ1aUhXOHFjdlQwSGJlZjNCN0NWS0laRzI3MEY1MHhvczZiRW9EOU1xSGRxaTRJS21aSkRXWFhKTmMrWS9mM2JCIiwidWluIjoiMTkxNjY0NzYxNiJ9&data=ODTRpLsOGRek2N-cVzqTSr2rKDj1y3nmdtdgRnP_iZE7WKUGq9fr2LJHiSf9LLX4YNX78Rpq_mpvT8ROyfoC8g&svctype=4&tempid=h5_group_info'
  },
  {
    title: '【我推的二游】',
    tag: '手游 · 抽卡 · 强度',
    desc: '各类二次元手游讨论。晒卡、深渊配队、节奏榜、日常吐槽。',
    icon: 'i-carbon-game-console',
    url: 'https://qun.qq.com/universal-share/share?ac=1&authKey=N%2Bfruq0iPx8IhUvbksaoNR2vPtCr7tTmrRRPfmGvuYlExWoy2LZsGfaL183PzNXO&busi_data=eyJncm91cENvZGUiOiI4NTkzNjEwOTkiLCJ0b2tlbiI6Ii9DQy9KZ0l4bzNObWFrOXJwbEV0Q3cxRmVNNmtOOGpDZFNLOCt1bHNxb05WL29zQVo1UlE4czVTWDM4dU8vZUsiLCJ1aW4iOiIxOTE2NjQ3NjE2In0%3D&data=caBB9HR43RsqoEKBASBC1plB48DZi3RsJLnQ7dgEYPj8fmVGnVqGWLn7YbYe_oZcAHod8KqRzsdl5hXVUQ9OaQ&svctype=4&tempid=h5_group_info'
  },
  {
    title: '【我推的旮旯】',
    tag: 'Gal · 视觉小说',
    desc: '剧情向游戏交流。推生肉、找补丁、聊线路、AVG爱好者请进。',
    icon: 'i-carbon-game-wireless',
    url: 'https://qun.qq.com/universal-share/share?ac=1&authKey=KgGU8v2up7Umiwm97tlf6w9sQtNEHYrre4N%2BMKTxBsGS8b0mjwfgCm32QT3wafRj&busi_data=eyJncm91cENvZGUiOiIxNzYxODYwMTkiLCJ0b2tlbiI6InFTd2dSWmNyWXgvaHJvaHl3akd2bCtpdFRyOUd1QVdsM2t6MXNuczdpRjkyUHdyYzY4bngwbnVWV1MwYkI3WjYiLCJ1aW4iOiIzNjYzNTU4MDg3In0%3D&data=q2YUZm5dBCs7tzjCofgNzBxV77kTJNI5nHbeQ8b7zp8M3AeiUa2dqAyois_Pg4RFdwC-SJF4XpuYpAy9twSURg&svctype=4&tempid=h5_group_info'
  },
  {
    title: '【我推的神人】',
    tag: '综合 · 水群 · 闲聊',
    desc: '日常灌水区。主播圈、数码、生活琐事、除了违法乱纪什么都聊。',
    icon: 'i-carbon-chat-bot',
    url: 'https://qm.qq.com/q/kHNDRQUhj4'
  }
]
</script>

<template>
  <div class="flex flex-col gap-3">
    <a 
      v-for="group in groups" 
      :key="group.title"
      :href="group.url" 
      target="_blank" 
      class="w-full group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border-2 border-pink-100 dark:border-gray-700 hover:border-[#e4007f] transition-all duration-300 shadow-sm hover:shadow-md p-4 flex items-center gap-4"
    >
        <!-- Icon -->
        <div class="bg-pink-50 dark:bg-pink-900/30 p-3 rounded-full text-[#e4007f] border border-pink-100 dark:border-pink-800/30 shrink-0">
            <div :class="group.icon" class="text-2xl" />
        </div>
        
        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1">
             <div class="font-black text-base text-gray-900 dark:text-gray-100 truncate">{{ group.title }}</div>
             <span class="bg-[#e4007f] text-white text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0">{{ group.tag }}</span>
          </div>
          <div class="text-xs text-gray-400 leading-relaxed line-clamp-2">{{ group.desc }}</div>
        </div>
        
        <!-- Arrow -->
        <div class="i-carbon-arrow-right text-gray-300 group-hover:text-[#e4007f] group-hover:translate-x-1 transition-all shrink-0" />
    </a>
  </div>
</template>

<style scoped>
/* Scoped styles are handled by tailwind classes in the template */
</style>
