<script setup>
import { ref, reactive, onMounted, toRaw, onBeforeUnmount, computed } from 'vue'
import { Delete, Refresh, Pointer } from '@element-plus/icons-vue'
import { ElMessage as Toast } from 'element-plus'
import jsQR from 'jsqr'
// 导入pinia store
import { useBluetoothStore } from '../../stores/bluetooth'
// 导入蓝牙协议工具函数
import { buildReadRealtimeDataCmd, parseReadRealtimeDataResponse, parseDeviceStatus, buildOpenValveCmd, buildCloseValveCmd } from '../../utils/bleProtocol'
// 导入UUID转换工具函数
import { convertTo128BitUUID } from '../../utils/common'

// 设备录入相关数据
const currentTab = ref('scan')
const testStarted = ref(false)
const testCompleted = ref(false)

// 扫描模式
const scanModes = ref([
  { id: 'camera', label: '摄像头扫描', icon: 'icon-ri-camera-lens-line' },
  { id: 'gun', label: '扫码枪输入', icon: 'icon-ri-barcode-box-line' },
  { id: 'ble', label: '广播扫描', icon: 'icon-ri-radar-line' }
])
const currentScanMode = ref('camera')

// 导入pinia store
const bluetoothStore = useBluetoothStore()

// 设备列表
const devices = ref([])

// 蓝牙扫描相关数据
const barcodeInput = ref('')
const barcodeDebounceTimer = ref(null)

// 摄像头相关数据
const cameraVideo = ref(null)
const qrCanvas = ref(null)
const isCameraActive = ref(false)
let mediaStream = null
let qrDetectionInterval = null

// 蓝牙扫描
const scan = async () => {
  bluetoothStore.startScan()
}

// 停止扫描
const stopScan = () => {
  bluetoothStore.stopScan()
}

// 添加设备到队列
const addDeviceToQueue = (device) => {
  // 检查设备是否已在队列中
  const existingDevice = devices.value.find(d => d.id === device.id)
  if (existingDevice) {
    Toast.info('该设备已在录入队列中')
    return
  }
  
  // 添加设备到队列
  const newDevice = {
    ...device,
    connected: false,
    connecting: false,
    testCompleted: false
  }
  
  devices.value.push(newDevice)
  
  // 使用pinia store添加设备
  bluetoothStore.addDevice(newDevice)
  
  Toast.success('设备已添加到录入队列')
}

// 清空设备队列
const clearDevicesQueue = () => {
  devices.value = []
  bluetoothStore.clearDevices()
  Toast.info('录入队列已清空')
}

// 开始测试
const startTest = () => {
  if (devices.value.length === 0) {
    Toast.info('请先录入设备')
    return
  }
  
  testStarted.value = true
  testCompleted.value = false
  
  // 使用pinia store设置测试队列
  bluetoothStore.setTestQueue(devices.value)
  
  // 跳转到测试页面
  window.location.href = '#/test'
  
  console.log('开始测试', devices.value)
}

// 处理扫码枪输入
const handleBarcodeInput = () => {
  // 扫码枪通常会快速输入完整的条码并以Enter键结束
  // 添加防抖处理，确保完整接收条码
  if (barcodeDebounceTimer.value) {
    clearTimeout(barcodeDebounceTimer.value)
  }
  
  barcodeDebounceTimer.value = setTimeout(() => {
    // 如果用户没有按Enter键，但输入停止了，也可以尝试解析
    if (barcodeInput.value.trim()) {
      handleBarcodeEnter()
    }
  }, 300) // 300ms防抖时间，根据实际扫码枪调整
}

