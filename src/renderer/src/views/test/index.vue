<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage as Toast } from 'element-plus'
import { Delete, Pointer } from '@element-plus/icons-vue'
// 导入pinia store
import { useBluetoothStore } from '../../stores/bluetooth'
import { useSettingsStore } from '../../stores/settings'

// 使用pinia store
const bluetoothStore = useBluetoothStore()
const settingsStore = useSettingsStore()

// 设备列表
const devices = computed(() => bluetoothStore.devices)

// 测试状态
const testStarted = ref(true)
const testCompleted = ref(false)

// 测试统计数据
const testStats = reactive({
  testProgress: 0,
  totalDevices: computed(() => devices.value.length),
  connectedDevices: computed(() => devices.value.filter(d => d.connected).length)
})

// 更新测试进度
const updateTestProgress = () => {
  if (devices.value.length === 0) {
    testStats.testProgress = 0
    return
  }
  const connectedCount = devices.value.filter(d => d.connected).length
  testStats.testProgress = Math.round((connectedCount / devices.value.length) * 100)
}

// 设备操作函数
const reconnectDevice = async (dev) => {
  // 更新设备状态
  bluetoothStore.$patch(state => {
    const updatedDevice = state.devices.find(d => d.id === dev.id)
    if (updatedDevice) {
      updatedDevice.connecting = true
      updatedDevice.connected = false
    }
  })
  
  try {
    // 实际连接设备
    await connectDevice(dev)
    
    bluetoothStore.$patch(state => {
      const updatedDevice = state.devices.find(d => d.id === dev.id)
      if (updatedDevice) {
        updatedDevice.connecting = false
        updatedDevice.connected = true
        updatedDevice.dataTime = new Date().toLocaleTimeString()
      }
    })
    
    updateTestProgress()
    Toast.success(`${dev.name} 重新连接成功`)
  } catch (error) {
    console.error(`连接设备 ${dev.name} 失败:`, error)
    
    bluetoothStore.$patch(state => {
      const updatedDevice = state.devices.find(d => d.id === dev.id)
      if (updatedDevice) {
        updatedDevice.connecting = false
        updatedDevice.connected = false
        updatedDevice.testResult = 'failed'
      }
    })
    
    updateTestProgress()
    Toast.error(`${dev.name} 重新连接失败`)
  }
}

// 连接设备 - 使用bluetoothStore的connectDevice方法
const connectDevice = async (device) => {
  try {
    await bluetoothStore.connectDevice(device)
  } catch (error) {
    console.error(`连接设备 ${device.name} 失败:`, error)
    throw error
  }
}

// 开阀操作 - 使用bluetoothStore的openValve方法
const openValve = (dev) => {
  if (!dev.connected) {
    return Toast.warning('设备未连接，无法操作')
  }
  
  bluetoothStore.openValve(dev)
}

// 关阀操作 - 使用bluetoothStore的closeValve方法
const closeValve = (dev) => {
  if (!dev.connected) {
    return Toast.warning('设备未连接，无法操作')
  }
  
  bluetoothStore.closeValve(dev)
}

// 断开设备连接 - 使用bluetoothStore的disconnectDevice方法
const disconnectDevice = (dev) => {
  if (!dev.connected) {
    return Toast.warning('设备未连接')
  }
  
  bluetoothStore.disconnectDevice(dev)
  updateTestProgress()
}

const completeDeviceTest = (dev) => {
  if (!dev.connected) {
    return Toast.warning('设备未连接，无法完成测试')
  }
  Toast.success(`${dev.name} 测试完成`)
}

// 移除设备 - 使用bluetoothStore的removeDevice方法
const removeDevice = (dev) => {
  bluetoothStore.removeDevice(dev)
  updateTestProgress()
  Toast.info(`${dev.name} 已从测试列表中移除`)
}

// 断开所有设备连接 - 使用bluetoothStore的disconnectAllDevices方法
const disconnectAllDevices = () => {
  bluetoothStore.disconnectAllDevices()
  updateTestProgress()
  Toast.info('所有设备已断开连接')
}

