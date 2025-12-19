<script setup lang="ts">
// No props needed anymore
</script>

<template>
  <header class="flex flex-col items-center gap-4 mb-4 md:mb-8 px-4 pt-8">
    <!-- Brand Logo & Title Wrapper -->
    <div class="flex flex-col items-center gap-6">
      <!-- Logo + Title -->
      <div class="flex flex-col md:flex-row items-center gap-3 md:gap-4">
        <img src="/logo.png" alt="Logo" class="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-sm" />
        <h1 
          class="text-3xl md:text-5xl font-bold text-gray-900 tracking-widest"
          style="font-family: 'Noto Serif SC', serif;"
        >
          【我推<span class="text-primary">的</span>格子】
        </h1>
      </div>
      
      <!-- Decorative Separator (Matches width of content above) -->
      <div class="w-full h-[4px] bg-primary rounded-full" />
    </div>
  </header>
</template>
