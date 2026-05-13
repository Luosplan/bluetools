<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Delete } from '@element-plus/icons-vue'
// 导入pinia store
import { useSettingsStore } from '../../stores/settings'
import { useUpdaterStore } from '../../stores/updater'
import { ElMessage, ElMessageBox } from 'element-plus'

// 使用pinia store
const settingsStore = useSettingsStore()
const updaterStore = useUpdaterStore()

// 获取当前设置数据
const settings = ref({
  general: settingsStore.general,
  bluetooth: settingsStore.bluetooth,
  bluetoothServices: settingsStore.bluetoothServices || {
    mainService: '0000fe60-0000-1000-8000-00805f9b34fb',
    writeCharacteristic: '0000fe61-0000-1000-8000-00805f9b34fb',
    notifyCharacteristic: '0000fe62-0000-1000-8000-00805f9b34fb'
  },
  scanFilters: settingsStore.scanFilters || {
    nameFilters: ['ecv02']
  }
})
const appVersion = ref('1.0.0')
// 应用版本和构建时间（实际应用中应该从环境变量或配置文件获取）
const buildTime = new Date().toLocaleDateString()

// 更新状态
const updateStatus = reactive({
  checking: false,
  downloading: false,
  progress: 0,
  available: false,
  error: null,
  latestVersion: ''
})

// 保存设置
  const saveSettings = () => {
    // 获取当前保存的设置，用于恢复空值
    let currentServices = settingsStore.bluetoothServices || {}
    
    // 校验蓝牙服务设置，确保不为空
    const validatedSettings = { ...settings.value }
    
    // 主服务校验
    if (!validatedSettings.bluetoothServices.mainService?.trim()) {
      validatedSettings.bluetoothServices.mainService = currentServices.mainService || '0000fe60-0000-1000-8000-00805f9b34fb'
    }
    
    // 写入特征校验
    if (!validatedSettings.bluetoothServices.writeCharacteristic?.trim()) {
      validatedSettings.bluetoothServices.writeCharacteristic = currentServices.writeCharacteristic || '0000fe61-0000-1000-8000-00805f9b34fb'
    }
    
    // 监听特征校验
    if (!validatedSettings.bluetoothServices.notifyCharacteristic?.trim()) {
      validatedSettings.bluetoothServices.notifyCharacteristic = currentServices.notifyCharacteristic || '0000fe62-0000-1000-8000-00805f9b34fb'
    }
    
    // 将所有蓝牙服务值转为小写
    validatedSettings.bluetoothServices.mainService = validatedSettings.bluetoothServices.mainService.toLowerCase()
    validatedSettings.bluetoothServices.writeCharacteristic = validatedSettings.bluetoothServices.writeCharacteristic.toLowerCase()
    validatedSettings.bluetoothServices.notifyCharacteristic = validatedSettings.bluetoothServices.notifyCharacteristic.toLowerCase()
    
    // 过滤名称过滤列表中的空字符串
    validatedSettings.scanFilters.nameFilters = validatedSettings.scanFilters.nameFilters.filter(name => name.trim())
    
    // 更新本地设置
    settings.value = validatedSettings
    
    // 使用pinia store保存设置
    settingsStore.$patch(validatedSettings)
    settingsStore.saveSettings()
  }

