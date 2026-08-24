import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { initializeTheme } from './stores/theme'

initializeTheme()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 应用启动即初始化认证状态
const auth = useAuthStore()
void auth.init()

app.mount('#app')