const completeTest = () => {
  const allConnected = devices.value.every(d => d.connected)
  if (!allConnected) {
    return Toast.warning('存在未连接设备，无法完成测试')
  }
  Toast.success('所有设备测试完成')
}

// 组件挂载时自动连接所有设备
onMounted(() => {
  // 自动连接所有设备
  devices.value.forEach(device => {
    if (!device.connected && !device.connecting) {
      reconnectDevice(device)
    }
  })
})
</script>

<template>
  <div class="h-full flex flex-col">
    <main class="flex-1 bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-6 overflow-hidden relative">
      <!-- 装饰背景 -->
      <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div class="max-w-6xl mx-auto h-full flex flex-col gap-4">
        <!-- 顶部状态栏 -->
        <div class="h-16 glass-panel rounded-xl flex items-center px-6 justify-between">
          <div class="flex gap-8">
            <div>
              <div class="text-xs text-slate-500">测试进度</div>
              <div class="text-lg font-semibold text-blue-400">{{ testStats.testProgress }}%</div>
            </div>
            <div>
              <div class="text-xs text-slate-500">测试数量</div>
              <div class="text-lg font-semibold text-purple-400">{{ testStats.totalDevices }}</div>
            </div>
            <div>
              <div class="text-xs text-slate-500">已连接</div>
              <div class="text-lg font-semibold text-green-400">{{ testStats.connectedDevices }}</div>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition"
              :disabled="devices.length === 0 || !devices.every(d => d.connected)"
              :class="{ 'opacity-50 cursor-not-allowed': devices.length === 0 || !devices.every(d => d.connected) }">导出报告</button>
            <button
              class="px-4 py-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white text-xs rounded transition border border-purple-500/20"
              @click="disconnectAllDevices"
              :disabled="devices.length === 0 || !devices.every(d => d.connected)"
              :class="{ 'opacity-50 cursor-not-allowed': devices.length === 0 || !devices.every(d => d.connected) }">断开所有蓝牙</button>
            <button
              class="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white text-xs rounded transition border border-red-500/20"
              :disabled="devices.length === 0 || !devices.every(d => d.connected)"
              :class="{ 'opacity-50 cursor-not-allowed': devices.length === 0 || !devices.every(d => d.connected) }">停止所有</button>
            <button
              class="px-4 py-2 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white text-xs rounded transition border border-green-500/20"
              @click="completeTest"
              :disabled="devices.length === 0 || !devices.every(d => d.connected)"
              :class="{ 'opacity-50 cursor-not-allowed': devices.length === 0 || !devices.every(d => d.connected) }">完成测试</button>
          </div>
        </div>

        <!-- 设备卡片列表 -->
        <div class="flex-1 overflow-y-auto space-y-3 pb-4">
          <div v-for="dev in devices" :key="dev.id"
            class="glass-panel bg-slate-800/60 rounded-xl p-4 border border-white/5 hover:border-blue-500/30 transition flex flex-col md:flex-row items-center justify-between gap-4">
            <!-- 设备基本信息 -->
            <div class="flex flex-col gap-2 flex-1 min-w-0">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-3 h-3 rounded-full"
                  :class="dev.connecting ? 'bg-yellow-500 animate-pulse' : dev.connected ? 'bg-green-500 animate-pulse' : 'bg-slate-500'">
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-semibold text-white truncate">{{ dev.name }}</div>
                  <div class="text-xs text-slate-400 truncate">{{ dev.mac }}</div>
                </div>
                <div class="flex items-center gap-2 whitespace-nowrap mr-6">
                  <div class="text-xs font-medium text-slate-300">
                    {{ dev.connected ? '已连接' : dev.connecting ? '连接中' : '未连接' }}
                  </div>
                  <!-- 数据时间 - 仅在连接状态下显示 -->
                  <div v-if="dev.connected" class="text-xs text-slate-400">
                    {{ dev.dataTime || '--' }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 设备详细数据 -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 min-w-0">
              <div class="text-xs text-slate-400 whitespace-nowrap">
                <div class="text-slate-300 font-medium">阀门</div>
                <div class="text-white">{{ dev.valveStatus || '--' }}</div>
              </div>
              <div class="text-xs text-slate-400 whitespace-nowrap">
                <div class="text-slate-300 font-medium">温度</div>
                <div class="text-white">{{ dev.temperature || '--' }}°C</div>
              </div>
              <div class="text-xs text-slate-400 whitespace-nowrap">
                <div class="text-slate-300 font-medium">压力</div>
                <div class="text-white">{{ dev.pressure !== null ? dev.pressure : '--' }} kPa</div>
              </div>
              <div class="text-xs text-slate-400 whitespace-nowrap">
                <div class="text-slate-300 font-medium">流量</div>
                <div class="text-white">{{ dev.flow || '--' }} Nm³/h</div>
              </div>
              <div class="text-xs text-slate-400 whitespace-nowrap">
                <div class="text-slate-300 font-medium">电压</div>
                <div class="text-white">{{ dev.batteryVoltage || '--' }} V</div>
              </div>
              <div class="text-xs text-slate-400 whitespace-nowrap">
                <div class="text-slate-300 font-medium">超流</div>
                <div :class="dev.overFlow ? 'text-red-300 font-medium' : 'text-green-300 font-medium'">
                  {{ dev.overFlow ? '检测到' : '正常' }}
                </div>
              </div>
              <div class="text-xs text-slate-400 whitespace-nowrap">
                <div class="text-slate-300 font-medium">横流</div>
                <div :class="dev.crossFlow ? 'text-red-300 font-medium' : 'text-green-300 font-medium'">
                  {{ dev.crossFlow ? '检测到' : '正常' }}
                </div>
              </div>
              <div class="text-xs text-slate-400 whitespace-nowrap">
                <div class="text-slate-300 font-medium">微流</div>
                <div :class="dev.microFlow ? 'text-red-300 font-medium' : 'text-green-300 font-medium'">
                  {{ dev.microFlow ? '检测到' : '正常' }}
                </div>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="grid grid-cols-3 grid-rows-2 gap-1.5 w-48 flex-shrink-0">
              <button
                class="py-1.5 px-1.5 bg-blue-600/30 text-blue-300 text-xs font-medium rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-200"
                @click="reconnectDevice(dev)">
                重连
              </button>
              <button
                class="py-1.5 px-1.5 bg-green-600/30 text-green-300 text-xs font-medium rounded-lg hover:bg-green-600 hover:text-white transition-all duration-200"
                @click="openValve(dev)"
                :disabled="!dev.connected"
                :class="{'opacity-50 cursor-not-allowed': !dev.connected}">
                开阀
              </button>
              <button
                class="py-1.5 px-1.5 bg-orange-600/30 text-orange-300 text-xs font-medium rounded-lg hover:bg-orange-600 hover:text-white transition-all duration-200"
                @click="closeValve(dev)"
                :disabled="!dev.connected"
                :class="{'opacity-50 cursor-not-allowed': !dev.connected}">
                关阀
              </button>
              <button
                class="py-1.5 px-1.5 bg-red-600/30 text-red-300 text-xs font-medium rounded-lg hover:bg-red-600 hover:text-white transition-all duration-200"
                @click="disconnectDevice(dev)"
                :disabled="!dev.connected"
                :class="{'opacity-50 cursor-not-allowed': !dev.connected}">
                断开
              </button>
              <button
                class="py-1.5 px-1.5 bg-purple-600/30 text-purple-300 text-xs font-medium rounded-lg hover:bg-purple-600 hover:text-white transition-all duration-200"
                @click="completeDeviceTest(dev)"
                :disabled="!dev.connected"
                :class="{'opacity-50 cursor-not-allowed': !dev.connected}">
                完成
              </button>
              <button
                class="py-1.5 px-1.5 bg-gray-600/30 text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-200"
                @click="removeDevice(dev)">
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style lang="scss" scoped>
:root {
  --bg-body: #0f172a;
  --glass-bg: rgba(30, 41, 59, 0.65);
  --glass-border: rgba(255, 255, 255, 0.08);
  --primary: #3b82f6;
  --text-main: #f8fafc;
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