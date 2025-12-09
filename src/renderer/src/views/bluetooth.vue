<script setup>
const noble = require('@abandonware/noble')
import { onMounted, reactive, watch, ref } from 'vue'
import { stringToHex, formatSizeUnits, hexToString, convertTo128BitUUID } from '@utils/common'

const state = ref('等待连接')
const scanType = ref('ble')
const interval = ref(500)
const loopSend = ref(false)
const bluetoothDevices = ref([])
const searchList = ref([])
const targetDevice = ref(null)
const sendContent = ref('')
const sendHex = ref(false)
const receiveContent = ref('')
const sendNewLine = ref(false)
const receive200k = ref(false)
const receiveHex = ref(false)
const timer = ref(null)
const setTimer = ref(null)
const stateTimer = ref(null)
const deviceService = ref(null)
const characteristics = ref([])
// let isClosedByUser = false
const serviceData = reactive({
  uuid: '',
  read: '',
  write: '',
  notify: ''
})

const initBluetooth = () => {
  noble.on('stateChange', function (state) {
    if (state === 'poweredOn') {
      console.log('蓝牙适配器已开启...')
    } else {
      alert('蓝牙未开启，请打开蓝牙')
    }
  })
}

// 扫描设备
const scan = async () => {
  noble.on('stateChange', function (state) {
    if (state === 'poweredOn') {
      console.log('蓝牙适配器已开启...')
    } else {
      alert('蓝牙未开启，请打开蓝牙')
    }
  })
  state.value = '扫描中'
  stateTimer.value && clearInterval(stateTimer.value)
  timer.value && clearTimeout(timer.value)
  bluetoothDevices.value = []
  noble.startScanning([], true)
  noble.on('discover', function (peripheral) {
    // peripheral.services.length > 0 ble 设备
    const isConnectable = peripheral.connectable
    const deviceId = peripheral.id
    const isAlreadyDiscovered = bluetoothDevices.value.some((device) => device.id === deviceId)
    if (isConnectable && !isAlreadyDiscovered) {
      bluetoothDevices.value.push({
        ...peripheral,
        connect: () => connectToDevice(peripheral),
        disconnect: () => disconnect(peripheral)
      })
    }
  })
  stateTimer.value = setInterval(() => {
    state.value += '*'
    if (state.value.length > 5) {
      state.value = '扫描中'
    }
  }, 500)
  timer.value = setTimeout(() => {
    noble.stopScanning()
    console.log('停止扫描')
    stateTimer.value && clearInterval(stateTimer.value)
    state.value = '扫描完成'
    console.log(bluetoothDevices.value)
  }, 15000)
}

const cleanup = () => {
  noble.stopScanning()
  stateTimer.value && clearInterval(stateTimer.value)
  timer.value && clearTimeout(timer.value)
}

// 连接设备
const connectToDevice = (peripheral) => {
  if (peripheral.state === 'connected') return
  cleanup()
  state.value = `正在连接${peripheral?.advertisement?.localName}`
  searchList.value = bluetoothDevices.value
  peripheral.connect((error) => {
    if (error) {
      state.value = '连接失败'
      return alert('连接失败：' + error)
    }
    targetDevice.value = bluetoothDevices.value.find((device) => device.uuid === peripheral.uuid)
    bluetoothDevices.value = bluetoothDevices.value.filter(
          (item) => item.uuid === targetDevice.value.uuid
        )
    targetDevice.value.state = 'connected'
    state.value = '连接成功'
    console.log('连接成功')
    peripheral.discoverServices([], (error, services) => {
      if (error) {
        console.error('获取服务失败：', error)
        return
      }
      const characteristicsPromises = services.map((service) => {
        return new Promise((resolve, reject) => {
          service.discoverCharacteristics([], (err, characteristics) => {
            if (err) {
              console.error('发现特征失败:', err)
              reject(err)
              return
            }
            resolve({
              ...service,
              characteristics: characteristics
            })
          })
        })
      })
      Promise.all(characteristicsPromises)
        .then((services) => {
          targetDevice.value.writeData = () => writeData(peripheral, services)
          targetDevice.value.subscribe = () => subscribe(peripheral, services)
          // 所有服务的特征都已发现
          deviceService.value = services.map((item) => {
            return {
              ...item,
              label: convertTo128BitUUID(item.uuid),
              characteristics: item.characteristics.map((characteristic) => {
                return {
                  ...characteristic,
                  label: convertTo128BitUUID(characteristic.uuid)
                }
              })
            }
          })
          console.log('获取服务成功', services)
          state.value = '连接成功'
        })
        .catch((error) => {
          // 处理发现特征过程中的错误
          console.error('发现特征过程中发生错误:', error)
        })
        .finally(() => {
          // 清理或后续操作（如果需要）
        })
    })
    disconnectFromDevice(peripheral)
  })
}

