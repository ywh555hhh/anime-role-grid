<script setup lang="ts">
/**
 * 模板画廊
 * =========
 *
 * 以前这个界面被吐槽过：**分类不明确、找起来困难、没有排序标准、很碎片化**。
 * 对应四个解法：
 *
 * 1. **分类 tab 带数量** —— 一眼知道每个分类里有多少东西
 * 2. **搜索** —— 118 个模板，用户其实知道自己在找什么
 * 3. **三个明确的排序维度**，默认按**真实填写量**
 *    （`/api/trending-templates` 的数据以前拉了但从没用过）
 * 4. **二级标签只保留够格的**（≥3 个模板）—— 消灭「点进去只出 1 张卡」的噪音
 *
 * 筛选与排序的纯逻辑在 `~/logic/templateGallery`，这里只负责呈现。
 */
import { ref, computed, watch, onMounted } from "vue";
import { TEMPLATES, type TemplateCategory } from "~/logic/templates";
import {
    GALLERY_SORTS,
    type GallerySort,
    filterTemplates,
    formatUsage,
    getSubLabelOptions,
    sortTemplates,
} from "~/logic/templateGallery";
import { api } from "~/services/api";

const CATEGORY_MAP: Record<TemplateCategory | "all", string> = {
    all: "全部",
    character: "角色",
    work: "作品",
    relation: "关系/CP",
    fun: "趣味/梗",
    nsfw: "绅士",
    custom: "自定义",
};

/**
 * 角标样式。
 *
 * 只有「纯粹系列」和「新模板」两种需要显示 —— 其余角标类型没在用，
 * 显示出来反而是噪音。
 */
const BADGE_STYLES: Record<string, { emoji: string; label: string; class: string }> = {
    new: {
        emoji: "🆕",
        label: "新模板",
        class: "bg-green-100 text-green-600 border-green-200",
    },
    pure: {
        emoji: "💎",
        label: "纯粹系列",
        class: "bg-blue-100 text-blue-600 border-blue-200",
    },
};

const CATEGORY_ORDER: (TemplateCategory | "all")[] = [
    "all",
    "character",
    "work",
    "relation",
    "fun",
    "nsfw",
    "custom",
];

const props = defineProps<{
    show: boolean;
    currentId: string;
}>();

const emit = defineEmits(["close", "select"]);

const activeCategory = ref<TemplateCategory | "all">("all");
const activeSubLabel = ref<string>("");
const query = ref("");
const sort = ref<GallerySort>("popular");

/** 每个模板被填过多少次。拉取失败就静默降级（排序退回 hot 标记） */
const trendingMap = ref<Record<string, number>>({});
const copiedId = ref<string | null>(null);

onMounted(async () => {
    try {
        const stats = await api.getTrendingTemplates();
        const map: Record<string, number> = {};
        stats.forEach((s) => (map[s.id] = s.count));
        trendingMap.value = map;
    } catch {
        // 拉不到就当没有数据 —— 排序会退回 hot 标记，功能不受影响
    }
});

/**
 * 分类 tab 上的数量。
 *
 * 跟着**搜索词**走：搜「败犬」的时候，「角色 53」是有误导性的 ——
 * 实际只有 1 个匹配。分面搜索的数量应该反映当前结果集。
 */
const categoryCounts = computed(() => {
    const counts = new Map<TemplateCategory | "all", number>();
    for (const cat of CATEGORY_ORDER) counts.set(cat, 0);

    for (const template of TEMPLATES) {
        if (!filterTemplates([template], query.value).length) continue;
        counts.set("all", (counts.get("all") ?? 0) + 1);
        counts.set(template.category, (counts.get(template.category) ?? 0) + 1);
    }
    return counts;
});

/** 当前分类 + 搜索命中的模板 */
const scopedTemplates = computed(() => {
    const inCategory =
        activeCategory.value === "all"
            ? TEMPLATES
            : TEMPLATES.filter((t) => t.category === activeCategory.value);
    return filterTemplates(inCategory, query.value);
});

/** 二级标签选项（只留够格的，并按模板数降序） */
const subLabelOptions = computed(() => getSubLabelOptions(scopedTemplates.value));

/**
 * 最终列表：先按二级标签筛，再排序。
 *
 * 搜索时**不显示**二级标签 —— 搜索已经把范围收窄了，
 * 再套一层标签筛选只会让人多点一次。
 */