// 处理扫码枪输入完成（Enter键）
const handleBarcodeEnter = () => {
  if (barcodeInput.value.trim()) {
    const barcode = barcodeInput.value.trim()
    console.log('扫码枪输入完成:', barcode)
    
    // 解析条码数据并创建设备对象
    // 假设条码格式为：设备名称_设备ID_MAC地址
    // 例如：Device1_123456_00:11:22:33:44:55
    const barcodeParts = barcode.split(',')
    let device = null
    
    if (barcodeParts.length === 3) {
      // 完整格式的条码
      device = {
        id: barcodeParts[0].slice(5),
        tableId: `C${barcodeParts[2]}`,
        imei: barcodeParts[2],
        name: barcodeParts[1],
        mac: barcodeParts[0].slice(5).match(/.{2}/g).join(':'),
        connected: false,
        rssi: -60 // 默认RSSI值
      }
    } else {
      barcodeInput.value = ''
      return Toast.info('条码格式错误，请检查')
    }
    // 添加设备到队列
    addDeviceToQueue(device)
    
    // 清空输入框
    barcodeInput.value = ''
  }
}

// 二维码检测
const detectQRCode = () => {
  if (!cameraVideo.value || !qrCanvas.value || !isCameraActive.value) return
  
  const canvas = qrCanvas.value
  const context = canvas.getContext('2d')
  
  // 设置canvas尺寸与video一致
  canvas.width = cameraVideo.value.videoWidth
  canvas.height = cameraVideo.value.videoHeight
  
  // 绘制视频帧到canvas
  context.drawImage(cameraVideo.value, 0, 0, canvas.width, canvas.height)
  
  // 获取图像数据
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  
  // 检测二维码
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  })
  
  if (code) {
    // 停止检测
    if (qrDetectionInterval) {
      clearInterval(qrDetectionInterval)
      qrDetectionInterval = null
    }
    
    // 解析二维码内容
    parseQRCodeContent(code.data)
  }
}

// 解析二维码内容
const parseQRCodeContent = (content) => {
  console.log('扫描到二维码:', content)
  
  // 检查是否有未完成的测试
  if (testStarted.value) {
    Toast.info('当前测试尚未完成，请先完成测试或删除所有设备后再录入新设备')
    // 关闭摄像头
    startCamera()
    return
  }
  
  // 验证二维码格式：ecv02ec308e52b393,C001202511181700,861606086013598
  // 格式要求：以ecv02开头，包含蓝牙头、设备mac、产品编号、imei，用逗号分隔
  const qrPattern = /^ecv02([0-9a-fA-F]{12}),([A-Z0-9]+),([0-9]+)$/
  const match = content.match(qrPattern)
  
  if (match) {
    // 提取信息
    const bluetoothHeader = 'ecv02'
    const id = match[1]
    const deviceMac = match[1].match(/.{2}/g).join(':')
    const productId = match[2]
    const imei = match[3]
    
    // 创建设备对象
    const device = {
      id, // 使用mac地址作为设备ID
      name: productId,
      imei,
      tableId: `C${imei}`,
      mac: deviceMac,
      connected: false,
      rssi: -60 // 默认RSSI值
    }
    console.log('解析成功:', device)
    // 添加设备到队列
    addDeviceToQueue(device)
    
    // 关闭摄像头
    startCamera()
    
    // 提示成功
    Toast.success(`设备录入成功！\n产品编号：${productId}\nMAC地址：${deviceMac}`)
  } else {
    // 格式不符合要求
    console.error('二维码格式不正确')
    Toast.error('二维码格式不正确，请扫描正确的设备二维码。\n\n正确格式示例：ecv02ec308e52b393,C001202511181700,861606086013598')
    return
  }
}

// 开启/关闭摄像头
const startCamera = async () => {
  try {
    if (isCameraActive.value) {
      // 关闭摄像头
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
          track.stop()
        })
        mediaStream = null
      }
      
      // 停止二维码检测
      if (qrDetectionInterval) {
        clearInterval(qrDetectionInterval)
        qrDetectionInterval = null
      }
      
      isCameraActive.value = false
      console.log('摄像头已关闭')
    } else {
      // 开启摄像头
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // 优先使用后置摄像头
          width: 640,
          height: 480
        },
        audio: false
      })
      
      if (cameraVideo.value) {
        cameraVideo.value.srcObject = mediaStream
        isCameraActive.value = true
        console.log('摄像头已开启')
        
        // 启动二维码检测
        if (!qrDetectionInterval) {
          qrDetectionInterval = setInterval(detectQRCode, 300)
        }
      }
    }
  } catch (error) {
    console.error('摄像头操作失败:', error)
    Toast.error('无法访问摄像头，请检查权限设置')
  }
}