// 加载设置
const loadSettings = () => {
  try {
    settingsStore.loadSettings()
    
    // 更新本地设置
    settings.value = {
      general: settingsStore.general,
      bluetooth: settingsStore.bluetooth,
      bluetoothServices: settingsStore.bluetoothServices || {
        mainService: '0000fe60-0000-1000-8000-00805f9b34fb',
        writeCharacteristic: '0000fe61-0000-1000-8000-00805f9b34fb',
        notifyCharacteristic: '0000fe62-0000-1000-8000-00805f9b34fb'
      },
      scanFilters: settingsStore.scanFilters || {
        nameFilters: ['ecv02']
      }
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

// 检查更新
const checkForUpdates = () => {
  updateStatus.checking = true
  updateStatus.error = null
  updateStatus.available = false
  updateStatus.downloading = false
  updateStatus.progress = 0
  
  // 调用 updater store 的检查更新方法
  updaterStore.checkForUpdates()
}

// 下载更新
const downloadUpdate = () => {
  updaterStore.downloadUpdate()
}

// 安装更新
const installUpdate = () => {
  updaterStore.installUpdate()
}

// 添加过滤名称
const addFilterName = () => {
  settings.value.scanFilters.nameFilters.push('')
}

// 移除过滤名称
const removeFilterName = (index) => {
  if (settings.value.scanFilters.nameFilters.length > 1) {
    settings.value.scanFilters.nameFilters.splice(index, 1)
    saveSettings()
  }
}

// 重置设置
const clearSettings = () => {
  ElMessageBox.confirm('确定要重置所有设置吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then(() => {
    settingsStore.resetSettings()
    // 更新本地设置
    settings.value = {
      general: settingsStore.general,
      bluetooth: settingsStore.bluetooth,
      bluetoothServices: settingsStore.bluetoothServices || {
        mainService: '0000fe60-0000-1000-8000-00805f9b34fb',
        writeCharacteristic: '0000fe61-0000-1000-8000-00805f9b34fb',
        notifyCharacteristic: '0000fe62-0000-1000-8000-00805f9b34fb'
      },
      scanFilters: settingsStore.scanFilters || {
        nameFilters: ['ecv02']
      }
    }
    ElMessage.success('所有设置已重置')
  }).catch(() => {
    // 用户点击取消，不执行任何操作
  })
}

// 组件挂载时加载设置
onMounted(() => {
  loadSettings()
  
  // 初始化 updater store
  updaterStore.init()
  
  // 获取当前版本号
  appVersion.value = updaterStore.currentVersion || '1.0.0'
  
  // 监听更新事件
  window.ipcRenderer.on('update-available', (info) => {
    updateStatus.checking = false
    updateStatus.available = true
    updateStatus.latestVersion = info.version
    updateStatus.error = null
    ElMessage.info(`发现新版本: ${info.version}`)
  })
  
  window.ipcRenderer.on('download-progress', (progress) => {
    updateStatus.downloading = true
    updateStatus.progress = progress.percent || 0
  })
  
  window.ipcRenderer.on('update-downloaded', (info) => {
    updateStatus.downloading = false
    updateStatus.progress = 100
    ElMessage.success('更新已下载完成')
  })
  
  window.ipcRenderer.on('update-error', (error) => {
    updateStatus.checking = false
    updateStatus.downloading = false
    updateStatus.error = error.message || error
    ElMessage.error(`更新失败: ${updateStatus.error}`)
  })
  
  window.ipcRenderer.on('update-not-available', (info) => {
    updateStatus.checking = false
    ElMessage.success('当前已是最新版本')
  })
})

// 组件卸载时保存设置
onUnmounted(() => {
  saveSettings()
  // 清理 updater store 事件监听器
  updaterStore.cleanup()
  
  // 清理当前组件的事件监听器
  window.ipcRenderer.removeAllListeners('update-available')
  window.ipcRenderer.removeAllListeners('download-progress')
  window.ipcRenderer.removeAllListeners('update-downloaded')
  window.ipcRenderer.removeAllListeners('update-error')
  window.ipcRenderer.removeAllListeners('update-not-available')
})
</script>

<template>
  <div class="h-full bg-gradient-to-br from-[#0f172a] to-[#1e293b] flex justify-center overflow-y-auto">
    <div  class="w-full h-fit max-w-2xl py-6 space-y-6">
      <h2 class="text-2xl font-light text-white mb-6">设置</h2>

      <!-- 蓝牙服务设置 -->
      <div class="glass-panel rounded-xl overflow-hidden">
        <div class="px-6 py-3 border-b border-white/5 text-xs font-semibold text-slate-500 uppercase">蓝牙服务设置</div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs text-slate-400 mb-1">主服务 UUID</label>
            <input 
              type="text" 
              v-model="settings.bluetoothServices.mainService"
              placeholder="例如: 0000ffe0-0000-1000-8000-00805f9b34fb"
              class="w-full bg-slate-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              @change="saveSettings"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">写入特征 UUID</label>
            <input 
              type="text" 
              v-model="settings.bluetoothServices.writeCharacteristic"
              placeholder="例如: 0000ffe1-0000-1000-8000-00805f9b34fb"
              class="w-full bg-slate-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              @change="saveSettings"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">监听特征 UUID</label>
            <input 
              type="text" 
              v-model="settings.bluetoothServices.notifyCharacteristic"
              placeholder="例如: 0000ffe2-0000-1000-8000-00805f9b34fb"
              class="w-full bg-slate-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              @change="saveSettings"
            />
          </div>
        </div>
      </div>

      <!-- 扫描名称过滤 -->
      <div class="glass-panel rounded-xl overflow-hidden">
        <div class="px-6 py-3 border-b border-white/5 text-xs font-semibold text-slate-500 uppercase">扫描名称过滤</div>
        <div class="p-6 space-y-4">
          <div class="space-y-2">
            <div v-for="(name, index) in settings.scanFilters.nameFilters" :key="index" class="flex items-center gap-2">
              <input 
                type="text" 
                v-model="settings.scanFilters.nameFilters[index]"
                placeholder="设备名称或部分名称"
                class="flex-1 bg-slate-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                @change="saveSettings"
              />
            <el-icon class="text-red-400 hover:text-red-300 transition" @click="removeFilterName(index)"><Delete /></el-icon>
            </div>
            <button 
              class="w-full bg-slate-800/30 border border-dashed border-white/10 rounded-md px-3 py-2 text-sm text-slate-400 hover:text-white transition"
              @click="addFilterName"
            >
              添加过滤名称
            </button>
          </div>
        </div>
      </div>
      


      <!-- 关于 -->
      <div class="glass-panel rounded-xl overflow-hidden">
        <div class="p-6">
          <!-- 更新进度条 -->
          <div v-if="updateStatus.downloading" class="mb-4">
            <div class="text-xs text-slate-500 mb-1">下载进度: {{ updateStatus.progress }}%</div>
            <div class="w-full bg-slate-800 rounded-full h-1.5">
              <div 
                class="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                :style="{ width: `${updateStatus.progress}%` }"
              ></div>
            </div>
          </div>
          
          <!-- 新版本可用提示 -->
          <div v-if="updateStatus.available && !updateStatus.downloading" class="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-md">
            <div class="text-xs text-blue-400">发现新版本: {{ updateStatus.latestVersion }}</div>
            <button 
              class="mt-2 border-none px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md transition"
              @click="downloadUpdate"
            >
              下载更新
            </button>
          </div>
          
          <div class="flex items-center justify-between p-2">
            <div>
              <div class="text-sm font-medium text-white">Bluetooth Tool</div>
              <div class="text-xs text-slate-500">Version {{ appVersion }} (Build {{ buildTime }})</div>
            </div>
            <div class="flex gap-3">
              <button 
                class="border-none px-5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md transition"
                :disabled="updateStatus.checking || updateStatus.downloading"
                @click="checkForUpdates"
              >
                {{ updateStatus.checking ? '检查中...' : updateStatus.downloading ? '下载中...' : '检查更新' }}
              </button>
              <button 
                class="border-none px-5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-md transition"
                @click="clearSettings"
              >
                重置设置
              </button>
            </div>
          </div>
          
          <!-- 更新错误提示 -->
          <div v-if="updateStatus.error" class="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md text-xs text-red-400">
            更新失败: {{ updateStatus.error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* 基础样式 */
.h-full {
  height: 100%;
}

.bg-gradient-to-br {
  background: linear-gradient(135deg, var(--bg-body), var(--bg-gradient-end));
}

.from-\[\#0f172a\] {
  --bg-body: #0f172a;
}

.to-\[\#1e293b\] {
  --bg-gradient-end: #1e293b;
}

.flex {
  display: flex;
}

.justify-center {
  justify-content: center;
}

.overflow-y-auto {
  overflow-y: auto;
}

.w-full {
  width: 100%;
}

.max-w-2xl {
  max-width: 42rem;
}

.pt-4 {
  padding-top: 1rem;
}

.pb-10 {
  padding-bottom: 2.5rem;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.text-2xl {
  font-size: 1.5rem;
  line-height: 2rem;
}

.font-light {
  font-weight: 300;
}

.text-white {
  color: #ffffff;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.rounded-xl {
  border-radius: 0.75rem;
}

.overflow-hidden {
  overflow: hidden;
}

.px-6 {
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.py-3 {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

.border-b {
  border-bottom: 1px solid;
}

.border-white\/5 {
  border-color: rgba(255, 255, 255, 0.05);
}

.text-xs {
  font-size: 0.75rem;
  line-height: 1rem;
}

.font-semibold {
  font-weight: 600;
}

.text-slate-500 {
  color: #64748b;
}

.uppercase {
  text-transform: uppercase;
}

.p-6 {
  padding: 1.5rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.block {
  display: block;
}

.text-slate-400 {
  color: #94a3b8;
}

.mb-1 {
  margin-bottom: 0.25rem;
}

.w-full {
  width: 100%;
}

.bg-slate-800\/50 {
  background-color: rgba(30, 41, 59, 0.5);
}

.border {
  border: 1px solid;
}

.border-white\/10 {
  border-color: rgba(255, 255, 255, 0.1);
}

.rounded-md {
  border-radius: 0.375rem;
}

.px-3 {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.focus\:outline-none:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.focus\:ring-2:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.focus\:ring-blue-500:focus {
  --tw-ring-color: #3b82f6;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}

.flex-1 {
  flex: 1 1 0%;
}

.w-8 {
  width: 2rem;
}

.h-8 {
  height: 2rem;
}

.items-center {
  align-items: center;
}

.gap-2 {
  gap: 0.5rem;
}

.text-red-400 {
  color: #f87171;
}

.hover\:text-red-300:hover {
  color: #fca5a5;
}

.transition {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.cursor-pointer {
  cursor: pointer;
}

.bg-slate-800\/30 {
  background-color: rgba(30, 41, 59, 0.3);
}

.border-dashed {
  border-style: dashed;
}

.hover\:text-white:hover {
  color: #ffffff;
}

.mb-4 {
  margin-bottom: 1rem;
}

.h-1\.5 {
  height: 0.375rem;
}

.bg-blue-600 {
  background-color: #2563eb;
}

.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.justify-between {
  justify-content: space-between;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.font-medium {
  font-weight: 500;
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.py-1 {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.bg-blue-600 {
  background-color: #2563eb;
}

.hover\:bg-blue-500:hover {
  background-color: #3b82f6;
}

.bg-red-600 {
  background-color: #dc2626;
}

.hover\:bg-red-500:hover {
  background-color: #ef4444;
}

.mt-4 {
  margin-top: 1rem;
}

.bg-red-900\/20 {
  background-color: rgba(127, 29, 29, 0.2);
}

.border-red-500\/30 {
  border-color: rgba(239, 68, 68, 0.3);
}

.text-red-400 {
  color: #f87171;
}

/* 磨砂效果 */
.glass-panel {
  background: #192335;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 滚动条 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>