<template>
  <header class="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-30 select-none">
    
    <!-- Left: Branding & Editor Tools -->
    <div class="flex items-center gap-6">
      <div class="flex items-center gap-2 text-gray-900 font-bold tracking-tight text-lg">
        <span class="text-pink-500 text-2xl">❖</span>
        <span>AnimeGrid</span>
      </div>

      <div class="h-6 w-px bg-gray-100 mx-2 hidden md:block"></div>

      <!-- Editor History Controls -->
      <div class="hidden md:flex items-center gap-1 text-gray-500">
        <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 hover:text-gray-900 transition-colors" title="Undo (Ctrl+Z)">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
        </button>
        <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 hover:text-gray-900 transition-colors opacity-50 cursor-not-allowed" title="Redo (Ctrl+Y)">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
        </button>
      </div>
    </div>

    <!-- Right: Streamer & Export -->
    <div class="flex items-center gap-4">
       <!-- Mode Toggle -->
       <div class="flex items-center bg-gray-100/50 rounded-full p-1 border border-gray-100 text-xs font-medium">
          <button class="px-3 py-1.5 flex items-center gap-2 rounded-full bg-white shadow-sm text-pink-600 font-bold transition-all" title="Edit Mode">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
             Edit
          </button>
          <button class="px-3 py-1.5 flex items-center gap-2 rounded-full text-gray-400 hover:text-gray-600 transition-all" title="Streamer Mode (View Only)">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
             Stream
          </button>
       </div>

       <div class="h-6 w-px bg-gray-100 hidden md:block"></div>

       <button class="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-full hover:bg-gray-800 shadow-md hover:shadow-lg transition-all active:scale-95">
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
         <span>Download</span>
         <span class="opacity-50 text-xs">PNG</span>
       </button>
    </div>
  </header>
</template>
