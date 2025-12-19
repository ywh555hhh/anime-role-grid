import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'
import './style.css' // Global Styles & Overrides

createApp(App).use(router).mount('#app')
