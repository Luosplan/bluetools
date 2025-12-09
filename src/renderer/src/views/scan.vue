<script setup>
import { ref, reactive } from 'vue'

// 扫描模式
const scanModes = [
  { id: 'camera', label: '摄像头', icon: 'ri-camera-3-line' },
  { id: 'gun', label: '扫码枪', icon: 'ri-barcode-box-line' },
  { id: 'ble', label: '广播扫描', icon: 'ri-bluetooth-line' }
]
const currentScanMode = ref('ble')

// 模拟设备数据
const devices = reactive([])

// 窗口控制函数
const handleWin = (action) => {
  console.log('窗口控制:', action)
}
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- 1. 顶部标题栏 -->
    <header class="h-10 flex items-center justify-between glass-panel border-b-0 z-50 title-bar-drag select-none">
      <div class="flex items-center gap-3 px-4">
        <div class="w-5 h-5 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-md flex items-center justify-center">
          <i class="ri-bluetooth-line text-white text-xs"></i>
        </div>
        <span class="text-xs font-medium text-slate-300 tracking-wide">BLE Master Pro</span>
      </div>
      <div class="flex h-full no-drag">
        <div class="win-btn" title="最小化" @click="handleWin('min')"><i class="ri-subtract-line text-lg"></i></div>
        <div class="win-btn" title="最大化" @click="handleWin('max')"><i class="ri-checkbox-blank-line text-xs"></i></div>
        <div class="win-btn close" title="关闭" @click="handleWin('close')"><i class="ri-close-line text-lg"></i></div>
      </div>
    </header>

    <!-- 2. 主内容区域 -->
    <main class="flex-1 bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-6 overflow-hidden relative">
      <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div class="max-w-6xl mx-auto h-full flex flex-col gap-6">
        <!-- 录入模式切换 Tab -->
        <div class="flex justify-center">
          <div class="bg-slate-800/50 p-1 rounded-lg flex gap-1 border border-white/5 backdrop-blur">
            <button v-for="mode in scanModes" :key="mode.id"
              @click="currentScanMode = mode.id"
              class="px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
              :class="currentScanMode === mode.id ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'">
              <i :class="mode.icon"></i> {{ mode.label }}
            </button>
          </div>
        </div>

        <div class="flex-1 flex gap-6 overflow-hidden">
          <!-- 左侧：操作区 -->
          <div class="flex-1 glass-panel rounded-2xl p-6 relative flex flex-col items-center justify-center border-t border-white/10">
            <!-- Mode A: 摄像头 -->
            <div v-if="currentScanMode === 'camera'" class="text-center w-full max-w-md">
              <div class="relative aspect-square bg-black rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl mb-6 group">
                <img src="https://images.unsplash.com/photo-1595079676339-1534827d8c11?w=800&q=80" class="w-full h-full object-cover opacity-60">
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="w-48 h-48 border-2 border-blue-500 rounded-2xl relative animate-pulse">
                    <div class="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                    <div class="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                    <div class="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                    <div class="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
                  </div>
                </div>
              </div>
              <p class="text-slate-400 text-sm">请将设备二维码置于框内</p>
            </div>

            <!-- Mode B: 扫码枪 -->
            <div v-if="currentScanMode === 'gun'" class="text-center w-full max-w-lg">
              <div class="mb-8">
                <div class="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
                  <i class="ri-barcode-box-line text-5xl"></i>
                </div>
                <h2 class="text-xl font-medium text-white">等待扫码枪输入...</h2>
                <p class="text-slate-500 text-sm mt-2">请确保输入框处于聚焦状态，扫描后自动录入</p>
              </div>
              <div class="relative group">
                <input type="text" placeholder="在此处接收扫码数据" 
                  class="w-full bg-slate-800/50 border-2 border-slate-700 rounded-xl px-5 py-4 text-lg text-white outline-none focus:border-blue-500 focus:bg-slate-800 transition shadow-inner text-center code-font placeholder-slate-600"
                  autofocus>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <i class="ri-corner-down-left-line"></i> Enter
                </div>
              </div>
            </div>

            <!-- Mode C: 广播扫描 -->
            <div v-if="currentScanMode === 'ble'" class="w-full h-full flex flex-col">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-slate-300">附近蓝牙设备</h3>
                <button class="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded flex items-center gap-1 text-white transition">
                  <i class="ri-refresh-line"></i> 刷新列表
                </button>
              </div>
              <div class="flex-1 overflow-y-auto space-y-2 pr-2">
                <div v-for="n in 5" :key="n" class="p-3 bg-slate-800/40 rounded-lg border border-white/5 flex justify-between items-center hover:bg-slate-700/50 transition cursor-pointer group">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-400">
                      <i class="ri-bluetooth-line"></i>
                    </div>
                    <div>
                      <div class="text-sm text-slate-200 font-medium">Unknown_Device_{{n}}</div>
                      <div class="text-xs text-slate-500 code-font">E4:5F:01:3A:BB:0{{n}}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="flex flex-col items-end">
                      <div class="flex gap-0.5 items-end h-3">
                        <div class="w-1 bg-green-500 h-[40%] rounded-sm"></div>
                        <div class="w-1 bg-green-500 h-[60%] rounded-sm"></div>
                        <div class="w-1 bg-green-500 h-[80%] rounded-sm"></div>
                        <div class="w-1 bg-slate-600 h-full rounded-sm"></div>
                      </div>
                      <span class="text-[10px] text-slate-500">-68 dBm</span>
                    </div>
                    <button class="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded hover:bg-blue-500 hover:text-white transition">
                      添加
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：已录入队列 -->
          <div class="w-72 glass-panel rounded-2xl flex flex-col p-4 border-t border-white/10">
            <div class="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
              <span class="text-sm font-medium text-slate-300">录入队列 ({{ devices.length }})</span>
              <button class="text-xs text-blue-400 hover:text-blue-300">清空</button>
            </div>
            <div class="flex-1 overflow-y-auto space-y-2">
              <!-- 设备列表将动态生成 -->
            </div>
            <button class="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm transition shadow-lg shadow-blue-900/20">
              开始测试 <i class="ri-arrow-right-line ml-1 align-bottom"></i>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* @import url('https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'); */

:root {
  --bg-body: #0f172a;
  --glass-bg: rgba(30, 41, 59, 0.65);
  --glass-border: rgba(255, 255, 255, 0.08);
  --primary: #3b82f6;
  --text-main: #f8fafc;
}

/* 拖拽区域 */
.title-bar-drag { -webkit-app-region: drag; }
.no-drag { -webkit-app-region: no-drag; }

/* 磨砂效果 */
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--glass-border);
}

/* 滚动条 */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

/* 窗口控制按钮样式 */
.win-btn {
  height: 100%;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #94a3b8;
}
.win-btn:hover { background-color: rgba(255,255,255,0.1); color: white; }
.win-btn.close:hover { background-color: #ef4444; color: white; }

.code-font { font-family: 'JetBrains Mono', monospace; }
</style>