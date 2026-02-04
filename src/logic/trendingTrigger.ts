import { useModalStore, MODAL_PRIORITY } from '~/stores/modalStore'
import TrendingGuideModal from '~/components/TrendingGuideModal.vue'
import TemplateGalleryModal from '~/components/TemplateGalleryModal.vue'
import { useGridStore } from '~/stores/gridStore'

const ONE_HOUR = 60 * 60 * 1000

/**
 * Super Smart Trending Trigger
 * 1. Checks 1h Cooldown
 * 2. If OK -> Shows Trending Modal
 * 3. If CD -> Executes fallback (silent fail or customized action)
 */
export function tryShowTrending(fallback?: () => void) {
    if (typeof window === 'undefined') return

    const now = Date.now()
    const lastTimeStr = localStorage.getItem('lastTrendingTime')
    const lastTime = lastTimeStr ? parseInt(lastTimeStr) : 0

    // Force cooldown check
    if (now - lastTime < ONE_HOUR) {
        // Cooldown active: Fail silently or run fallback
        fallback?.()
        return
    }

    const modalStore = useModalStore
    const gridStore = useGridStore()

    // Show Trending
    modalStore.openModal(TrendingGuideModal, {
        show: true,
        // Wiring events
        onClose: () => modalStore.closeModal(),

        onSelect: async (payload: { id: string, title: string }) => {
            await gridStore.loadTemplate(payload.id)
            gridStore.currentTitle.value = payload.title
            modalStore.closeModal()
        },

        onOpenGallery: () => {
            // User clicked "More" -> Go to real gallery
            modalStore.closeModal()
            // Open Gallery (Standard flow)
            // We can directly open it here
            modalStore.openModal(TemplateGalleryModal, {
                show: true,
                currentId: gridStore.currentTemplateId.value,
                onClose: () => modalStore.closeModal(),
                onSelect: (id: string) => {
                    gridStore.loadTemplate(id)
                    modalStore.closeModal()
                }
            }, MODAL_PRIORITY.INTERACTION)
        }
    }, MODAL_PRIORITY.PROMOTION) // Use Promotion priority? Or Guide? 290 was Guide-10.
    // User said "Daily... 1. Guide 2. Template". 
    // Guide is 300. So 290 is fine. Or just PROMOTION (100).
    // Let's stick to GUIDE priority or slightly lower to chain properly.
    // If we use openModal chaining, priority matters less for immediate display, 
    // but matters for queue preemption.
    // Let's use 290 (MODAL_PRIORITY.GUIDE - 10) to keep it consistent.

    // Update timestamp ONLY on successful show
    localStorage.setItem('lastTrendingTime', now.toString())
}
