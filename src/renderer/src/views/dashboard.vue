<script setup>
const noble = require('@abandonware/noble')
import { ref, reactive, onMounted, toRaw, onBeforeUnmount } from 'vue'
import { Delete, Refresh, Pointer } from '@element-plus/icons-vue'
import jsQR from 'jsqr'
// 窗口控制函数
const handleWin = (action) => {
  // 在Electron环境中，这里应该调用主进程的窗口控制API
  console.log('窗口控制:', action)
}

// 更新相关状态
const updateStatus = ref({
  checking: false,
  available: false,
  downloading: false,
  progress: 0,
  error: null,
  info: null
})

// 检查更新
const checkForUpdates = () => {
  updateStatus.value.checking = true
  updateStatus.value.error = null
  updateStatus.value.progress = 0 // 开始检查更新时进度归零
  if (window.ipcRenderer) {
    window.ipcRenderer.send('check-for-updates')
  } else {
    updateStatus.value.checking = false
    updateStatus.value.error = '更新功能不可用'
  }
}

// 下载更新
const downloadUpdate = () => {
  updateStatus.value.downloading = true
  updateStatus.value.available = false // 关闭更新提示
  if (window.ipcRenderer) {
    window.ipcRenderer.send('download-update')
  } else {
    updateStatus.value.downloading = false
    updateStatus.value.error = '更新功能不可用，请重启应用'
  }
}

// 监听更新相关事件
if (window.ipcRenderer) {
  window.ipcRenderer.on('update-available', (event, info) => {
    updateStatus.value.checking = false
    updateStatus.value.available = true
    updateStatus.value.info = info
  })

  window.ipcRenderer.on('download-progress', (progress) => {
    updateStatus.value.progress = Math.round(progress.percent)
  })

  window.ipcRenderer.on('update-downloaded', (info) => {
    updateStatus.value.downloading = false
    updateStatus.value.available = false
    updateStatus.value.progress = 0 // 更新完成后进度归零
  })

  window.ipcRenderer.on('update-error', (error) => {
    updateStatus.value.checking = false
    updateStatus.value.downloading = false
    updateStatus.value.progress = 0 // 更新失败时进度归零
    updateStatus.value.error = error.message
  })
}

// 关闭更新提示
const closeUpdateNotification = () => {
  updateStatus.value.available = false
  updateStatus.value.info = null
}

// 导航标签
const tabs = [
  { id: 'scan', label: '设备录入', icon: 'icon-scan' },
  { id: 'test', label: '测试看板', icon: 'icon-flask-line' },
  { id: 'settings', label: '设置', icon: 'icon-settings' }
]
const currentTab = ref('scan')

// 是否已开始测试
const testStarted = ref(false)

// 处理标签页点击
const handleTabClick = (tabId) => {
  // 如果测试已开始，只允许停留在测试标签页
  if (testStarted.value && (tabId === 'scan' || tabId === 'settings')) {
    return alert('请先删除测试设备或完成测试')
  }
  
  // 如果要切换到测试标签页，检查是否已录入设备
  if (tabId === 'test' && !testStarted.value) {
    if (devices.length === 0) {
      alert('请先录入设备')
    } else {
      // 直接调用开始测试
      startTest()
    }
  } else {
    // 其他标签页正常切换
    currentTab.value = tabId
  }
}

// 扫描模式
const scanModes = [
  { id: 'camera', label: '摄像头扫码', icon: 'icon-ri-camera-lens-line' },
  { id: 'gun', label: '扫码枪扫码', icon: 'icon-ri-barcode-box-line' },
  { id: 'ble', label: '广播扫描', icon: 'icon-ri-radar-line' }
]
const currentScanMode = ref('gun')


// 蓝牙扫描相关状态
const scanState = ref('未扫描')
const scanTimer = ref(null)
// 蓝牙设备数据
const devices = reactive([])
const bluetoothDevices = reactive([])
const state = ref('')
const stateTimer = ref(null)
const timer = ref(null)
const isScanning = ref(false)
// 蓝牙适配器状态
const bluetoothState = ref('')

// 初始化蓝牙
const initBluetooth = () => {
  noble.on('stateChange', function (state) {
    bluetoothState.value = state
    if (state === 'poweredOn') {
      console.log('蓝牙适配器已开启...')
    }
  })
}

