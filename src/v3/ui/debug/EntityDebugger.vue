    <script setup lang="ts">
import { computed, reactive } from 'vue';
import { useWorld } from '../composables/useWorld';
import GridBoard from '../components/GridBoard.vue';
import { useGrid } from '../composables/useGrid';
import { MOCK_AVATARS } from '../../core/data/mock';
import { DockSystem } from '../../core/systems/dock';
import { TEMPLATES } from '../../core/data/templates';
import { TemplateLoader } from '../../core/systems/loader';

// Import missing types and functions
import { createSetComponentCommand } from '../../core/ecs/command';
import type { EntityId, ComponentData } from '../../core/ecs/types';
import EntityCard from '../components/EntityCard.vue';
import SlotItem from '../components/SlotItem.vue'; // New simple component for slots

const { registry, history, state } = useWorld();
// const { initMainGrid, mainGridId } = useGrid(); // Legacy Grid deprecated in Phase 6

// const gridId = initMainGrid();

const loading = reactive({ current: 'standard' });

// Load Standard Grid by default
const defaultTemplate = TEMPLATES['standard'];
if (defaultTemplate) {
    TemplateLoader.load(registry, defaultTemplate);
}

const cardEntities = computed(() => {
    const all = Array.from(state.entities);
    // Filter out cards: entities that have Visual
    return all.filter(id => registry.getComponent(id, 'Visual'));
});

const slotEntities = computed(() => {
    const all = Array.from(state.entities);
    // Filter slots: entities that have LayoutConfig.strategy === 'slot'
    return all.filter(id => {
        const config = registry.getComponent(id, 'LayoutConfig');
        return config && config.strategy === 'slot';
    });
});

function switchTemplate(key: string) {
    // 1. Clear existing slots (but keep Cards)
    // Needs a clearSlots util in Loader or here. 
    // For now, let's just NUKE SLOTS here manually or updated Loader has clear method?
    // User instruction said: "Loader Logic: 1. Clear...". 
    // I haven't implemented Clear in Loader yet.
    // Let's implement a simple clear in Loader now.
    
    // Actually calling Loader.load just appends currently.
    // Let's rely on Loader for clearing later. For now, manual hack to clear slots:
    Array.from(state.entities).forEach(id => {
         const config = registry.getComponent(id, 'LayoutConfig');
         if (config && config.strategy === 'slot') {
             registry.destroyEntity(id);
         }
    });

    const template = TEMPLATES[key];
    if (template) {
        TemplateLoader.load(registry, template);
        loading.current = key;
    } else {
        console.error(`Template ${key} not found`);
    }
}

function addRandomEntity() {
    const id = registry.createEntity();

    // Random Color or Text
    // Logic: 50% chance of being a Color Block, 50% Text Item
    const isColor = Math.random() > 0.5;
    const visualData: ComponentData<'Visual'> = {
        src: isColor ? `hsl(${Math.floor(Math.random()*360)}, 70%, 50%)` : `Item ${id.slice(0, 4)}`,
        type: isColor ? 'color' : 'text',
        visible: true,
        styleVariant: 'default'
    };
    
    // Command 1: Add Visual
    const cmd = createSetComponentCommand(id, 'Visual', visualData);
    history.execute(cmd);

    // Command 2: Add Transform (Random Pos)
    const transformData: ComponentData<'Transform'> = {
        x: 50 + Math.floor(Math.random() * 300),
        y: 50 + Math.floor(Math.random() * 200),
        z: 1
    };
    const cmd2 = createSetComponentCommand(id, 'Transform', transformData);
    history.execute(cmd2);
    
    // Add Interaction (Important for drag!)
    registry.addComponent(id, 'Interaction', {
        isDraggable: true,
        isSelectable: true,
        isSelected: false,
        isHovered: false
    });
}

// Import ImagePool
import { ImagePool } from '../../core/systems/assets/ImagePool';

async function fillDock() {
    const pool = ImagePool.getInstance();
    // Create Entities for each Mock Avatar
    const newIds: EntityId[] = [];
    
    // Process sequentially or Promise.all
    // Using for...of loop for async
    for (const url of MOCK_AVATARS) {
        const id = registry.createEntity(); 
        newIds.push(id);
        
        // Store in ImagePool first
        const imageUuid = await pool.storeImage(url);

        // Visual: Image
        registry.addComponent(id, 'Visual', {
            src: imageUuid, // Use UUID
            type: 'image',
            visible: true,
            styleVariant: 'default'
        });

        // Initialize Transform (will be updated by DockLayout)
        registry.addComponent(id, 'Transform', {
            x: 0,
            y: 0,
            z: 1,
            parentId: 'dock-zone' 
        });
        
        // Interaction
        registry.addComponent(id, 'Interaction', {
            isDraggable: true,
            isSelectable: true,
            isSelected: false,
            isHovered: false
        });
    }

    // Run Dock Layout
    const cmds = DockSystem.layoutDock(registry, newIds as EntityId[]);
    cmds.forEach(cmd => cmd.execute(registry));
}

