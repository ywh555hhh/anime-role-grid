<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { TEMPLATES, type TemplateCategory } from '~/logic/templates'

defineProps<{
  show: boolean
  currentId: string
}>()

const emit = defineEmits(['close', 'select'])

const activeCategory = ref<TemplateCategory>('character')
const activeSubLabel = ref<string>('全部')

const CATEGORY_MAP: Record<TemplateCategory, string> = {
  character: '角色',
  work: '作品',
  relation: '关系/CP',
  fun: '趣味/梗',
  nsfw: '绅士',
  custom: '自定义'
}

const categories = computed(() => {
  return Object.keys(CATEGORY_MAP) as TemplateCategory[]
})

// Reset sub-label when specific category changes
watch(activeCategory, () => {
  activeSubLabel.value = '全部'
})

// Get templates for current category
const categoryTemplates = computed(() => {
  return TEMPLATES.filter(t => t.category === activeCategory.value)
})

// Extract unique sub-labels for current category
const subLabels = computed(() => {
  const labels = new Set<string>()
  categoryTemplates.value.forEach(t => {
    if (t.label) labels.add(t.label)
  })
  return ['全部', ...Array.from(labels)]
})

// Final filtered list
const filteredTemplates = computed(() => {
  if (activeSubLabel.value === '全部') return categoryTemplates.value
  return categoryTemplates.value.filter(t => t.label === activeSubLabel.value)
})

function select(id: string) {
  emit('select', id)
  emit('close')
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div 
      v-if="show" 
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      @click="emit('close')"
    >
      <div 
        class="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col md:flex-row shadow-2xl overflow-hidden"
        @click.stop
      >
        <!-- Sidebar (Category Level 1) -->
        <div class="w-full md:w-40 bg-gray-50 dark:bg-gray-800 p-2 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 shrink-0">
          <div class="text-xs font-bold text-gray-400 mb-2 mt-2 hidden md:block px-3 uppercase tracking-wider">核心分类</div>
          <button
            v-for="cat in categories"
             :key="cat"
             class="px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap text-left flex items-center gap-2"
             :class="activeCategory === cat ? 'bg-white text-primary shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'"
             @click="activeCategory = cat"
           >
            <!-- Icons optional, can add map later if needed -->
             {{ CATEGORY_MAP[cat] }}
          </button>
        </div>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col min-w-0 min-h-0 bg-white dark:bg-gray-900">
          <!-- Header: Title + SubLabels (Category Level 2) -->
          <div class="p-6 pb-2 border-b border-gray-100 dark:border-gray-800">
             <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <div i-carbon-grid class="text-primary" />
                  <span>{{ CATEGORY_MAP[activeCategory] }}</span>
                </h2>
                <button 
                  class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  @click="emit('close')"
                >
                  <div i-carbon-close class="text-xl" />
                </button>
             </div>

             <!-- Sub Label Tabs -->
             <div v-if="subLabels.length > 1" class="flex flex-wrap gap-2">
                <button
                   v-for="label in subLabels"
                   :key="label"
                   class="px-3 py-1.5 rounded-full text-xs font-bold transition-all border"
                   :class="activeSubLabel === label ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'"
                   @click="activeSubLabel = label"
                 >
                  {{ label }}
                </button>
             </div>
          </div>

          <!-- Grid Area -->
          <div class="flex-1 p-6 overflow-y-auto">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                v-for="template in filteredTemplates"
                :key="template.id"
                class="group relative flex flex-col items-start p-4 rounded-xl border-2 transition-all hover:-translate-y-1 hover:shadow-lg text-left bg-white dark:bg-gray-800"
                :class="currentId === template.id ? 'border-primary bg-primary-light/30 dark:bg-pink-900/20' : 'border-gray-100 dark:border-gray-700 hover:border-primary'"
                @click="select(template.id)"
              >
                <div class="flex items-center justify-between w-full mb-2">
                  <div class="flex items-center gap-2">
                     <span class="text-base font-bold text-gray-900 dark:text-white">{{ template.name.split('(')[0] }}</span>
                     <div 
                       v-if="template.hot"
                       class="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold border border-red-200 flex items-center gap-0.5"
                     >
                       🔥
                     </div>
                  </div>
                  <span class="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                     {{ template.cols }}列
                  </span>
                </div>
                
                <!-- Items Preview -->
                <div class="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 leading-relaxed w-full">
                   {{ template.items.slice(0, 8).join('、') }}
                </div>
                
                <!-- Sub Label Tag (Visible only if viewing 'All') -->
                <div v-if="activeSubLabel === '全部' && template.label" class="mt-3">
                   <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 border border-gray-100">
                      {{ template.label }}
                   </span>
                </div>

                <div 
                  v-if="currentId === template.id"
                  class="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" 
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