// 检查蓝牙状态
const checkBluetoothState = () => {
  if (bluetoothState.value !== 'poweredOn') {
    alert('蓝牙未开启，请打开蓝牙')
    return false
  }
  return true
}

// 扫描设备
const scan = async () => {
  if (!checkBluetoothState()) return
  state.value = '扫描中'
  isScanning.value = true
  stateTimer.value && clearInterval(stateTimer.value)
  timer.value && clearTimeout(timer.value)
  bluetoothDevices.length = 0
  noble.startScanning([], true)
  noble.on('discover', function (peripheral) {
    const isConnectable = peripheral.connectable
    const deviceId = peripheral.id
    const isAlreadyDiscovered = bluetoothDevices.some((device) => device.id === deviceId)
    const deviceName = peripheral.advertisement.localName || ''
    
    // 处理过滤名称逻辑
    const filterNames = settings.value.scanFilters.names || []
    const validFilterNames = filterNames.filter(name => name && name.trim() !== '')
    
    // 判断是否需要过滤
    const shouldFilter = validFilterNames.length > 0
    
    // 检查设备名称是否匹配过滤条件
    const matchesFilter = shouldFilter ? validFilterNames.some(filterName => 
      deviceName.toLowerCase().includes(filterName.toLowerCase())
    ) : true
    
    if (isConnectable && !isAlreadyDiscovered && matchesFilter) {
      // 将完整的peripheral对象添加到设备列表中，确保保留所有方法
      const device = {
        id: deviceId,
        name: deviceName || `未知设备_${bluetoothDevices.length + 1}`,
        mac: peripheral.address,
        rssi: peripheral.rssi
      }
      // 使用Object.assign确保复制所有可枚举属性和方法
      Object.assign(device, peripheral)
      bluetoothDevices.push(device)
    }
  })
  stateTimer.value = setInterval(() => {
    state.value += '*'
    if (state.value.length > 5) {
      state.value = '扫描中'
    }
  }, 500)
  timer.value = setTimeout(() => {
    stopScan()
  }, 15000)
}

// 停止扫描
const stopScan = () => {
  noble.stopScanning()
  isScanning.value = false
  console.log('停止扫描')
  stateTimer.value && clearInterval(stateTimer.value)
  timer.value && clearTimeout(timer.value)
  state.value = '扫描完成'
  console.log(bluetoothDevices)
}

// 清理
const cleanup = () => {
  stopScan()
  cleanupCamera() // 清理摄像头资源
}

// 添加设备到队列
const addDeviceToQueue = (device) => {
  if (!devices.some(d => d.id === device.id)) {
    devices.push({
      id: device.id,
      name: device.name,
      mac: device.mac,
      connected: false,
      rssi: device.rssi
    })
    console.log('设备已添加到录入队列:', device.name)
  } else {
    console.log('设备已存在于录入队列:', device.name)
  }
}

onMounted(() => {
  // 组件挂载时初始化蓝牙
  initBluetooth()
})

// 测试完成状态
const testCompleted = ref(false)

// 测试统计信息
const testStats = reactive({
  totalDevices: 0,
  connectedDevices: 0,
  testProgress: 0
})

// 更新测试统计信息
const updateTestStats = () => {
  testStats.totalDevices = devices.length
  testStats.connectedDevices = devices.filter(d => d.connected).length
  
  if (testStats.totalDevices > 0) {
    testStats.testProgress = Math.round(
      (testStats.connectedDevices / testStats.totalDevices) * 100
    )
  } else {
    testStats.testProgress = 0
  }
}

// 清空录入队列
const clearDevicesQueue = () => {
  devices.length = 0
  updateTestStats()
  console.log('录入队列已清空')
}

// 开始测试函数
const startTest = async () => {
  if (devices.length === 0) {
    alert('请先添加设备到录入队列')
    return
  }
  if (!checkBluetoothState()) return
  // 重置测试完成状态
  testCompleted.value = false
  
  // 初始化测试统计
  testStats.totalDevices = devices.length
  testStats.connectedDevices = 0
  testStats.testProgress = 0
  
  // 设置测试已开始状态
  testStarted.value = true
  
  // 先停止蓝牙扫描，释放资源
  stopScan()
  
  // 先切换到测试界面，让用户能实时看到设备连接过程
  currentTab.value = 'test'
  
  // 连接所有设备
  for (const device of devices) {
    await connectDeviceForTest(device)
    // 更新测试统计信息
    updateTestStats()
  }
}