function getLocString(id: EntityId) {
    const t = registry.getComponent(id, 'Transform');
    if (!t) return 'N/A';
    return `(${t.x.toFixed(0)}, ${t.y.toFixed(0)})`;
}

// ===================================
// Dashboard 2.0 Logic
// ===================================
import { EventBus } from '../../core/systems/events';
import { onMounted, onUnmounted, ref, nextTick } from 'vue';

// ... Logic
import ImportDialog from '../overlays/ImportDialog.vue';
import { watch } from 'vue';

const showImportDialog = ref(false);

// Live Dock Logic
// Watch for any changes in entities list, filter for dock items, and re-layout
watch(() => state.entities.size, () => {
    // Find all dock entities
    const dockIds: EntityId[] = [];
    for (const id of state.entities) {
        // Optimization: In a real system, we'd have an index for parentId.
        // Here we scan.
        const t = registry.getComponent(id, 'Transform');
        if (t && t.parentId === 'dock-zone') {
            dockIds.push(id);
        }
    }
    
    if (dockIds.length > 0) {
        // Layout Config? Or just DockSystem direct?
        // Let's use DockSystem to get commands, but we need to execute them.
        // However, DockSystem.layoutDock returns commands assuming current state.
        // If we run this on every entity add, it acts as a "System".
        // In a real ECS loop, this would run every tick or on dirty.
        // Here we react to Vue changes.
        const cmds = DockSystem.layoutDock(registry, dockIds);
        
        // Execute discreetly (don't flood history?)
        // Layout updates are usually transient or system-level.
        // For V3 Phase 10.5, let's just apply them directly via a batch command or ignoring history?
        // But our DockSystem returns Commands.
        // Let's execute them.
        cmds.forEach(cmd => cmd.execute(registry));
    }
}, { flush: 'post' });


const serializedJson = ref('');
const logs = ref<{time: string, event: string, type: string, payload: string}[]>([]);
const logContainer = ref<HTMLElement | null>(null);

function saveWorld() {
    const json = registry.serialize();
    serializedJson.value = json;
    console.log('[Dashboard] Saved World:', json.length, 'bytes');
    addLog('system', 'World Saved', `${json.length} bytes`);
}

function clearWorld() {
    // Registry internal clear needs to be invoked via deserializing empty? 
    // Or we should expose clear(). 
    // deserialize('{"entities":[],"components":{}}') works if implemented correctly.
    registry.deserialize('{"entities":[], "components":{}}');
    addLog('system', 'World Cleared', 'All entities removed');
}

function loadDemo() {
    if (!serializedJson.value) {
        alert('Paste JSON first!');
        return;
    }
    registry.deserialize(serializedJson.value);
    addLog('system', 'World Loaded', 'Restored from JSON');
}

function addLog(type: string, event: string, payload: any) {
    const time = new Date().toLocaleTimeString();
    logs.value.push({ 
        time, 
        type, 
        event, 
        payload: typeof payload === 'object' ? JSON.stringify(payload) : String(payload)
    });
    
    // Auto-scroll
    nextTick(() => {
        if (logContainer.value) {
            logContainer.value.scrollTop = logContainer.value.scrollHeight;
        }
    });
}

// Event Listeners
const onSnap = (p: any) => addLog('snap', 'ENTITY:SNAPPED', p);
const onSwap = (p: any) => addLog('swap', 'ENTITY:SWAPPED', p);

onMounted(() => {
    EventBus.on('entity:snapped', onSnap);
    EventBus.on('entity:swapped', onSwap);
    addLog('system', 'Dashboard Ready', 'Listening for events...');
});

onUnmounted(() => {
    EventBus.off('entity:snapped', onSnap);
    EventBus.off('entity:swapped', onSwap);
});
</script>

