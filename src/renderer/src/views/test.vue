<script setup>
import { ref, reactive } from 'vue'

// 模拟设备数据
const devices = reactive([
  { id: 1, name: 'Device_001', mac: 'E4:5F:01:3A:BB:01', connected: true, rssi: -68 },
  { id: 2, name: 'Device_002', mac: 'E4:5F:01:3A:BB:02', connected: false, rssi: -72 },
  { id: 3, name: 'Device_003', mac: 'E4:5F:01:3A:BB:03', connected: true, rssi: -65 }
])

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
      <div class="h-full flex gap-4 max-w-6xl mx-auto">
        <div class="flex-1 flex flex-col gap-4">
          <!-- 顶部状态栏 -->
          <div class="h-16 glass-panel rounded-xl flex items-center px-6 justify-between">
            <div class="flex gap-8">
              <div>
                <div class="text-xs text-slate-500">连接成功率</div>
                <div class="text-lg font-semibold text-green-400">98.5%</div>
              </div>
              <div>
                <div class="text-xs text-slate-500">平均响应</div>
                <div class="text-lg font-semibold text-blue-400">42ms</div>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition">导出报告</button>
              <button class="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white text-xs rounded transition border border-red-500/20">停止所有</button>
            </div>
          </div>

          <!-- 设备卡片列表 -->
          <div class="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            <div v-for="dev in devices" :key="dev.id" class="bg-slate-800/40 rounded-xl p-4 border border-white/5 hover:border-blue-500/30 transition flex flex-col">
              <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full" :class="dev.connected ? 'bg-green-500 animate-pulse' : 'bg-slate-600'"></div>
                  <span class="text-sm font-medium text-slate-200">{{ dev.name }}</span>
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">RSSI {{ dev.rssi }}</span>
              </div>
              <!-- Log Preview -->
              <div class="flex-1 bg-slate-900/50 rounded p-2 mb-3 overflow-hidden relative">
                <div class="text-[10px] text-slate-500 code-font space-y-1">
                  <div class="text-green-500/70">> Connected</div>
                  <div>TX: 01 03 00 00</div>
                  <div class="text-blue-400">RX: 01 03 04 12</div>
                </div>
                <div class="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-slate-900/50 to-transparent"></div>
              </div>
              <div class="flex gap-2">
                <button class="flex-1 py-1.5 bg-blue-600/20 text-blue-400 text-xs rounded hover:bg-blue-600 hover:text-white transition">详细测试</button>
                <button class="px-2 py-1.5 bg-slate-700 text-slate-400 text-xs rounded hover:text-white"><i class="ri-settings-3-line"></i></button>
              </div>
            </div>
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