// 连接设备用于测试
const connectDeviceForTest = async (device) => {
  try {
    // 更新设备状态为连接中
    device.connected = false
    device.connecting = true
    device.testResult = 'pending' // 新增测试结果状态
    // 更新测试统计信息
    updateTestStats()
    
    // 停止扫描以准备连接
    noble.stopScanning()
    
    // 直接使用noble库来查找设备
    await new Promise((resolve, reject) => {
      // 重新扫描特定设备
      noble.startScanning([], true)
      
      const deviceDiscoverListener = (peripheral) => {
        if (peripheral.id === device.id || peripheral.address === device.mac) {
          console.log(`找到设备 ${device.name}，准备连接...`)
          noble.removeListener('discover', deviceDiscoverListener)
          noble.stopScanning()
          
          // 连接设备
            peripheral.connect((error) => {
              if (error) {
              console.error(`连接设备 ${device.name} 失败:`, error)
            device.connecting = false
            device.testResult = 'failed' // 更新测试结果状态为失败
            // 更新测试统计信息
            updateTestStats()
            reject(error)
            return
            }
            
            console.log(`设备 ${device.name} 连接成功`)
            device.connected = true
            device.connecting = false
            device.testResult = 'success' // 更新测试结果状态为成功
            // 更新测试统计信息
            updateTestStats()
            
            // 发现设备服务
            peripheral.discoverServices([], (err, services) => {
              if (err) {
                console.error(`获取设备 ${device.name} 服务失败:`, err)
                reject(err)
                return
              }
              
              console.log(`设备 ${device.name} 服务发现成功:`, services)
              
              // 为每个服务发现特征
              const characteristicsPromises = services.map((service) => {
                return new Promise((resolveChar, rejectChar) => {
                  service.discoverCharacteristics([], (errChar, characteristics) => {
                    if (errChar) {
                      console.error(`发现设备 ${device.name} 特征失败:`, errChar)
                      rejectChar(errChar)
                      return
                    }
                    
                    resolveChar({
                      service: service,
                      characteristics: characteristics
                    })
                  })
                })
              })
              
              Promise.all(characteristicsPromises)
                .then((servicesWithChars) => {
                  // 保存设备的服务和特征信息
                  device.services = servicesWithChars
                  // 保存peripheral实例以便后续断开连接
                  device.peripheral = peripheral
                  console.log(`设备 ${device.name} 特征发现成功`)
                  resolve()
                })
                .catch((error) => {
                  console.error(`处理设备 ${device.name} 特征失败:`, error)
                  reject(error)
                })
            })
          })
        }
      }
      
      noble.on('discover', deviceDiscoverListener)
      
      // 设置超时
      setTimeout(() => {
        noble.removeListener('discover', deviceDiscoverListener)
        noble.stopScanning()
        device.connecting = false
        device.testResult = 'timeout' // 更新测试结果状态为超时
        // 更新测试统计信息
        updateTestStats()
        reject(new Error(`连接超时：未找到设备 ${device.name}`))
      }, 10000)
    })
    
  } catch (error) {
    console.error(`设备 ${device.name} 处理失败:`, error)
    device.connected = false
    device.connecting = false
    device.testResult = 'error' // 更新测试结果状态为错误
    // 更新测试统计信息
    updateTestStats()
  }
}

// 断开所有蓝牙设备
// 断开单个设备
const disconnectDevice = (device) => {
  if (!device.connected || !device.peripheral) return
  
  try {
    const rawPeripheral = toRaw(device.peripheral)
    rawPeripheral.disconnect(function(error) {
      if (error) {
        console.error(`断开设备 ${device.name} 失败:`, error)
      } else {
        console.log(`设备 ${device.name} 已断开连接`)
        device.connected = false
        device.connecting = false
        device.testResult = 'disconnected'
        updateTestStats()
      }
    })
  } catch (error) {
    console.error(`处理设备 ${device.name} 断开连接时出错:`, error)
    device.connected = false
    device.connecting = false
    device.testResult = 'error'
    updateTestStats()
  }
}

