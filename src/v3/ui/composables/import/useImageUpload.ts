import { ref, shallowRef, nextTick, onBeforeUnmount, watch } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

export function useImageUpload(aspectRatio: number) {
    const fileInput = ref<HTMLInputElement | null>(null)
    const customName = ref('')
    const customImageFile = ref<File | null>(null)
    const customImagePreview = ref<string | null>(null)
    const cropSource = ref<string | null>(null)
    const cropError = ref('')

    const cropperImageRef = ref<HTMLImageElement | null>(null)
    const cropperInstance = shallowRef<Cropper | null>(null)

    const triggerFileInput = () => {
        fileInput.value?.click()
    }

    const prepareCustomImage = (file: File) => {
        cropError.value = ''
        if (!file.type.startsWith('image/')) {
            cropError.value = '仅支持图片文件'
            return
        }
        customImageFile.value = file
        const reader = new FileReader()
        reader.onload = (e) => {
            const result = e.target?.result as string
            customImagePreview.value = result
            cropSource.value = result
        }
        reader.onerror = () => {
            cropError.value = '图片读取失败'
        }
        reader.readAsDataURL(file)
    }

    const handleFileChange = (event: Event) => {
        const target = event.target as HTMLInputElement
        const file = target.files?.[0]
        if (file) {
            prepareCustomImage(file)
            target.value = ''
        }
    }

    const handleDrop = (event: DragEvent) => {
        const file = event.dataTransfer?.files?.[0]
        if (file && file.type.startsWith('image/')) {
            prepareCustomImage(file)
        }
    }

    const destroyCropper = () => {
        cropperInstance.value?.destroy()
        cropperInstance.value = null
    }

    const initCropper = async () => {
        if (!cropSource.value) return
        await nextTick()
        if (!cropperImageRef.value) return

        destroyCropper()

        cropperInstance.value = new Cropper(cropperImageRef.value, {
            aspectRatio,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 1,
            background: false,
            responsive: true,
            movable: true,
            zoomOnWheel: true,
        })
    }

    const getCroppedImage = (targetWidth: number): string | null => {
        const instance = cropperInstance.value
        // If no cropper (e.g. image not loaded), return preview directly? 
        // Usually we want the crop. If logic allows raw image, handle upstream.
        if (!instance) return customImagePreview.value

        try {
            const canvas = instance.getCroppedCanvas({
                width: targetWidth,
                height: Math.round(targetWidth / aspectRatio),
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            })
            return canvas.toDataURL('image/png')
        } catch (error) {
            console.error('Crop failed:', error)
            cropError.value = '裁切失败'
            return null
        }
    }

    // Lifecycle
    watch(cropSource, async (val) => {
        if (val) {
            cropError.value = ''
            await initCropper()
        } else {
            destroyCropper()
        }
    })

    onBeforeUnmount(() => {
        destroyCropper()
    })

    return {
        fileInput,
        customName,
        customImageFile,
        customImagePreview,
        cropSource,
        cropError,
        cropperImageRef,
        triggerFileInput,
        handleFileChange,
        handleDrop,
        getCroppedImage
    }
}