<template>
  <div style="border: 2px solid #ccc; padding: 20px; margin: 20px;">
    <h3>Entity Debugger</h3>
    
    <!-- Template Switcher -->
    <div style="margin-bottom: 20px; display: flex; gap: 10px;">
        <button @click="switchTemplate('standard')" :style="{ fontWeight: loading.current==='standard'?'bold':'normal'}">Standard</button>
        <button @click="switchTemplate('team_builder')" :style="{ fontWeight: loading.current==='team_builder'?'bold':'normal'}">Team Builder</button>
        <button @click="switchTemplate('tier_list')" :style="{ fontWeight: loading.current==='tier_list'?'bold':'normal'}">Tier List</button>
    </div>

    <div style="margin-bottom: 20px;">
        <button @click="showImportDialog = true" style="padding: 10px; margin-right: 10px; background: #e0faff; border-color: #00bcd4; color: #006064;">
        + Import Asset
        </button>
        <button @click="addRandomEntity" style="padding: 10px; margin-right: 10px;">
        + Add Random
        </button>
        <button @click="fillDock" style="padding: 10px; background: #e0f7fa;">
        🌊 Fill Dock (Mock Images)
        </button>
    </div>

    <!-- Import Dialog Overlay -->
    <ImportDialog :show="showImportDialog" @close="showImportDialog = false" />


    <div v-if="state.entities.size === 0">No entities yet.</div>

    <!-- Dashboard Panel -->
    <div class="dashboard-panel">
        <div class="panel-section">
            <h4>💾 Serialization</h4>
            <div class="btn-group">
                <button @click="saveWorld">Save (Console)</button>
                <button @click="clearWorld" class="danger">Clear</button>
                <button @click="loadDemo">Load Demo</button>
            </div>
            <textarea v-model="serializedJson" placeholder="JSON Blob..." rows="3"></textarea>
        </div>

        <div class="panel-section">
            <h4>📡 Event Log</h4>
            <div class="log-terminal" ref="logContainer">
                <div v-for="(log, idx) in logs" :key="idx" class="log-line">
                    <span class="log-time">[{{ log.time }}]</span>
                    <span :class="['log-type', log.type]">{{ log.event }}</span>
                    <span class="log-payload">{{ log.payload }}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Free Roam Area for Dragging -->
    <div class="viewport-area">
        <!-- The Slots Layer (Z=0) -->
        <SlotItem 
            v-for="id in slotEntities" 
            :key="'slot-'+id" 
            :id="id" 
        />

        <!-- Cards Layer (Z=1+) -->
        <EntityCard 
            v-for="id in cardEntities" 
            :key="'card-'+id" 
            :id="id" 
        />
    </div>

    <!-- Debug Info Below -->
    <div style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 20px;">
        <h4>Debug Data</h4>
        <div style="font-size: 10px; color: #666;">
            Total Entities: {{ state.entities.size }} | Slots: {{ slotEntities.length }}
        </div>
    </div>
  </div>
</template>

<style scoped>
.viewport-area {
    position: relative;
    width: 60%; /* Shrink width to make room for dashboard if side-by-side, or just use overlay */
    height: 600px;
    border: 1px solid #333;
    background: #f9f9f9;
    overflow: hidden;
    float: left;
}

.dashboard-panel {
    float: right;
    width: 38%;
    height: 600px;
    background: #222;
    color: #0f0;
    padding: 10px;
    box-sizing: border-box;
    overflow-y: auto;
    font-family: 'Courier New', Courier, monospace;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.panel-section h4 {
    margin-top: 0;
    border-bottom: 1px solid #444;
    padding-bottom: 5px;
    color: #fff;
}

.btn-group {
    display: flex;
    gap: 5px;
    margin-bottom: 10px;
}

button {
    background: #444;
    color: #fff;
    border: 1px solid #666;
    padding: 5px 10px;
    cursor: pointer;
}

button:hover {
    background: #666;
}

button.danger {
    background: #622;
    border-color: #933;
}

textarea {
    width: 100%;
    background: #111;
    color: #0f0;
    border: 1px solid #333;
    font-size: 10px;
    resize: vertical;
}

.log-terminal {
    background: #000;
    height: 300px;
    overflow-y: auto;
    padding: 5px;
    border: 1px solid #333;
    font-size: 11px;
}

.log-line {
    margin-bottom: 2px;
    border-bottom: 1px solid #111;
}

.log-time {
    color: #666;
    margin-right: 5px;
}

.log-type {
    font-weight: bold;
    margin-right: 5px;
}

.log-type.snap { color: cyan; }
.log-type.swap { color: orange; }
.log-type.load { color: magenta; }

.log-payload {
    color: #aaa;
}
</style>