// 重连设备
const reconnectDevice = async (device) => {
  if (!device.id || !device.mac) return
  
  console.log(`正在重连设备 ${device.name}...`)
  
  // 如果设备已经连接，先断开连接
  if (device.connected) {
    // 使用Promise包装disconnectDevice的调用，确保断开完成后再重连
    await new Promise((resolve) => {
      // 断开设备
      disconnectDevice(device);
      
      // 等待断开完成
      const checkDisconnected = setInterval(() => {
        if (!device.connected) {
          clearInterval(checkDisconnected);
          resolve();
        }
      }, 100);
    });
  }
  
  // 重置设备状态，确保重连前设备状态正确
  device.connecting = false
  device.testResult = 'pending'
  
  await connectDeviceForTest(device)
}

// 开阀操作
const openValve = (device) => {
  if (!device.connected) return
  
  console.log(`打开设备 ${device.name} 的阀门...`)
  // 这里需要实现实际的开阀逻辑
}

// 关阀操作
const closeValve = (device) => {
  if (!device.connected) return
  
  console.log(`关闭设备 ${device.name} 的阀门...`)
  // 这里需要实现实际的关阀逻辑
}

// 断开所有蓝牙设备
const disconnectAllDevices = () => {
  devices.forEach(device => {
    disconnectDevice(device)
  })
  console.log('所有蓝牙设备已断开连接')
}

// 模拟保存测试记录的接口
const saveTestRecord = async () => {
  try {
    // 准备测试记录数据
    const testRecord = {
      timestamp: new Date().toISOString(),
      totalDevices: testStats.totalDevices,
      successCount: testStats.successCount,
      failCount: testStats.failCount,
      testProgress: testStats.testProgress,
      devices: devices.map(device => ({
        id: device.id,
        name: device.name,
        mac: device.mac,
        connected: device.connected,
        testResult: device.testResult
      }))
    }
    
    // 模拟API调用
    console.log('保存测试记录:', testRecord)
    
    // 模拟异步请求
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('测试记录保存成功')
    return true
  } catch (error) {
    console.error('保存测试记录失败:', error)
    return false
  }
}

// 完成单个设备测试
const completeDeviceTest = (device) => {
  device.testCompleted = true
  device.testResult = 'success'
  console.log(`设备 ${device.name} 测试完成`)
  updateTestStats()
  
  // 删除该设备（removeDevice函数内部会自动断开连接）
  removeDevice(device)
}

// 删除设备
const removeDevice = (device) => {
  const index = devices.findIndex(d => d.id === device.id)
  if (index !== -1) {
    // 先断开设备
    disconnectDevice(device)
    // 从列表中移除
    devices.splice(index, 1)
    console.log(`设备 ${device.name} 已删除`)
    updateTestStats()
    
    // 如果设备列表为空，重置测试开始状态
    if (devices.length === 0) {
      testStarted.value = false
    }
  }
}

// 完成测试功能
const completeTest = async () => {
  if (devices.length === 0) {
    alert('没有测试设备，无法完成测试')
    return
  }
  
  // 保存测试记录
  const saveSuccess = await saveTestRecord()
  
  if (saveSuccess) {
    // 断开所有设备
    disconnectAllDevices()
    
    // 清空设备列表
    devices.length = 0
    
    // 更新测试统计
    updateTestStats()
    
    // 设置测试完成状态
    testCompleted.value = true
    
    // 重置测试开始状态
    testStarted.value = false
    
    alert('测试已完成，记录已保存')
  } else {
    alert('测试记录保存失败')
  }
}

// 扫码枪相关数据
const barcodeInput = ref('')
const barcodeDebounceTimer = ref(null)

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
  // 检查是否有未完成的测试
  // if (devices.length > 0 && !testCompleted.value) {
  //   alert('当前测试尚未完成，请先完成测试或删除所有设备后再录入新设备')
  //   return
  // }
  
  if (barcodeInput.value.trim()) {
    const barcode = barcodeInput.value.trim()
    console.log('扫码枪输入完成:', barcode)
    
    // 解析条码数据并创建设备对象
    // 假设条码格式为：设备名称_设备ID_MAC地址
    // 例如：Device1_123456_00:11:22:33:44:55
    const barcodeParts = barcode.split('_')
    let device = null
    
    if (barcodeParts.length === 3) {
      // 完整格式的条码
      device = {
        id: barcodeParts[1],
        name: barcodeParts[0],
        mac: barcodeParts[2],
        connected: false,
        rssi: -60 // 默认RSSI值
      }
    } else {
      // 简单格式的条码（仅设备ID）
      device = {
        id: barcode,
        name: `Device_${barcode}`,
        mac: `00:00:00:00:00:00`,
        connected: false,
        rssi: -60 // 默认RSSI值
      }
    }
    
    // 添加设备到队列
    addDeviceToQueue(device)
    
    // 清空输入框
    barcodeInput.value = ''
  }
}