const disconnectFromDevice = (peripheral) => {
  peripheral.removeAllListeners('disconnect')
  peripheral.on('disconnect', () => {
    alert('设备已断开连接')
    cleanup()
    loopSend.value = false
    bluetoothDevices.value = searchList.value
    deviceService.value = null
    targetDevice.value = null
    characteristics.value = []
    serviceData.uuid = ''
    serviceData.read = ''
    serviceData.write = ''
    serviceData.notify = ''
    state.value = '等待连接'
  })
}

// 断开连接
const disconnect = (peripheral) => {
  if (peripheral && peripheral.state === 'connected') {
    peripheral.removeAllListeners('disconnect')
    peripheral.disconnect((error) => {
      if (error) {
        return alert('断开连接失败：' + error)
      }
      console.log('断开连接成功')
      loopSend.value = false
      bluetoothDevices.value = searchList.value
      targetDevice.value = null
      deviceService.value = null
      characteristics.value = []
      serviceData.uuid = ''
      serviceData.read = ''
      serviceData.write = ''
      serviceData.notify = ''
      state.value = '等待连接'
    })
  } else {
    alert('设备未连接')
  }
}

const disconnectDevice = () => {
  targetDevice.value && targetDevice.value.disconnect()
  targetDevice.value = null
}

// 切换扫描类型
const changScanType = (type) => {
  if (type === scanType.value) {
    return
  } else {
    noble.stopScanning()
    scan()
  }
}

const clearReceive = () => {
  receiveContent.value = ''
  console.log('清除接收')
}

const clearSend = () => {
  sendContent.value = ''
  console.log('清空发送')
}

const dataformat = () => {
  let res = sendContent.value
  if (sendHex.value) {
    res = stringToHex(sendContent.value)
  }
  if (sendNewLine.value) {
    res += '\r\n'
  }
  return res
}

const sendData = () => {
  if (!targetDevice.value) return alert('请先连接设备')
  if (!serviceData.write || !serviceData.uuid) return alert('请先选择服务')
  if (!sendContent.value) return
  targetDevice.value.writeData()
}

const writeData = (peripheral, services) => {
  if (!services) return alert('未找到服务')
  const service = services.find((s) => s.uuid === serviceData.uuid)
  if (!service) return alert('未找到指定服务')
  if (!service.characteristics) return alert('未找到特征')
  const characteristic = service.characteristics.find((c) => c.uuid === serviceData.write)
  if (!characteristic) return alert('未找到指定特征')
  if (typeof characteristic.write !== 'function') {
    return alert('characteristic.write 不是一个函数')
  }
  const data = dataformat()
  const dataToWrite = Buffer.from(data)
  console.log(characteristic)
  characteristic.write(dataToWrite, true, (writeErr) => {
    if (writeErr) {
      console.error('写入数据失败:', writeErr)
      alert('写入数据失败！', writeErr)
    } else {
      console.log('数据写入成功:', dataToWrite)
    }
  })
}

// 监听数据
const subscribe = (peripheral, services) => {
  if (!services) return alert('未找到服务')
  const service = services.find((s) => s.uuid === serviceData.uuid)
  if (!service) return alert('未找到指定服务')
  if (!service.characteristics) return alert('未找到特征')
  const characteristic = service.characteristics.find((c) => c.uuid === serviceData.notify)
  if (!characteristic) return alert('未找到指定特征')
  if (typeof characteristic.subscribe !== 'function') {
    return alert('characteristic.subscribe 不是一个函数')
  }
  console.log(characteristic)
  characteristic.subscribe((error) => {
    if (error) {
      console.error('订阅失败:', error)
      alert('监听数据失败！', error)
    } else {
      characteristic.on('data', (data, isNotification) => {
        console.log(`收到数据: ${data}`)
        receiveContent.value += data
      })
      console.log('监听数据成功')
    }
  })
}

