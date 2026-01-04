import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'
import './style.css' // Global Styles & Overrides

const app = createApp(App)

app.use(createPinia()) // Pinia for State
app.use(router)
// app.use(i18n) // V2 i18n support

import { bootstrapV3 } from './v3/platform/bootstrap'

// Initialize V3 Persistence (Migrate -> Project -> Load)
bootstrapV3().then(() => {
    app.mount('#app')
})