// 摄像头相关数据
const cameraVideo = ref(null)
const qrCanvas = ref(null)
const isCameraActive = ref(false)
let mediaStream = null
let qrDetectionInterval = null

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
    alert('当前测试尚未完成，请先完成测试或删除所有设备后再录入新设备')
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
    const deviceMac = match[1]
    const productId = match[2]
    const imei = match[3]
    
    console.log('解析成功:', {
      bluetoothHeader,
      deviceMac,
      productId,
      imei
    })
    
    // 创建设备对象
    const device = {
      id: deviceMac, // 使用mac地址作为设备ID
      name: `Device_${productId}`,
      mac: deviceMac,
      connected: false,
      rssi: -60 // 默认RSSI值
    }
    
    // 添加设备到队列
    addDeviceToQueue(device)
    
    // 关闭摄像头
    startCamera()
    
    // 提示成功
    alert(`设备录入成功！\n产品编号：${productId}\nMAC地址：${deviceMac}`)
  } else {
    // 格式不符合要求
    console.error('二维码格式不正确')
    alert('二维码格式不正确，请扫描正确的设备二维码。\n\n正确格式示例：ecv02ec308e52b393,C001202511181700,861606086013598')
    
    // 继续检测
    if (!qrDetectionInterval && isCameraActive.value) {
      qrDetectionInterval = setInterval(detectQRCode, 300)
    }
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
    alert('无法访问摄像头，请检查权限设置')
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

// 设置相关数据
const settings = ref({
  general: {
    autoConnect: true,
    successSound: false
  },
  bluetooth: {
    scanTimeout: 5000,
    reconnectTimes: 3,
    preferredAdapter: 'Intel(R) Wireless Bluetooth(R)',
    adapters: ['Intel(R) Wireless Bluetooth(R)', 'Generic Bluetooth Adapter']
  },
  bluetoothServices: {
    mainService: '0000FE60-0000-1000-8000-00805F9B34FB',
    writeCharacteristic: '0000FE61-0000-1000-8000-00805F9B34FB',
    notifyCharacteristic: '0000FE62-0000-1000-8000-00805F9B34FB'
  },
  scanFilters: {
    names: ['ecv02']
  }
})

// 添加过滤名称
const addFilterName = () => {
  settings.value.scanFilters.names.push('')
}

// 删除过滤名称
const removeFilterName = (index) => {
  if (settings.value.scanFilters.names.length > 1) {
    settings.value.scanFilters.names.splice(index, 1)
  }
}

// 保存设置
const saveSettings = () => {
  // 获取当前保存的设置，用于恢复空值
  const currentSavedSettings = localStorage.getItem('blueToolsSettings')
  let currentServices = {}
  
  if (currentSavedSettings) {
    try {
      const parsed = JSON.parse(currentSavedSettings)
      currentServices = parsed.bluetoothServices || {}
    } catch (e) {
      console.error('解析保存的设置失败:', e)
    }
  }
  
  // 校验蓝牙服务设置，确保不为空
  const validatedSettings = { ...settings.value }
  
  // 主服务校验
  if (!validatedSettings.bluetoothServices.mainService?.trim()) {
    validatedSettings.bluetoothServices.mainService = currentServices.mainService || '0000FE60-0000-1000-8000-00805F9B34FB'
  }
  
  // 写入特征校验
  if (!validatedSettings.bluetoothServices.writeCharacteristic?.trim()) {
    validatedSettings.bluetoothServices.writeCharacteristic = currentServices.writeCharacteristic || '0000FE61-0000-1000-8000-00805F9B34FB'
  }
  
  // 监听特征校验
  if (!validatedSettings.bluetoothServices.notifyCharacteristic?.trim()) {
    validatedSettings.bluetoothServices.notifyCharacteristic = currentServices.notifyCharacteristic || '0000FE62-0000-1000-8000-00805F9B34FB'
  }
  
  // 更新本地设置
  settings.value = validatedSettings
  
  // 使用localStorage保存设置
  localStorage.setItem('blueToolsSettings', JSON.stringify(validatedSettings))
  console.log('设置已保存')
}

// 加载设置
const loadSettings = () => {
  const savedSettings = localStorage.getItem('blueToolsSettings')
  if (savedSettings) {
    try {
      const parsedSettings = JSON.parse(savedSettings)
      // 合并设置，而不是完全替换，这样新添加的默认值会保留
      settings.value = {
        ...settings.value,
        ...parsedSettings,
        general: {
          ...settings.value.general,
          ...parsedSettings.general
        },
        bluetooth: {
          ...settings.value.bluetooth,
          ...parsedSettings.bluetooth
        },
        bluetoothServices: {
          ...settings.value.bluetoothServices,
          ...parsedSettings.bluetoothServices
        },
        scanFilters: {
          ...settings.value.scanFilters,
          ...parsedSettings.scanFilters,
          names: parsedSettings.scanFilters?.names || settings.value.scanFilters.names
        }
      }
      console.log('设置已加载')
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }
}

// 组件挂载时加载设置
onMounted(() => {
  loadSettings()
})

// 切换开关状态
const toggleSetting = (key) => {
  settings.value.general[key] = !settings.value.general[key]
  saveSettings()
}

// 清除本地存储的设置
const clearSettings = () => {
  localStorage.removeItem('blueToolsSettings')
  // 重新加载默认设置
  settings.value = {
    general: {
      autoConnect: true,
      successSound: false
    },
    bluetooth: {
      scanTimeout: 5000,
      reconnectTimes: 3,
      preferredAdapter: 'Intel(R) Wireless Bluetooth(R)',
      adapters: ['Intel(R) Wireless Bluetooth(R)', 'Generic Bluetooth Adapter']
    },
    bluetoothServices: {
      mainService: '0000FE60-0000-1000-8000-00805F9B34FB',
      writeCharacteristic: '0000FE61-0000-1000-8000-00805F9B34FB',
      notifyCharacteristic: '0000FE62-0000-1000-8000-00805F9B34FB'
    },
    scanFilters: {
      names: ['ecv02']
    }
  }
  console.log('设置已重置')
}
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- 1. 顶部标题栏 (自定义 Windows 风格) -->
    <!-- <header class="h-10 flex items-center justify-between glass-panel border-b-0 z-50 title-bar-drag select-none">
      <div class="flex items-center gap-3 px-4">
        <div class="w-5 h-5 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-md flex items-center justify-center">
          <i class="ri-bluetooth-line text-white text-xs"></i>
        </div>
        <span class="text-xs font-medium text-slate-300 tracking-wide">BLE Master Pro</span>
      </div>

      <div class="flex h-full no-drag">
        <div class="win-btn" title="最小化" @click="handleWin('min')">
          <i class="ri-subtract-line text-lg"></i>
        </div>
        <div class="win-btn" title="最大化" @click="handleWin('max')">
          <i class="ri-checkbox-blank-line text-xs"></i>
        </div>
        <div class="win-btn close" title="关闭" @click="handleWin('close')">
          <i class="ri-close-line text-lg"></i>
        </div>
      </div>
    </header> -->

    <!-- 2. 主布局 -->
    <main class="flex-1 flex overflow-hidden relative">
      <!-- 侧边导航 -->
      <nav class="w-16 glass-panel border-t-0 flex flex-col items-center py-6 gap-6 z-40">
        <button v-for="tab in tabs" :key="tab.id"
          class="border-none w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group relative"
          :class="{
            'bg-blue-600 text-white shadow-lg shadow-blue-500/30': currentTab === tab.id,
            'text-slate-400 hover:bg-white/5 cursor-pointer': !testStarted.value,
            'text-slate-600 cursor-not-allowed opacity-50': testStarted.value && (tab.id === 'scan' || tab.id === 'settings')
          }"
          @click="handleTabClick(tab.id)">
          <i :class="['iconfont', tab.icon]" class="text-xl"></i>
          <!-- Tooltip -->
          <span
            class="absolute left-14 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap border border-white/10 pointer-events-none z-50">
            {{ tab.label }}
          </span>
        </button>
      </nav>

      <!-- 内容区域 -->
      <section class="flex-1 bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-6 overflow-hidden relative">
        <!-- 装饰背景 -->
        <div
          class="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none">
        </div>

        <transition name="fade" mode="out-in">
          <!-- PAGE 1: 设备录入 (多种模式) -->
          <div v-if="currentTab === 'scan'" class="h-full flex flex-col gap-6 max-w-6xl mx-auto">
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
                        v-if="isScanning">
                        停止扫描
                      </button>
                      <button
                        class="border-none text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded flex items-center gap-1 text-white transition" @click="scan">
                        <el-icon><Refresh /></el-icon> {{ state || '刷新列表' }}
                      </button>
                    </div>
                  </div>
                  <div class="flex-1 overflow-y-auto space-y-2 pr-2">
                    <div v-if="bluetoothDevices.length === 0" class="flex items-center justify-center h-full text-slate-500 text-sm">
                      {{ state === '' ? '点击刷新列表搜索设备' : '正在搜索...' }}
                    </div>
                    <div v-for="device in bluetoothDevices" :key="device.id"
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

          <!-- PAGE 2: 测试看板 -->
          <div v-else-if="currentTab === 'test'" class="h-full flex gap-4">
            <div class="flex-1 flex flex-col gap-4">
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
                      <div class="text-slate-300 font-medium">固件版本</div>
                      <div class="text-white">{{ dev.firmwareVersion || '--' }}</div>
                    </div>
                    <div class="text-xs text-slate-400 whitespace-nowrap">
                      <div class="text-slate-300 font-medium">温度</div>
                      <div class="text-white">{{ dev.temperature || '--' }}°C</div>
                    </div>
                    <div class="text-xs text-slate-400 whitespace-nowrap">
                      <div class="text-slate-300 font-medium">压力</div>
                      <div class="text-white">{{ dev.pressure || '--' }} kPa</div>
                    </div>
                    <div class="text-xs text-slate-400 whitespace-nowrap">
                      <div class="text-slate-300 font-medium">流量</div>
                      <div class="text-white">{{ dev.flow || '--' }} L/min</div>
                    </div>
                    <div class="text-xs text-slate-400 whitespace-nowrap">
                      <div class="text-slate-300 font-medium">电压</div>
                      <div class="text-white">{{ dev.voltage || '--' }} V</div>
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
          </div>

          <!-- PAGE 3: 设置 -->
          <div v-else-if="currentTab === 'settings'" class="h-full flex justify-center overflow-y-auto">
            <div class="w-full max-w-2xl pt-4 pb-10 space-y-6">
              <h2 class="text-2xl font-light text-white mb-6">设置</h2>

              <!-- Group 1: 常规设置 -->
              <!-- <div class="glass-panel rounded-xl overflow-hidden">
                <div class="px-6 py-3 border-b border-white/5 text-xs font-semibold text-slate-500 uppercase">常规设置</div>
                <div class="p-6 space-y-6">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="text-sm text-slate-200">自动连接新设备</div>
                      <div class="text-xs text-slate-500">录入队列后立即尝试建立蓝牙连接</div>
                    </div>
                    <div 
                      class="w-11 h-6 rounded-full relative cursor-pointer shadow-inner transition-all duration-300"
                      :class="settings.general.autoConnect ? 'bg-blue-600' : 'bg-slate-700'"
                      @click="toggleSetting('autoConnect')"
                    >
                      <div 
                        class="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300"
                        :class="settings.general.autoConnect ? 'right-1' : 'left-1'"
                      ></div>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="text-sm text-slate-200">测试成功提示音</div>
                      <div class="text-xs text-slate-500">PASS 时播放系统提示音</div>
                    </div>
                    <div 
                      class="w-11 h-6 rounded-full relative cursor-pointer shadow-inner transition-all duration-300"
                      :class="settings.general.successSound ? 'bg-blue-600' : 'bg-slate-700'"
                      @click="toggleSetting('successSound')"
                    >
                      <div 
                        class="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300"
                        :class="settings.general.successSound ? 'right-1' : 'left-1'"
                      ></div>
                    </div>
                  </div>
                </div>
              </div> -->

              <!-- Group 2: 蓝牙适配器 -->
              <!-- <div class="glass-panel rounded-xl overflow-hidden">
                <div class="px-6 py-3 border-b border-white/5 text-xs font-semibold text-slate-500 uppercase">蓝牙适配器</div>
                <div class="p-6 space-y-6">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs text-slate-400 mb-1">扫描超时 (ms)</label>
                      <input 
                        type="number" 
                        v-model.number="settings.bluetooth.scanTimeout"
                        class="w-full bg-slate-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        @change="saveSettings"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-slate-400 mb-1">重试次数</label>
                      <input 
                        type="number" 
                        v-model.number="settings.bluetooth.reconnectTimes"
                        class="w-full bg-slate-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        @change="saveSettings"
                      />
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs text-slate-400 mb-1">首选适配器</label>
                    <select 
                      v-model="settings.bluetooth.preferredAdapter"
                      class="w-full bg-slate-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      @change="saveSettings"
                    >
                      <option v-for="adapter in settings.bluetooth.adapters" :key="adapter" :value="adapter">{{ adapter }}</option>
                    </select>
                  </div>
                </div>
              </div> -->

              <!-- Group 3: 蓝牙服务设置 -->
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

              <!-- Group 4: 扫描名称过滤 -->
              <div class="glass-panel rounded-xl overflow-hidden">
                <div class="px-6 py-3 border-b border-white/5 text-xs font-semibold text-slate-500 uppercase">扫描名称过滤</div>
                <div class="p-6 space-y-4">
                  <div class="space-y-2">
                    <div v-for="(name, index) in settings.scanFilters.names" :key="index" class="flex items-center gap-2">
                      <input 
                        type="text" 
                        v-model="settings.scanFilters.names[index]"
                        placeholder="设备名称或部分名称"
                        class="flex-1 bg-slate-800/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        @change="saveSettings"
                      />
                    <el-icon class="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 transition"
                      @click="removeFilterName(index)"><Delete /></el-icon>
                    </div>
                    <button 
                      class="w-full bg-slate-800/30 border border-dashed border-white/10 rounded-md px-3 py-2 text-sm text-slate-400 hover:text-white transition"
                      @click="addFilterName"
                    >
                      <i class="ri-add-line mr-1"></i> 添加过滤名称
                    </button>
                  </div>
                </div>
              </div>

              <!-- Group 5: 关于 -->
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
                  
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="text-sm font-medium text-white">Bluetooth Pro Test Tool</div>
                      <div class="text-xs text-slate-500">Version 2.1.0 (Build 20231027)</div>
                    </div>
                    <div class="flex gap-2">
                      <button 
                        class="border-none px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md transition flex items-center gap-1"
                        :disabled="updateStatus.checking || updateStatus.downloading"
                        @click="checkForUpdates"
                      >
                        <span v-if="updateStatus.checking">检查中...</span>
                        <span v-else-if="updateStatus.downloading">下载中...</span>
                        <span v-else>检查更新</span>
                      </button>
                      <button 
                        class="border-none px-4 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-md transition"
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
              
              <!-- 更新提示 -->
              <div v-if="updateStatus.available" class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white p-4 rounded-lg shadow-xl max-w-sm z-50">
                <div class="flex items-start gap-3">
                  <div class="text-xl">📢</div>
                  <div class="flex-1">
                    <div class="font-medium mb-1">发现新版本</div>
                    <div class="text-xs text-blue-100 mb-2">版本: {{ updateStatus.info?.version }}</div>
                    <div class="flex gap-2">
                      <button 
                        class="border-none px-3 py-1 bg-white text-blue-600 text-xs rounded-md hover:bg-blue-100 transition"
                        @click="downloadUpdate"
                      >
                        立即更新
                      </button>
                      <button 
                        class="border-none px-3 py-1 bg-transparent text-white text-xs rounded-md hover:bg-blue-500 transition"
                        @click="closeUpdateNotification"
                      >
                        稍后再说
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </section>
    </main>
  </div>
</template>

<style scoped>
:root {
  --bg-body: #0f172a;
  --glass-bg: rgba(30, 41, 59, 0.65);
  --glass-border: rgba(255, 255, 255, 0.08);
  --primary: #3b82f6;
  --text-main: #f8fafc;
}

/* 拖拽区域 */
.title-bar-drag {
  -webkit-app-region: drag;
}

.no-drag {
  -webkit-app-region: no-drag;
}

/* 磨砂效果 */
.glass-panel {
  background: #192335;
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* 扫描线动画 */
.scan-line {
  animation: scan 2s linear infinite;
  top: 0;
}

@keyframes scan {
  0% {
    top: 0;
  }

  100% {
    top: 100%;
  }
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

.win-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.win-btn.close:hover {
  background-color: #ef4444;
  color: white;
}

.code-font {
  font-family: 'JetBrains Mono', monospace;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>