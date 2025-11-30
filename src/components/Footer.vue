<script setup lang="ts">
// Footer component with credits
</script>

<template>
  <footer 
    class="mt-16 pb-12 text-center text-gray-600"
    style="font-family: 'Noto Serif SC', serif;"
  >
    <!-- Social Links -->
    <div class="flex items-center justify-center gap-8 mb-8">
      <a 
        href="https://github.com/ywh555hhh/anime-role-grid" 
        target="_blank" 
        class="flex items-center gap-2 hover:text-[#e4007f] transition-colors group"
      >
        <div i-carbon-logo-github class="text-xl group-hover:scale-110 transition-transform" />
        <span class="font-bold tracking-widest">GitHub</span>
      </a>
      <a 
        href="https://discord.gg/8xF22PN4jW" 
        target="_blank" 
        class="flex items-center gap-2 hover:text-[#e4007f] transition-colors group"
      >
        <div i-carbon-logo-discord class="text-xl group-hover:scale-110 transition-transform" />
        <span class="font-bold tracking-widest">Discord</span>
      </a>
    </div>
    
    <!-- Credits -->
    <div class="space-y-4 text-sm">
      <p class="tracking-wide flex items-center justify-center gap-2">
        <span class="i-carbon-data-base text-gray-400" />
        <span>数据来源</span>
        <a href="https://bgm.tv" target="_blank" class="font-bold text-[#e4007f] hover:text-[#c0006b] transition-colors mx-1 flex items-center gap-1">
          Bangumi 番组计划
          <span class="i-carbon-favorite-filled text-xs" />
        </a>
      </p>
      
      <div class="flex items-center justify-center gap-2 text-xs opacity-80">
        <span class="i-carbon-idea text-gray-400" />
        <span>致敬灵感</span>
        <a href="https://github.com/itorr/anime-grid" target="_blank" class="hover:text-[#e4007f] transition-colors border-b border-transparent hover:border-[#e4007f] flex items-center gap-1">
          itorr/anime-grid
          <span class="i-carbon-launch text-[10px]" />
        </a>
      </div>

      <!-- Artistic Note -->
      <p class="italic opacity-60 text-xs mt-8 tracking-widest flex items-center justify-center gap-2">
        <span class="i-carbon-quotes text-gray-300" />
        Create, Share, and Discover your Anime Taste
        <span class="i-carbon-quotes text-gray-300 transform rotate-180" />
      </p>

      <!-- Disclaimer -->
      <p class="text-[10px] opacity-40 mt-2 tracking-wider flex items-center justify-center gap-1">
        <span class="i-carbon-information" />
        仅供个人娱乐使用 · 禁止用于任何商业用途
      </p>
    </div>
  </footer>
</template>
