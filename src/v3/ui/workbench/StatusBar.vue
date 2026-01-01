<template>
  <footer class="h-8 bg-white border-t border-gray-100 flex items-center justify-between px-4 text-xs text-gray-500 shrink-0 select-none z-30 font-medium">
    
    <!-- Left: Canvas Stats -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-1.5 hover:text-pink-600 cursor-pointer transition-colors" title="Canvas Resolution">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>
        <span>1920 x 1080</span>
      </div>
      
      <div class="flex items-center gap-1.5 hover:text-pink-600 cursor-pointer transition-colors" title="Current Zoom Level">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
        <span>100%</span>
      </div>
    </div>

    <!-- Center: Selection/Hint (Optional) -->
    <div class="hidden md:flex text-gray-400/80">
      <span>Hold Space to Pan</span>
    </div>

    <!-- Right: System Stats -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-1.5 hover:text-pink-600 cursor-pointer transition-colors" title="Asset Memory Usage">
         <span class="w-2 h-2 rounded-full bg-green-400"></span>
         <span>Mem: 12MB</span>
      </div>
      <div class="flex items-center gap-1 hover:bg-pink-50 px-2 py-1 rounded-full cursor-pointer transition-colors text-pink-500">
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
         <span>Feedback</span>
      </div>
    </div>
  </footer>
</template>
