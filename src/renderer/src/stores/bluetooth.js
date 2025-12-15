import { defineStore } from 'pinia'
import { ElMessage as Toast } from 'element-plus'
import { buildReadRealtimeDataCmd, parseReadRealtimeDataResponse, parseDeviceStatus, buildOpenValveCmd, buildCloseValveCmd } from '../utils/bleProtocol'
import { convertTo128BitUUID } from '../utils/common'
import { useSettingsStore } from './settings'

const noble = require('@abandonware/noble')

export const useBluetoothStore = defineStore('bluetooth', {
  state: () => ({
    isScanning: false,
    devices: [],
    bluetoothDevices: [],
    scanState: '未扫描',
    bluetoothState: '',
    testQueue: [],
    testStarted: false,
    testCompleted: false
  }),

  getters: {
    connectedDevices: (state) => state.devices.filter(device => device.connected),
    availableDevices: (state) => state.devices.filter(device => !device.connected),
    isDeviceConnected: (state) => (deviceId) => {
      return state.devices.some(device => device.id === deviceId && device.connected)
    },
    testProgress: (state) => {
      if (state.devices.length === 0) return 0
      const connectedCount = state.devices.filter(d => d.connected).length
      return Math.round((connectedCount / state.devices.length) * 100)
    }
  },

  actions: {
    // 初始化蓝牙
    initBluetooth() {
      noble.on('stateChange', (state) => {
        this.bluetoothState = state
        if (state === 'poweredOn') {
          console.log('蓝牙适配器已开启...')
        }
      })
    },

    // 检查蓝牙状态
    checkBluetoothState() {
      if (this.bluetoothState !== 'poweredOn') {
        Toast.info('蓝牙未开启，请打开蓝牙')
        return false
      }
      return true
    },

    // 开始扫描设备
    startScan() {
      if (this.isScanning) return
      
      // 检查蓝牙状态
      if (this.bluetoothState !== 'poweredOn') {
        this.initBluetooth()
        if (!this.checkBluetoothState()) return
      }
      
      this.isScanning = true
      this.bluetoothDevices = []
      this.scanState = '扫描中'
      
      // 获取设置
    const settingsStore = useSettingsStore()
    const scanFilters = settingsStore.scanFilters
    
    // 定义设备发现监听器
      const deviceDiscoverListener = (peripheral) => {
        // 从广告数据中获取本地名称
        const deviceName = peripheral.advertisement.localName || ''
        
        // 1. 名称过滤
        let nameFilterPass = false
        if (scanFilters.nameFilters && scanFilters.nameFilters.length > 0) {
          // 检查设备名称是否匹配任何一个名称过滤规则
          nameFilterPass = scanFilters.nameFilters.some(filter => {
            if (filter.startsWith('*') && filter.endsWith('*')) {
              // 包含匹配模式：*ecv02*
              const keyword = filter.slice(1, -1)
              return deviceName.includes(keyword)
            } else if (filter.startsWith('*')) {
              // 结尾匹配模式：*ecv02
              const suffix = filter.slice(1)
              return deviceName.endsWith(suffix)
            } else if (filter.endsWith('*')) {
              // 开头匹配模式：ecv02*
              const prefix = filter.slice(0, -1)
              return deviceName.startsWith(prefix)
            } else {
              // 精确匹配模式：ecv02
              return deviceName === filter
            }
          })
        } else {
          // 如果没有设置名称过滤规则，则不进行名称过滤
          nameFilterPass = true
        }
        
        // 2. 如果通过名称过滤条件，则添加设备
        if (nameFilterPass) {
          // 检查设备是否已在列表中
          const existingDeviceIndex = this.bluetoothDevices.findIndex(device => device.id === peripheral.id)
          
          if (existingDeviceIndex === -1) {
            // 新设备，添加到列表
            const device = {
              id: peripheral.id,
              name: deviceName || `未知设备_${this.bluetoothDevices.length + 1}`,
              mac: peripheral.address || '未知',
              rssi: peripheral.rssi
            }
            // 使用Object.assign确保复制所有可枚举属性和方法
            Object.assign(device, peripheral)
            this.bluetoothDevices.push(device)
          } else {
            // 更新已有设备的RSSI
            this.bluetoothDevices[existingDeviceIndex].rssi = peripheral.rssi
          }
        }
      }
      
      // 移除可能存在的旧监听器
      noble.removeAllListeners('discover')
      // 添加新的监听器
      noble.on('discover', deviceDiscoverListener)
      
      // 开始扫描
      noble.startScanning([], true)
      
      // 15秒后自动停止扫描
      setTimeout(() => {
        this.stopScan()
      }, 15000)
    },

    // 停止扫描设备
    stopScan() {
      if (!this.isScanning) return
      
      // 移除监听器
      noble.removeAllListeners('discover')
      
      // 停止扫描
      noble.stopScanning()
      
      this.isScanning = false
      this.scanState = '扫描完成'
    },

    // 添加设备到队列
    addDevice(device) {
      if (!this.devices.some(d => d.id === device.id)) {
        this.devices.push({
          id: device.id,
          name: device.name,
          mac: device.mac,
          connected: false,
          connecting: false,
          rssi: device.rssi,
          // 保留imei和tableId属性
          imei: device.imei,
          tableId: device.tableId
        })
        console.log('设备已添加到录入队列:', device.name)
      } else {
        console.log('设备已存在于录入队列:', device.name)
      }
    },

    // 移除设备
    removeDevice(deviceId) {
      const deviceIndex = this.devices.findIndex(d => d.id === deviceId)
      if (deviceIndex !== -1) {
        this.devices.splice(deviceIndex, 1)
      }
    },

    // 清空设备队列
    clearDevices() {
      this.devices = []
    },

    // 设置测试队列
    setTestQueue(queue) {
      this.testQueue = [...queue]
      this.devices = [...queue]
      this.testStarted = true
      this.testCompleted = false
    },

    // 更新设备状态
    updateDeviceState(deviceId, state) {
      const device = this.devices.find(d => d.id === deviceId)
      if (device) {
        Object.assign(device, state)
      }
    },

    // 连接设备
    async connectDevice(deviceId) {
      const device = this.devices.find(d => d.id === deviceId)
      if (!device) return

      try {
        // 更新设备状态
        this.updateDeviceState(deviceId, { connecting: true, connected: false })
        
        // 停止扫描
        this.stopScan()
        
        // 重新扫描特定设备
        await new Promise((resolve, reject) => {
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
                  this.updateDeviceState(deviceId, { connecting: false, connected: false, testResult: 'failed' })
                  reject(error)
                  return
                }
                
                console.log(`设备 ${device.name} 连接成功`)
                this.updateDeviceState(deviceId, { 
                  connected: true, 
                  connecting: false, 
                  testResult: 'success',
                  realtimeData: {},
                  temperature: '--',
                  pressure: '--',
                  flow: '--',
                  voltage: '--',
                  batteryVoltage: '--',
                  overFlow: false,
                  crossFlow: false,
                  microFlow: false,
                  valveStatus: '关闭',
                  leakAlarm: false,
                  overTemp: false,
                  overPressure: false,
                  underPressure: false,
                  pressureSensorFault: false,
                  flowSensorFault: false,
                  fluidMedium: '未知',
                  alarmStr: '',
                  dataTime: '--'
                })
                
                // 添加设备断开监听器
                peripheral.removeAllListeners('disconnect');
                peripheral.on('disconnect', () => {
                  console.log(`设备 ${device.name} 断开连接`);
                  // 只有当不是手动断开时才显示提示
                  if (!device.isManuallyDisconnecting) {
                    Toast.info(`设备 ${device.name} 连接已断开`)
                  }
                  // 清除定时发送命令
                  if (device.commandInterval) {
                    clearInterval(device.commandInterval);
                    device.commandInterval = null;
                  }
                  // 更新设备状态
                  this.updateDeviceState(deviceId, { 
                    connected: false, 
                    connecting: false, 
                    testResult: 'disconnected',
                    isManuallyDisconnecting: false
                  });
                });
                
                // 发现设备服务
                peripheral.discoverServices([], (err, services) => {
                  if (err) {
                    console.error(`获取设备 ${device.name} 服务失败:`, err)
                    reject(err)
                    return
                  }
                  
                  console.log(`设备 ${device.name} 服务发现成功:`)
                  
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
                      this.updateDeviceState(deviceId, { services: servicesWithChars, peripheral })
                      console.log(`设备 ${device.name} 特征发现成功`)
                      
                      // 查找写入和通知特征
                      let writeChar = null
                      let notifyChar = null
                      
                      // 获取并转换目标特征UUID
                      const targetWriteUUID = '0000fff3-0000-1000-8000-00805f9b34fb' // 写入特征UUID
                      const targetNotifyUUID = '0000fff4-0000-1000-8000-00805f9b34fb' // 通知特征UUID
                      
                      // 遍历所有服务和特征，找到目标特征
                      for (const serviceWithChar of servicesWithChars) {
                        for (const characteristic of serviceWithChar.characteristics) {
                          // 转换当前特征UUID并进行匹配
                          const charUUID = convertTo128BitUUID(characteristic.uuid)
                          if (charUUID === targetWriteUUID) {
                            writeChar = characteristic
                          }
                          if (charUUID === targetNotifyUUID) {
                            notifyChar = characteristic
                          }
                        }
                      }
                      
                      if (writeChar && notifyChar) {
                        console.log(`设备 ${device.name} 找到写入和通知特征`)
                        
                        // 保存特征到设备对象
                        this.updateDeviceState(deviceId, { writeCharacteristic: writeChar, notifyCharacteristic: notifyChar })
                        
                        // 设置通知监听器
                        notifyChar.on('data', (data, isNotification) => {
                          if (isNotification) {
                            try {
                              // 解析设备响应数据
                              const response = { ...parseReadRealtimeDataResponse(data) }
                              console.log(`设备 ${device.name} 收到数据:`, response)
                              
                              // 更新设备实时数据到对应属性，供UI显示
                              this.updateDeviceState(deviceId, {
                                // 保存原始数据
                                realtimeData: response,
                                // 更新设备状态
                                status: response.deviceStatus,
                                // 更新具体数据字段
                                temperature: response.temperature || '--',
                                pressure: response.meterPressure !== null ? response.meterPressure : '--',
                                flow: response.peakExpiratoryFlow || '--',
                                voltage: '--', // 协议中未提供该字段
                                batteryVoltage: response.batteryVoltage || '--',
                                // 更新状态标志（将字符串"0"/"1"转换为布尔值）
                                overFlow: response.overFlow === '1' || false,
                                crossFlow: response.pipelineLeak === '1' || false,
                                microFlow: response.microFlow === '1' || false,
                                // 更新其他状态
                                valveStatus: response.valveStatus === '1' ? '开启' : '关闭',
                                leakAlarm: response.leakAlarm === '1' || false,
                                overTemp: response.overTemp === '1' || false,
                                overPressure: response.overPressure === '1' || false,
                                underPressure: response.underPressure === '1' || false,
                                pressureSensorFault: response.pressureSensorFault === '1' || false,
                                flowSensorFault: response.flowSensorFault === '1' || false,
                                fluidMedium: response.fluidMedium || '未知',
                                alarmStr: response.alarmStr || '',
                                // 更新数据时间
                                dataTime: new Date().toLocaleTimeString()
                              })
                            } catch (error) {
                              console.error(`设备 ${device.name} 解析数据失败:`, error)
                            }
                          }
                        })
                        
                        // 启用通知
                        notifyChar.notify(true, (error) => {
                          if (error) {
                            console.error(`设备 ${device.name} 启用通知失败:`, error)
                          } else {
                            console.log(`设备 ${device.name} 通知已启用`)
                            
                            // 开始定时发送读取实时数据命令
                            device.commandInterval = setInterval(() => {
                              if (device.connected && device.writeCharacteristic) {
                                const cmd = buildReadRealtimeDataCmd()
                                device.writeCharacteristic.write(Buffer.from(cmd), false, (err) => {
                                  if (err) {
                                    console.error(`设备 ${device.name} 发送命令失败:`, err)
                                  }
                                })
                              }
                            }, 1000) // 每秒发送一次
                          }
                        })
                      } else {
                        console.error(`设备 ${device.name} 未找到写入和通知特征`)
                        reject(new Error(`设备 ${device.name} 未找到写入和通知特征`))
                      }
                    })
                  .catch(err => {
                    console.error(`处理设备 ${device.name} 特征失败:`, err)
                    reject(err)
                  })
                })
                
                resolve(peripheral)
              })
            }
          }
          
          // 添加设备发现监听器
          noble.on('discover', deviceDiscoverListener)
          
          // 设置连接超时
          const connectionTimeout = setTimeout(() => {
            noble.removeListener('discover', deviceDiscoverListener)
            noble.stopScanning()
            reject(new Error(`连接设备 ${device.name} 超时`))
          }, 10000)
        })
        
      } catch (error) {
        console.error(`连接设备 ${device.name} 失败:`, error)
        this.updateDeviceState(deviceId, { 
          connecting: false, 
          connected: false, 
          testResult: 'failed'
        })
      }
    },

    // 断开设备连接
    async disconnectDevice(deviceId) {
      const device = this.devices.find(d => d.id === deviceId)
      if (!device) return

      try {
        // 设置手动断开标记
        this.updateDeviceState(deviceId, { isManuallyDisconnecting: true })
        
        // 清除定时发送命令
        if (device.commandInterval) {
          clearInterval(device.commandInterval);
          device.commandInterval = null;
        }
        
        if (device.peripheral) {
          device.peripheral.disconnect((error) => {
            if (error) {
              console.error(`断开设备 ${device.name} 连接失败:`, error)
            } else {
              console.log(`设备 ${device.name} 已断开连接`)
              this.updateDeviceState(deviceId, { 
                connected: false, 
                connecting: false, 
                testResult: 'disconnected',
                isManuallyDisconnecting: false
              })
            }
          })
        } else {
          // 如果没有peripheral实例，直接更新设备状态
          this.updateDeviceState(deviceId, { 
            connected: false, 
            connecting: false, 
            testResult: 'disconnected',
            isManuallyDisconnecting: false
          })
        }
      } catch (error) {
        console.error(`断开设备 ${device.name} 连接失败:`, error)
        this.updateDeviceState(deviceId, { 
          connected: false, 
          connecting: false, 
          testResult: 'disconnected',
          isManuallyDisconnecting: false
        })
      }
    },

    // 断开所有设备连接
    async disconnectAllDevices() {
      for (const device of this.devices) {
        if (device.connected) {
          await this.disconnectDevice(device.id)
        }
      }
    },

    // 开阀操作
    openValve(deviceId) {
      const device = this.devices.find(d => d.id === deviceId)
      if (!device || !device.connected) {
        Toast.warning('设备未连接，无法操作')
        return
      }
      
      if (device.writeCharacteristic) {
        const cmd = buildOpenValveCmd()
        device.writeCharacteristic.write(Buffer.from(cmd), false, (err) => {
          if (err) {
            console.error(`设备 ${device.name} 发送开阀命令失败:`, err)
            Toast.error(`${device.name} 开阀失败`)
          } else {
            console.log(`设备 ${device.name} 开阀命令发送成功`)
            this.updateDeviceState(deviceId, { valveStatus: '开启' })
            Toast.success(`${device.name} 阀门已打开`)
          }
        })
      }
    },

    // 关阀操作
    closeValve(deviceId) {
      const device = this.devices.find(d => d.id === deviceId)
      if (!device || !device.connected) {
        Toast.warning('设备未连接，无法操作')
        return
      }
      
      if (device.writeCharacteristic) {
        const cmd = buildCloseValveCmd()
        device.writeCharacteristic.write(Buffer.from(cmd), false, (err) => {
          if (err) {
            console.error(`设备 ${device.name} 发送关阀命令失败:`, err)
            Toast.error(`${device.name} 关阀失败`)
          } else {
            console.log(`设备 ${device.name} 关阀命令发送成功`)
            this.updateDeviceState(deviceId, { valveStatus: '关闭' })
            Toast.success(`${device.name} 阀门已关闭`)
          }
        })
      }
    },

    // 完成设备测试
    completeDeviceTest(deviceId) {
      const device = this.devices.find(d => d.id === deviceId)
      if (!device || !device.connected) {
        Toast.warning('设备未连接，无法完成测试')
        return
      }
      
      Toast.success(`${device.name} 测试完成`)
    },

    // 完成所有测试
    completeTest() {
      const allConnected = this.devices.every(d => d.connected)
      if (!allConnected) {
        Toast.warning('存在未连接设备，无法完成测试')
        return
      }
      
      this.testCompleted = true
      Toast.success('所有设备测试完成')
    }
  }
})
