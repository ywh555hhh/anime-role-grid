<script setup lang="ts">
// Footer component with credits
</script>

<template>
  <footer class="mt-16 pb-12 text-center text-gray-500 font-sans">
    <!-- Social Links -->
    <div class="flex items-center justify-center gap-6 mb-6">
      <a 
        href="https://github.com/ywh555hhh/anime-role-grid" 
        target="_blank" 
        class="flex items-center gap-2 hover:text-black dark:hover:text-white transition-colors group"
      >
        <div i-carbon-logo-github class="text-xl group-hover:scale-110 transition-transform" />
        <span class="font-medium">GitHub</span>
      </a>
      <a 
        href="https://discord.gg/8xF22PN4jW" 
        target="_blank" 
        class="flex items-center gap-2 hover:text-[#5865F2] transition-colors group"
      >
        <div i-carbon-logo-discord class="text-xl group-hover:scale-110 transition-transform" />
        <span class="font-medium">Discord</span>
      </a>
    </div>
    
    <!-- Credits -->
    <div class="space-y-3 text-sm">
      <p>
        Data provided by 
        <a href="https://bgm.tv" target="_blank" class="font-bold text-pink-500 hover:text-pink-600 transition-colors">
          Bangumi API
        </a>
      </p>
      
      <div class="flex items-center justify-center gap-2 text-xs opacity-75">
        <span>Inspired by</span>
        <a href="https://github.com/itorr/anime-grid" target="_blank" class="hover:underline hover:text-gray-900 dark:hover:text-gray-300">
          itorr/anime-grid
        </a>
      </div>

      <!-- Artistic Note -->
      <p class="font-serif italic opacity-60 text-xs mt-6 tracking-wide">
        "Create, Share, and Discover your Anime Taste."
      </p>
    </div>
  </footer>
</template>
