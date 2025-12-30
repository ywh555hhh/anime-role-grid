<script setup lang="ts">
// No explicit import needed for macros in <script setup>

const props = defineProps<{
    show: boolean
    config: {
        title: string
        message: string
        actionLabel: string
        actionLink: string
    }
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

function handleAction() {
    if (props.config.actionLink) {
        window.open(props.config.actionLink, '_blank')
    }
    emit('close')
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div v-if="show" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click="emit('close')">
      
      <!-- Modal Content -->
      <div 
        class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-bounce-in relative"
        @click.stop
      >
         <!-- Decorative Background Pattern -->
         <div class="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-purple-500 to-pink-500 opacity-20 pointer-events-none" />
         
         <div class="p-8 flex flex-col items-center text-center relative z-10">
            <!-- Icon -->
            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-6 shadow-inner">
                <div class="text-3xl animate-pulse">✨</div>
            </div>

            <!-- Title -->
            <h3 class="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100 font-serif leading-tight">
                {{ config.title }}
            </h3>

            <!-- Message -->
            <p class="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed text-sm whitespace-pre-wrap">
                {{ config.message }}
            </p>

            <!-- Actions -->
            <div class="flex flex-col gap-3 w-full">
                <button 
                    @click="handleAction"
                    class="w-full btn-primary py-3 rounded-xl shadow-lg shadow-purple-200 dark:shadow-none flex items-center justify-center gap-2 group"
                >
                    <span>{{ config.actionLabel }}</span>
                    <div class="i-carbon-arrow-right group-hover:translate-x-1 transition-transform" />
                </button>
                
                <button
                    @click="emit('close')"
                    class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors py-2"
                >
                    残忍拒绝
                </button>
            </div>
         </div>
      </div>
    </div>
  </Transition>
</template>