const selectUuid = (uuid) => {
  characteristics.value = deviceService.value.find((item) => item.uuid === uuid).characteristics
  serviceData.write = ''
  serviceData.notify = ''
}

watch(
  () => loopSend.value,
  (newVal) => {
    if (!newVal) {
      clearInterval(setTimer.value)
    } else {
      setTimer.value = setInterval(() => {
        sendData()
        if (!targetDevice.value || !serviceData.write) {
          loopSend.value = false
          return clearInterval(setTimer.value)
        }
      }, interval.value)
    }
  }
)

watch(
  () => receiveContent.value,
  (newVal) => {
    if (newVal) {
      const size = formatSizeUnits(receiveContent.value)
      const sizeInBytes = 200.0 * 1024
      if (size > sizeInBytes) {
        receiveContent.value = ''
      }
    }
  }
)

// 监听notify服务uuid
const subscribeData = (data) => {
  if(data) {
    targetDevice.value.subscribe()
  }
}

const listenHexDisplay = (data) => {
  if (data) {
    receiveContent.value = stringToHex(receiveContent.value)
  } else {
    receiveContent.value = hexToString(receiveContent.value)
  }
}

window.addEventListener('beforeunload', () => {
  cleanup()
  if (targetDevice.value.state === 'connected') {
    disconnectDevice()
  }
})

// onMounted(() => {
//   initBluetooth()
// })
</script>