// 清理摄像头资源
const cleanupCamera = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => {
      track.stop()
    })
    mediaStream = null
  }
  
  // 停止二维码检测
  if (qrDetectionInterval) {
    clearInterval(qrDetectionInterval)
    qrDetectionInterval = null
  }
  
  isCameraActive.value = false
}

// 组件挂载时初始化蓝牙
onMounted(() => {
  bluetoothStore.initBluetooth()
})

// 组件卸载时清理资源
onBeforeUnmount(() => {
  stopScan()
  cleanupCamera()
})
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- 1. 主布局 -->
    <!-- <main class="flex-1 flex overflow-hidden relative"> -->
      <!-- 内容区域 -->
      <section class="flex-1 bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-6 overflow-hidden relative">
        <!-- PAGE 1: 设备录入 (多种模式) -->
        <div class="h-full flex flex-col gap-6 max-w-6xl mx-auto overflow-hidden">
          <!-- 录入模式切换 Tab -->
          <div class="flex justify-center">
            <div class="bg-slate-800/50 p-1 rounded-lg flex gap-1 border border-solid border-white/5 backdrop-blur">
              <button v-for="mode in scanModes" :key="mode.id" @click="currentScanMode = mode.id"
                class="border-none px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
                :class="currentScanMode === mode.id ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 bg-transparent'">
                <i :class="['iconfont', mode.icon]"></i> {{ mode.label }}
              </button>
            </div>
          </div>

          <div class="flex-1 flex gap-6 overflow-hidden">
            <!-- 左侧：操作区 -->
            <div
              class="flex-1 glass-panel rounded-2xl p-6 relative flex flex-col items-center justify-center border-t border-white/10">
              <!-- Mode A: 摄像头 -->
              <div v-if="currentScanMode === 'camera'" class="text-center w-full max-w-md">
                <div
                  class="flex-1 glass-panel rounded-2xl p-1 flex flex-col items-center justify-center relative overflow-hidden group">
                  <div class="absolute inset-0 bg-black/40 z-0"></div>

                  <!-- 摄像头画面 -->
                  <div
                    class=" mt-2 relative z-10 w-64 h-64 border-2 border-blue-500/50 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                    <video ref="cameraVideo" class="w-full h-full object-cover opacity-100" autoplay></video>
                    <canvas ref="qrCanvas" class="absolute top-0 left-0 w-full h-full opacity-0"></canvas>
                    <!-- 扫描线动画 -->
                    <div v-if="isCameraActive" class="absolute left-0 w-full h-0.5 bg-blue-400 shadow-[0_0_10px_#60a5fa] scan-line"></div>
                    <div class="absolute inset-0 border-[30px] border-black/30"></div>
                    <i
                      class="ri-focus-3-line absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/20 text-6xl"></i>
                  </div>

                  <div class="z-10 my-4 text-center">
                    <h2 class="text-xl font-semibold text-white mb-2">扫描设备二维码</h2>
                    <p class="text-slate-400 text-sm">将设备二维码对准框内，系统将自动识别并连接</p>
                    <button @click="startCamera"
                      class="border-none mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-600/20 flex items-center gap-2 mx-auto">
                      <i class="iconfont icon-ri-camera-lens-line"></i>{{ isCameraActive ? '关闭摄像头' : '开启摄像头' }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Mode B: 扫码枪 -->
              <div v-if="currentScanMode === 'gun'" class="text-center w-full max-w-lg">
                <div class="mb-8">
                  <div
                    class="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
                    <i class="iconfont icon-ri-barcode-box-line text-5xl"></i>
                  </div>
                  <h2 class="text-xl font-medium text-white">等待扫码枪输入...</h2>
                  <p class="text-slate-500 text-sm mt-2">请确保输入框处于聚焦状态，扫描后自动录入</p>
                </div>
                <div class="relative outline-none group">
                  <input type="text" placeholder="在此处接收扫码数据" 
                    class="w-full bg-slate-800/50 border-2 border-slate-700 rounded-xl px-5 py-4 text-lg text-white outline-none transition shadow-inner text-center code-font placeholder-slate-600"
                    autofocus
                    v-model="barcodeInput"
                    @input="handleBarcodeInput"
                    @keypress.enter="handleBarcodeEnter">
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <i class="ri-corner-down-left-line"></i> Enter
                  </div>
                </div>
              </div>

              <!-- Mode C: 广播扫描 -->
              <div v-if="currentScanMode === 'ble'" class="w-full h-full flex flex-col">
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-slate-300">附近蓝牙设备</h3>
                  <div class="flex gap-2">
                    <button
                      class="border-none text-xs bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded flex items-center gap-1 text-white transition" 
                      @click="stopScan"
                      v-if="bluetoothStore.isScanning">
                      停止扫描
                    </button>
                    <button
                      class="border-none text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded flex items-center gap-1 text-white transition" @click="scan">
                      <el-icon><Refresh /></el-icon> {{ bluetoothStore.isScanning ? '扫描中...' : '刷新列表' }}
                    </button>
                  </div>
                </div>
                <div class="flex-1 overflow-y-auto space-y-2 pr-2">
                  <div v-if="bluetoothStore.bluetoothDevices.length === 0" class="flex items-center justify-center h-full text-slate-500 text-sm">
                    {{ bluetoothStore.isScanning ? '正在搜索...' : '点击刷新列表搜索设备' }}
                  </div>
                  <div v-for="device in bluetoothStore.bluetoothDevices" :key="device.id"
                    class="p-3 bg-slate-800/40 rounded-lg border border-white/5 flex justify-between items-center hover:bg-slate-700/50 transition cursor-pointer group">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-400">
                        <i class="iconfont icon-bluetooth-line"></i>
                      </div>
                      <div>
                        <div class="text-sm text-slate-200 font-medium">{{ device.name }}</div>
                        <div class="text-xs text-slate-500 code-font">{{ device.mac }}</div>
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
                        <span class="text-[10px] text-slate-500">{{ device.rssi }} dBm</span>
                      </div>
                      <button
                        class="border-none px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded hover:bg-blue-500 hover:text-white transition" @click="addDeviceToQueue(device)">
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
                <button class="rounded-md w-12 h-6 border-none text-xs text-blue-400 hover:text-blue-300" @click="clearDevicesQueue">清空</button>
              </div>
              <div class="flex-1 overflow-y-auto space-y-2">
                <div v-for="dev in devices" :key="dev.id"
                  class="p-3 bg-slate-800/80 rounded-lg flex items-center gap-3 relative group overflow-hidden">
                  <div class="w-1 bg-blue-500 absolute left-0 top-0 bottom-0"></div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm text-white truncate">{{ dev.name }}</div>
                    <div class="text-xs text-slate-500 truncate code-font mt-0.5">
                      {{ dev.mac }}
                    </div>
                  </div>
                  <el-icon class="text-white hover:text-red-400 transition" @click="devices.splice(devices.indexOf(dev), 1)"><Delete /></el-icon>
                </div>
              </div>
              <button
                class="border-none mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm transition shadow-lg shadow-blue-900/20"
                @click="startTest">
                开始测试 
                <el-icon ml-1 align-bottom><Pointer /></el-icon>
              </button>
            </div>
          </div>
        </div>
      </section>
    <!-- </main> -->
  </div>
</template>

<style lang="scss" scoped>
.glass-panel {
  background: #192335;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.scan-line {
  animation: scan 2s linear infinite;
}

@keyframes scan {
  0% {
    top: 0;
  }
  50% {
    top: calc(100% - 2px);
  }
  100% {
    top: 0;
  }
}

.code-font {
  font-family: 'JetBrains Mono', monospace;
}
</style>