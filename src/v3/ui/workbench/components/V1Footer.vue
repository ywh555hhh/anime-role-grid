<script setup lang="ts">
import { overlays } from '../../../platform/services/OverlayManager';
import JoinGroupOverlay from '../../overlays/JoinGroupOverlay.vue';

const openQQ = () => {
    overlays.open(JoinGroupOverlay);
};
</script>

<template>
  <footer 
    class="mt-8 pb-12 text-center text-gray-600 bg-white border-t border-gray-50 pt-8"
    style="font-family: 'Noto Serif SC', serif;"
  >
    <!-- Social Links -->
    <div class="grid grid-cols-2 gap-x-4 gap-y-6 mb-8 max-w-[280px] mx-auto md:max-w-none md:flex md:items-center md:justify-center md:gap-8">
      <a 
        href="https://github.com/ywh555hhh/anime-role-grid" 
        target="_blank" 
        class="flex items-center gap-2 hover:text-primary transition-colors group"
      >
        <div class="i-carbon-logo-github text-xl group-hover:scale-110 transition-transform" />
        <span class="font-bold tracking-widest">GitHub</span>
      </a>
      <a 
        href="https://discord.gg/8xF22PN4jW" 
        target="_blank" 
        class="flex items-center gap-2 hover:text-primary transition-colors group"
      >
        <div class="i-carbon-logo-discord text-xl group-hover:scale-110 transition-transform" />
        <span class="font-bold tracking-widest">Discord</span>
      </a>
      <button 
        @click="openQQ"
        class="flex items-center gap-2 hover:text-primary transition-colors group bg-transparent p-0 border-none outline-none hover:border-none"
      >
        <!-- Custom QQ Icon SVG -->
        <svg class="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path d="M824.8 613.2c-16-51.4-34.4-94.6-62.7-165.3C766.5 262.2 689.3 112 511.5 112 331.7 112 256.2 265.2 261 447.9c-28.4 70.8-46.7 113.7-62.7 165.3-34 109.5-23 154.8-14.6 155.8 18 2.2 70.1-82.4 70.1-82.4 0 49 25.2 112.9 79.8 159-26.4 8.1-85.7 29.9-71.6 53.8 11.4 19.3 196.2 12.3 249.5 6.3 53.3 6 238.1 13 249.5-6.3 14.1-23.8-45.3-45.7-71.6-53.8 54.6-46.2 79.8-110.1 79.8-159 0 0 52.1 84.6 70.1 82.4 8.5-1.1 19.5-46.4-14.5-155.8z" fill="currentColor"></path>
        </svg>
        <span class="font-bold tracking-widest">QQ</span>
      </button>
      <a 
        href="https://space.bilibili.com/36078469" 
        target="_blank" 
        class="flex items-center gap-2 hover:text-primary transition-colors group"
      >
        <!-- Bilibili Icon SVG -->
        <svg class="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path d="M777.514667 131.669333a53.333333 53.333333 0 0 0-48.426667 26.965334l-50.816 87.168a483.2 483.2 0 0 0-166.4-29.226667c-58.453333 0-114.346667 10.197333-167.082667 29.354667l-50.176-87.296a53.333333 53.333333 0 0 0-93.610666 52.138666L246.229333 289.834667c-112.554667 64.938667-189.696 182.997333-197.888 320.128-0.554667 9.173333-0.853333 18.261333-0.853333 27.264 0 6.058667 0.170667 12.16 0.469333 18.218666 6.058667 134.4 81.365333 249.514667 189.610667 312.362667a476.330667 476.330667 0 0 0 549.973333 0.256c108.416-62.805333 183.936-177.877333 190.122667-312.576 0.298667-6.058667 0.426-12.202667 0.426-18.261333 0-8.96-0.341333-17.962667-0.938667-27.050667-8.192-137.216-85.333333-255.488-197.930666-320.384l45.226666-78.122666a53.333333 53.333333 0 0 0-46.933333-80.042667zM337.024 624.128c-30.848 0-55.850667-27.605333-55.850667-61.696s25.002667-61.696 55.850667-61.696c30.848 0 55.850667 27.605333 55.850666 61.696s-25.002667 61.696-55.850666 61.696z m352.085333 0c-30.848 0-55.850667-27.605333-55.850666-61.696s25.002667-61.696 55.850666-61.696c30.848 0 55.850667 27.605333 55.850667 61.696s-25.002667 61.696-55.850667 61.696z" fill="currentColor"></path>
        </svg>
        <span class="font-bold tracking-widest">Bilibili</span>
      </a>
    </div>
    
    <!-- Credits -->
    <div class="space-y-4 text-sm">
      <p class="tracking-wide flex items-center justify-center gap-2">
        <span class="i-carbon-data-base text-gray-400" />
        <span>数据来源</span>
        <a href="https://bgm.tv" target="_blank" class="font-bold text-primary hover:text-primary-hover transition-colors mx-1 flex items-center gap-1">
          Bangumi 番组计划
          <span class="i-carbon-favorite-filled text-xs" />
        </a>
      </p>
      
      <div class="flex items-center justify-center gap-2 text-xs opacity-80">
        <span class="i-carbon-idea text-gray-400" />
        <span>致敬灵感</span>
        <a href="https://github.com/itorr/anime-grid" target="_blank" class="hover:text-primary transition-colors border-b border-transparent hover:border-primary flex items-center gap-1">
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
