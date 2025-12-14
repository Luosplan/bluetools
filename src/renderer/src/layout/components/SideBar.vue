<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage as Toast } from 'element-plus'

const route = useRoute()
const router = useRouter()

// 从路由配置中获取导航项
const navItems = computed(() => {
  return router.options.routes[0].children.filter(item => item.meta?.show)
})

// 获取当前激活的导航项
const currentRoute = computed(() => route.path.slice(1))

// 是否已开始测试（需要从全局状态或存储中获取，这里暂时硬编码）
const testStarted = ref(false)

// 监听路由变化，更新dashboard中的currentTab
watch(() => route.path, (newPath) => {
  const tabId = newPath.slice(1)
  // 尝试获取dashboard组件实例
  const dashboard = document.querySelector('.dashboard-page')
  if (dashboard) {
    // 向dashboard组件发送消息，更新currentTab
    dashboard.dispatchEvent(new CustomEvent('update-tab', { detail: { tabId } }))
  }
})

// 处理导航点击
const handleNavClick = (navItem) => {
  const tabId = navItem.path
  
  // 如果测试已开始，只允许停留在测试标签页
  if (testStarted.value && (tabId === 'scan' || tabId === 'settings')) {
    return Toast.info('请先删除测试设备或完成测试')
  }
  
  // 如果要切换到测试标签页，检查是否已录入设备
  if (tabId === 'test' && !testStarted.value) {
    // 这里需要检查是否已录入设备，暂时直接跳转到测试页面
    router.push(`/${tabId}`)
  } else {
    // 其他标签页正常切换
    router.push(`/${tabId}`)
  }
}
</script>

<template>
  <nav class="w-16 glass-panel border-t-0 flex flex-col items-center py-6 gap-6 z-40">
    <button 
      v-for="item in navItems" 
      :key="item.path"
      class="border-none w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group relative"
      :class="{
        'bg-blue-600 text-white shadow-lg shadow-blue-500/30': currentRoute === item.path,
        'text-slate-400 hover:bg-white/5 cursor-pointer': !testStarted,
        'text-slate-600 cursor-not-allowed opacity-50': testStarted && (item.path === 'scan' || item.path === 'settings')
      }"
      @click="handleNavClick(item)">
      <i :class="['iconfont', item.meta.icon]"></i>
      <!-- Tooltip -->
      <span
        class="absolute left-14 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap border border-white/10 pointer-events-none z-50"
      >
        {{ item.meta.title }}
      </span>
    </button>
  </nav>
</template>

<style lang="scss" scoped>
.glass-panel {
  background: linear-gradient(to bottom, #0f172a, #1e293b);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