<template>
  <div class="bluetooth-page">
    <el-container style="height: 100vh">
      <el-aside width="200px" class="flex flex-col p-8px overflow-hidden">
        <div class="flex items-center w-full justify-between text-12px">
          <div class="font-600">蓝牙列表</div>
          <div class="font-600 w-80px">状态: {{ state }}</div>
        </div>
        <el-scrollbar style="border: 1px solid #ccc">
          <ul class="text-12px h-full flex-1 p-2px">
            <li
              v-for="device in bluetoothDevices"
              :key="device.id"
              class="flex items-center scrollbar-demo-item"
              @click="device.connect"
            >
              <div class="img">
                <img src="../assets/bluetooth.png" alt="" class="w-32px h-32px v-middle" />
              </div>
              <div class="lh-1rem">
                <div class="font-600">{{ device.advertisement.localName || '未知设备' }}</div>
                <div class="text-#939393">{{ device.address }}</div>
              </div>
            </li>
          </ul>
        </el-scrollbar>
      </el-aside>
      <el-main class="flex flex-col p-8px">
        <el-row class="h-75% flex-col">
          <h3 class="text-12px w-full">接收区</h3>
          <el-input
            v-model="receiveContent"
            readonly
            type="textarea"
            placeholder="接收内容"
            class="flex-1 h-input"
          ></el-input>
        </el-row>
        <el-row class="h-25% flex-col mt-12px">
          <h3 class="text-12px w-full">发送区</h3>
          <el-input
            v-model="sendContent"
            type="textarea"
            class="flex-1 h-input"
            placeholder="输入信息"
          ></el-input>
        </el-row>
      </el-main>
      <el-aside width="210px" class="flex flex-col relative p-8px overflow-hidden">
        <div>
          <fieldset class="border='[1px_solid_#ccc]' p-8px text-14px">
            <legend class="text-#606266 px-10px">蓝牙操作</legend>
            <div class="flex items-center text-12px">
              <div class="mr-4px">扫描蓝牙类型</div>
              <el-select
                v-model="scanType"
                class="flex-1 text-12px"
                size="small"
                @change="changScanType"
              >
                <el-option label="ble蓝牙" value="ble"></el-option>
                <!-- <el-option label="2.0蓝牙" value="2.0"></el-option> -->
              </el-select>
            </div>
            <div class="flex align-center justify-between mt-10px">
              <el-button class="!m0 text-14px" size="small" @click="disconnectDevice">
                断开蓝牙
              </el-button>
              <el-button
                class="!m0 text-14px"
                size="small"
                :disabled="targetDevice !== null"
                @click="scan"
              >
                扫描蓝牙
              </el-button>
            </div>
          </fieldset>
          <fieldset class="border='[1px_solid_#ccc]' p-8px text-14px">
            <legend class="text-#606266 px-10px">数据处理</legend>
            <el-checkbox v-model="sendNewLine" label="发送新行"></el-checkbox>
            <el-checkbox v-model="receive200k" label="接收200k清屏"></el-checkbox>
            <el-checkbox
              v-model="receiveHex"
              label="16进制显示"
              @change="listenHexDisplay"
            ></el-checkbox>
            <el-checkbox v-model="sendHex" label="16进制发送"></el-checkbox>
          </fieldset>
          <fieldset class="border='[1px_solid_#ccc]' p-8px text-14px">
            <legend class="text-#606266 px-10px">发送操作</legend>
            <div class="flex items-center text-12px">
              <div class="flex items-center mr-6px text-12px">
                <div class="whitespace-nowrap">周期：</div>
                <el-input v-model="interval" class="flex-1" size="small" />
              </div>
              <el-checkbox v-model="loopSend">循环发送</el-checkbox>
            </div>
            <div class="flex flex-col items-center w-full justify-center">
              <el-button class="w-full !mx-0px mb-8px text-14px" @click="clearReceive">
                清除接收
              </el-button>
              <el-button class="w-full !mx-0px mb-8px text-14px" @click="clearSend">
                清空发送
              </el-button>
              <el-button class="w-full !mx-0px text-14px" @click="sendData">发送数据</el-button>
            </div>
          </fieldset>
        </div>
        <div class="flex flex-col flex-1 w-full items-center text-12px mt-8px">
          <fieldset v-if="deviceService" class="w-full border='[1px_solid_#ccc]' p-8px text-14px">
            <legend class="text-#606266 px-10px">设置服务</legend>
            <div class="service">
              <el-form label-width="auto" :disabled="loopSend">
                <el-form-item label="uuid：" class="mb-0">
                  <el-select
                    v-model="serviceData.uuid"
                    class="flex-1"
                    size="small"
                    @change="selectUuid"
                  >
                    <el-option
                      v-for="service in deviceService"
                      :key="service.uuid"
                      :label="service.label"
                      :value="service.uuid"
                      class="text-12px"
                    />
                  </el-select>
                </el-form-item>
                <!-- <el-form-item label="read：" class="mb-0">
                  <el-select
                    v-model="serviceData.read"
                    :disabled="!serviceData.uuid"
                    size="small"
                    class="flex-1"
                  >
                    <el-option
                      v-for="item in characteristics"
                      :key="item.uuid"
                      :label="item.uuid"
                      :value="item.uuid"
                      class="text-12px"
                    />
                  </el-select>
                </el-form-item> -->
                <el-form-item label="write：" class="mb-0">
                  <el-select
                    v-model="serviceData.write"
                    :disabled="!serviceData.uuid"
                    size="small"
                    class="flex-1"
                  >
                    <el-option
                      v-for="item in characteristics"
                      :key="item.uuid"
                      :label="item.label"
                      :value="item.uuid"
                      class="text-12px"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="notify：" class="mb-0">
                  <el-select
                    v-model="serviceData.notify"
                    :disabled="!serviceData.uuid"
                    size="small"
                    class="flex-1"
                    @change="subscribeData"
                  >
                    <el-option
                      v-for="item in characteristics"
                      :key="item.uuid"
                      :label="item.label"
                      :value="item.uuid"
                      class="text-12px"
                    />
                  </el-select>
                </el-form-item>
              </el-form>
            </div>
          </fieldset>
          <div class="flex w-full items-center justify-around mt-auto">
            <div>R：0</div>
            <div>S：0</div>
            <div>V：0.0.1</div>
          </div>
        </div>
      </el-aside>
    </el-container>
  </div>
</template>

<style lang="scss" scoped>
.scrollbar-demo-item {
  display: flex;
  align-items: center;
  height: 50px;
  margin: 4px;
  border-radius: 4px;
  background: var(--el-color-primary-light-1);
  color: var(--el-color-primary);
}

:deep(.h-input) .el-textarea__inner {
  height: 100%;
  resize: none;
  border: 1px solid #6c6c6c;
}

:deep(.h-input) .el-textarea__inner:focus {
  box-shadow: none;
}

:deep(.h-input) .el-textarea__inner:focus-visible {
  outline: none;
}

:deep(.service) .el-form-item__label {
  padding: 0;
}
</style>