const visibleTemplates = computed(() => {
    let list = scopedTemplates.value;

    if (!query.value.trim() && activeSubLabel.value) {
        list = list.filter((t) => t.label === activeSubLabel.value);
    }

    return sortTemplates(list, sort.value, trendingMap.value);
});

// 切换分类 / 改变搜索词后，原先选中的二级标签可能已经不存在了
watch([activeCategory, query], () => {
    const stillValid = subLabelOptions.value.some((o) => o.label === activeSubLabel.value);
    if (!stillValid) activeSubLabel.value = "";
});

function resetFilters() {
    query.value = "";
    activeSubLabel.value = "";
    activeCategory.value = "all";
}

async function copyLink(id: string) {
    const url = `${window.location.origin}/t/${id}`;
    try {
        await navigator.clipboard.writeText(url);
        copiedId.value = id;
        setTimeout(() => {
            copiedId.value = null;
        }, 2000);
    } catch {
        // 剪贴板不可用（权限 / 非 https）就当没复制
    }
}

/**
 * 去掉模板名末尾的尺寸标注。
 *
 * 「经典 (5x3)」→「经典」—— 尺寸信息单独用角标显示，
 * 名字里再带一遍就成了重复信息，还挤掉了长名字的展示空间。
 */
function displayName(name: string): string {
    return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/** 使用量的展示文案。没有数据就返回空串（调用方用 v-if 隐藏） */
function usageLabel(id: string): string {
    const count = trendingMap.value[id];
    if (!count) return "";
    return `${formatUsage(count)} 人填过`;
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
            v-if="props.show"
            class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4"
            @click="emit('close')"
        >
            <div
                class="bg-white dark:bg-gray-900 rounded-none md:rounded-2xl w-full max-w-5xl h-full md:h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                @click.stop
            >
                <!-- 标题 -->
                <div
                    class="flex items-center justify-between px-4 md:px-5 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0"
                >
                    <div class="flex items-center gap-2">
                        <div i-carbon-grid class="text-primary text-xl" />
                        <h2 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                            切换模板
                        </h2>
                    </div>
                    <button
                        class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        @click="emit('close')"
                    >
                        <div i-carbon-close class="text-xl" />
                    </button>
                </div>

                <!-- 搜索 -->
                <div
                    class="px-4 md:px-5 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0"
                >
                    <div
                        class="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus-within:border-primary"
                    >
                        <div i-carbon-search class="text-gray-400 shrink-0" />
                        <input
                            v-model="query"
                            type="search"
                            placeholder="搜模板名或内容，比如「败犬」「声优」"
                            class="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
                        />
                        <button
                            v-if="query"
                            @click="query = ''"
                            class="shrink-0 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <div i-carbon-close class="text-sm text-gray-500" />
                        </button>
                    </div>
                </div>

                <!-- 一级分类（带数量） -->
                <div
                    class="px-4 md:px-5 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0 overflow-x-auto scrollbar-thin"
                >
                    <div class="flex gap-2 w-max">
                        <button
                            v-for="cat in CATEGORY_ORDER"
                            :key="cat"
                            @click="activeCategory = cat"
                            class="px-3 py-1.5 rounded-full text-sm font-bold transition-all border whitespace-nowrap flex items-center gap-1.5"
                            :class="
                                activeCategory === cat
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white text-gray-500 border-gray-200 dark:border-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary'
                            "
                        >
                            {{ CATEGORY_MAP[cat] }}
                            <span
                                class="text-[10px] px-1 rounded-full"
                                :class="
                                    activeCategory === cat
                                        ? 'bg-white/25'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                "
                            >
                                {{ categoryCounts.get(cat) ?? 0 }}
                            </span>
                        </button>
                    </div>
                </div>

                <!-- 排序 + 结果数 -->
                <div
                    class="px-4 md:px-5 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center gap-3"
                >
                    <div class="flex gap-1 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <button
                            v-for="option in GALLERY_SORTS"
                            :key="option.id"
                            @click="sort = option.id"
                            class="px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap"
                            :class="
                                sort === option.id
                                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400'
                            "
                        >
                            <div :class="option.icon" />
                            {{ option.label }}
                        </button>
                    </div>
                    <span class="text-xs text-gray-400 ml-auto shrink-0">
                        {{ visibleTemplates.length }} 个
                    </span>
                </div>

                <!-- 二级标签：只显示够格的（≥3 个模板）；搜索时不需要 -->
                <div
                    v-if="subLabelOptions.length > 1 && !query.trim()"
                    class="px-4 md:px-5 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0 overflow-x-auto scrollbar-thin"
                >
                    <div class="flex gap-2 w-max">
                        <button
                            @click="activeSubLabel = ''"
                            class="px-2.5 py-1 rounded-full text-xs font-bold transition-all border whitespace-nowrap"
                            :class="
                                !activeSubLabel
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white text-gray-500 border-gray-200 dark:border-gray-700 dark:text-gray-300 hover:border-primary'
                            "
                        >
                            全部
                        </button>
                        <button
                            v-for="option in subLabelOptions"
                            :key="option.label"
                            @click="activeSubLabel = option.label"
                            class="px-2.5 py-1 rounded-full text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-1"
                            :class="
                                activeSubLabel === option.label
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white text-gray-500 border-gray-200 dark:border-gray-700 dark:text-gray-300 hover:border-primary'
                            "
                        >
                            {{ option.label }}
                            <span class="opacity-60">{{ option.count }}</span>
                        </button>
                    </div>
                </div>

                <!-- 列表 -->
                <div class="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-5">
                    <!-- 空态 -->
                    <div v-if="!visibleTemplates.length" class="py-16 text-center">
                        <div i-carbon-search text-4xl text-gray-300 mb-3 />
                        <p class="text-sm text-gray-500 mb-1">没有匹配的模板</p>
                        <p class="text-xs text-gray-400 mb-4">
                            换个关键词，或者
                            <button
                                @click="resetFilters"
                                class="text-primary underline underline-offset-2"
                            >
                                清空筛选
                            </button>
                        </p>
                    </div>

                    <div
                        v-else
                        class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3"
                    >
                        <button
                            v-for="template in visibleTemplates"
                            :key="template.id"
                            class="group relative flex flex-col items-start p-3 rounded-xl border-2 transition-all hover:shadow-md text-left bg-white dark:bg-gray-800 min-w-0"
                            :class="
                                props.currentId === template.id
                                    ? 'border-primary bg-primary-light/30 dark:bg-pink-900/20'
                                    : 'border-gray-100 dark:border-gray-700 hover:border-primary'
                            "
                            @click="emit('select', template.id)"
                        >
                            <!-- 名字 + 角标 -->
                            <div class="flex items-start gap-1.5 w-full mb-1.5">
                                <span
                                    class="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 min-w-0 flex-1"
                                >
                                    {{ displayName(template.name) }}
                                </span>
                                <span
                                    v-if="template.badge && BADGE_STYLES[template.badge]"
                                    class="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border"
                                    :class="BADGE_STYLES[template.badge]?.class"
                                    :title="BADGE_STYLES[template.badge]?.label"
                                >
                                    {{ BADGE_STYLES[template.badge]?.emoji }}
                                </span>
                                <span
                                    v-else-if="template.hot"
                                    class="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200"
                                    title="热门"
                                >
                                    🔥
                                </span>
                            </div>

                            <!-- 分类 + 列数 + 使用量 -->
                            <div class="flex items-center gap-1.5 w-full mb-1.5 flex-wrap">
                                <!--
                                    分类标签只在「全部」视图里显示：
                                    已经在某个分类下时它是废话。

                                    它同时解决了一个具体问题 ——
                                    有三对模板**重名**（「唯一真神」「Top 3」「绅士问卷」），
                                    在「全部」里看起来一模一样。加上分类才分得清。
                                -->
                                <span
                                    v-if="activeCategory === 'all'"
                                    class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0"
                                >
                                    {{ CATEGORY_MAP[template.category] }}
                                </span>
                                <span
                                    class="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded shrink-0"
                                >
                                    {{ template.cols }}列
                                </span>
                                <span
                                    v-if="usageLabel(template.id)"
                                    class="text-[10px] text-gray-400 truncate"
                                >
                                    {{ usageLabel(template.id) }}
                                </span>
                            </div>

                            <!-- 内容预览 -->
                            <div
                                class="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed w-full line-clamp-2"
                            >
                                {{ template.items.slice(0, 4).join("、") }}
                            </div>

                            <!-- 复制链接 -->
                            <span
                                @click.stop="copyLink(template.id)"
                                class="absolute top-2 right-2 p-1 rounded-md bg-white/80 dark:bg-gray-800/80 text-gray-300 hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                :title="copiedId === template.id ? '已复制' : '复制链接'"
                                role="button"
                            >
                                <div
                                    :class="
                                        copiedId === template.id
                                            ? 'i-carbon-checkmark text-green-500'
                                            : 'i-carbon-link'
                                    "
                                />
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>
