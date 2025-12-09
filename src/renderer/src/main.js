import './assets/main.css'
import './assets/iconfont/iconfont.css'
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'uno.css'
import router from '@router'
import App from './App.vue'

const app = createApp(App)

app.use(ElementPlus)
app.use(router)

// 隐藏启动画面的函数
const hideLoading = () => {
  const loading = document.getElementById('loading')
  if (loading) {
    loading.classList.add('hidden')
  }
}

// 确保在Vue应用完全挂载且路由准备就绪后，立即隐藏加载动画
// 静态导入路由组件后，加载速度会更快，不需要额外延迟
Promise.all([
  app.mount('#app').$nextTick(),
  router.isReady()
]).then(() => {
  // 立即隐藏加载动画，减少白屏时间
  hideLoading()
})
