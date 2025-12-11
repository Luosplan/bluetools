// 蓝牙通信协议工具类
// 实现读取实时数据(蓝牙)命令(0xB0)的构建和解析

/**
 * 将MAC地址转换为十六进制字符串
 * @param {string} macAddress - MAC地址，如 "00:11:22:33:44:55"
 * @returns {string} - 十六进制字符串，如 "001122334455000000000000"
 */
export function convertMacAddressToHex(macAddress) {
  // 去除MAC地址中的冒号
	let cleanedMac = macAddress.replace(/:/g, '');
	// 检查去除冒号后的MAC地址长度是否为12
	if (cleanedMac.length !== 12) {
		return proxy.$modal.msgError('MAC地址有误');
	}
	// 将每个字符转换为ASCII码并转换为16进制
	let asciiHex = '';
	for (let i = 0; i < cleanedMac.length; i++) {
		let charCode = cleanedMac.charCodeAt(i);
		asciiHex += charCode.toString(16).padStart(2, '0').toUpperCase();
	}
	// 确保结果占用D0-D11，即长度为24个字符
	let paddedAsciiHex = asciiHex.padEnd(24, '0');
	return paddedAsciiHex;
}

/**
 * 将十进制转换为十六进制并反转
 * @param {number} decimal - 十进制数
 * @returns {string} - 反转后的十六进制字符串
 */
export function decimalToHexadecimalReversed(decimal) {
   if (decimal % 16 !== 0) {
    decimal += (16 - (decimal % 16)); // 调整为下一个16的倍数
  }
  let hex = decimal.toString(16).toUpperCase().padStart(4, '0')
  let reversedHex = hex.substr(2, 2) + hex.substr(0, 2)
  return reversedHex
}

/**
 * 填充字符串
 * @param {string} str - 原始字符串
 * @returns {string} - 填充后的字符串
 */
export function fillString(str) {
  if(str.length % 16 !== 0) {
    const len = Math.ceil(str.length / 16)
    let res = len*16 - str.length
    return new Array(res).fill('F').join('') 
  }
  return ''
}

/**
 * 将十六进制字符串转换为字节数组
 * @param {string} hexString - 十六进制字符串
 * @returns {Uint8Array} - 字节数组
 */
export function hexStringToByteArray(hexString) {
  const len = hexString.length; 
  const data = new Uint8Array(len / 2); 
  for (let i = 0; i < len; i += 2) { 
    // 将两个十六进制字符合并为一个字节，并转换为 Java 有符号 byte 表示 
    const unsignedByte = parseInt(hexString.substring(i, i + 2), 16); 
    data[i / 2] = toSignedByte(unsignedByte); 
  }
  return data;
}

/**
 * 计算CRC16校验和
 * @param {Uint8Array} source - 字节数组
 * @returns {string} - CRC16校验和，十六进制字符串
 */
export function crc16(source) {
  let reg = intToByteArray(0xFFFF, 2)
  let ploy = intToByteArray(0xFFFF, 2)
  source.forEach(data => {
    data = data & 0xFF
    ploy[0] = reg[1]
    ploy[1] = reg[0]
    ploy[0] ^= data
    reg = intToByteArray(byteArrayToInt(ploy) ^ ((byteArrayToInt(ploy) & 0xFF) >> 4), 2)
    reg = intToByteArray(byteArrayToInt(reg) ^ (byteArrayToInt(reg) << 12), 2);
    reg = intToByteArray(byteArrayToInt(reg) ^ ((byteArrayToInt(reg) & 0xFF) << 5), 2)
  });
  const reslut = reg.map(byte => byte.toString(16).toUpperCase().padStart(2, "0")).join("")
  return reslut
}

/**
 * 将十六进制字符串转换为Buffer
 * @param {string} hexString - 十六进制字符串
 * @returns {Buffer} - Buffer对象
 */
export function hexStringToBuffer(hexString) {
  const buffer = Buffer.alloc(hexString.length / 2); 
  for (let i = 0; i < hexString.length; i += 2) { 
    // 将两个十六进制字符合并为一个字节 
    const byte = parseInt(hexString.substring(i, i + 2), 16); 
    buffer[i / 2] = byte;
  }
  return buffer;
}

/**
 * 将数据拆分为指定大小的包
 * @param {Buffer} data - 要拆分的数据
 * @param {number} packetSize - 包大小，默认20
 * @returns {Buffer[]} - 拆分后的包数组
 */
export function splitDataIntoPackets(data, packetSize = 20) {
  const packets = [];
  const dataLength = data.length;
  
  for (let i = 0; i < dataLength; i += packetSize) {
    const end = Math.min(i + packetSize, dataLength);
    const packet = data.slice(i, end);
    packets.push(packet);
  }
  
  return packets;
}

/**
 * 构建读取实时数据命令(0xB0)
 * @param {Object} options - 命令参数
 * @param {string} options.deviceType - 设备类型
 * @param {string} options.tableId - 网关编号
 * @param {string} options.mac - 网关MAC地址
 * @param {number} [packetSize=20] - 分包大小，默认20
 * @returns {Buffer[]} - 构建好的命令缓冲区数组，包含分包后的命令
 */
export function buildReadRealtimeDataCmd(options, packetSize = 20) {
  const { tableId, mac } = options

  // 构建数据命令对象
  const dataCmd = {
    ver: '01',
    type: '06',
    tableId: tableId,
    key: '00',
    cmd: 'B0',
    length: '',
    data: '',
    replit: 'FFFFFF',
    cs: ''
  }

  // 填充数据域
  if (mac) {
    dataCmd.data = convertMacAddressToHex(mac)
  }

  // 计算长度
  dataCmd.length = decimalToHexadecimalReversed(dataCmd.data.length / 2)

  // 填充替换字段
  dataCmd.replit = fillString(dataCmd.data)

  // 计算校验和
  const dataToCheck = Object.values(dataCmd).join('')
  const byteArray = hexStringToByteArray(dataToCheck)
  dataCmd.cs = crc16(byteArray)
  console.log(dataCmd);
  // 构建完整命令
  const head = 'AA'
  const end = '55'
  const res = head + Object.values(dataCmd).join('') + end
  console.log(res.toUpperCase());

  // 转换为Buffer
  const fullCommand = hexStringToBuffer(res.toUpperCase())
  // 分包发送，默认包大小20
  return splitDataIntoPackets(fullCommand, packetSize)
}

/**
 * 构建开阀命令(0xB1)
 * @param {Object} options - 命令参数
 * @param {string} options.deviceType - 设备类型
 * @param {string} options.tableId - 网关编号
 * @param {string} options.mac - 网关MAC地址
 * @param {number} [packetSize=20] - 分包大小，默认20
 * @returns {Buffer[]} - 构建好的命令缓冲区数组，包含分包后的命令
 */
export function buildOpenValveCmd(options, packetSize = 20) {
  const { tableId, mac } = options

  // 构建数据命令对象
  const dataCmd = {
    ver: '01',
    type: '06',
    tableId: tableId,
    key: '00',
    cmd: 'E9',
    length: '',
    data: '',
    replit: 'FFFFFF',
    cs: ''
  }

  // 填充数据域
  if (mac) {
    dataCmd.data = convertMacAddressToHex(mac)
  }

  // 计算长度
  dataCmd.length = decimalToHexadecimalReversed(dataCmd.data.length / 2)

  // 填充替换字段
  dataCmd.replit = fillString(dataCmd.data)

  // 计算校验和
  const dataToCheck = Object.values(dataCmd).join('')
  const byteArray = hexStringToByteArray(dataToCheck)
  dataCmd.cs = crc16(byteArray)

  // 构建完整命令
  const head = 'AA'
  const end = '55'
  const res = head + Object.values(dataCmd).join('') + end

  // 转换为Buffer并分包返回
  const fullCommand = hexStringToBuffer(res)
  return splitDataIntoPackets(fullCommand, packetSize)
}

/**
 * 构建关阀命令(0xB2)
 * @param {Object} options - 命令参数
 * @param {string} options.deviceType - 设备类型
 * @param {string} options.tableId - 网关编号
 * @param {string} options.mac - 网关MAC地址
 * @param {number} [packetSize=20] - 分包大小，默认20
 * @returns {Buffer[]} - 构建好的命令缓冲区数组，包含分包后的命令
 */
export function buildCloseValveCmd(options, packetSize = 20) {
  const { tableId, mac } = options

  // 构建数据命令对象
  const dataCmd = {
    ver: '01',
    type: '06',
    tableId: tableId,
    key: '00',
    cmd: 'E9',
    length: '',
    data: '',
    replit: 'FFFFFF',
    cs: ''
  }

  // 填充数据域
  if (mac) {
    dataCmd.data = convertMacAddressToHex(mac)
  }

  // 计算长度
  dataCmd.length = decimalToHexadecimalReversed(dataCmd.data.length / 2)

  // 填充替换字段
  dataCmd.replit = fillString(dataCmd.data)

  // 计算校验和
  const dataToCheck = Object.values(dataCmd).join('')
  const byteArray = hexStringToByteArray(dataToCheck)
  dataCmd.cs = crc16(byteArray)
  
  // 构建完整命令
  const head = 'AA'
  const end = '55'
  const res = head + Object.values(dataCmd).join('') + end

  // 转换为Buffer并分包返回
  const fullCommand = hexStringToBuffer(res.toUpperCase())
  return splitDataIntoPackets(fullCommand, packetSize)
}

/**
 * 解析读取实时数据响应
 * @param {Buffer} response - 响应数据缓冲区
 * @returns {Object} - 解析后的数据对象
 */
export function parseReadRealtimeDataResponse(response) {
  if (!Buffer.isBuffer(response) || response.length < 10) {
    throw new Error('无效的响应数据')
  }
  console.log('response', response.length);
  // 转换为十六进制字符串进行处理
  const hexString = arrayBufferToHex(response)
  console.log(hexString);
  const dataStr = hexString.substr(98, 32)
  const rsData = parseDataField(dataStr)
  console.log(rsData);
  return rsData
}

/**
 * 解析数据域
 * @param {string} dataField - 数据域十六进制字符串
 * @returns {Object} - 解析后的数据域对象，包含设备信息和解析后的数据
 */
function parseDataField(dataField) {
  console.log('dataField', dataField);
  // if (dataField.length < 64) {
  //   throw new Error('数据域长度不足')
  // }

  // 解析设备信息
  const deviceInfo = {
    padding: dataField.substring(0, 4), // D0-D1: 补位 (0x07 无实际意义，HEX码)
    reserved: dataField.substring(4, 32), // D2-D15: 预留，全固定为0x4F
    deviceAddress: dataField.substring(32, 56), // D16-D27: 表地址
    firmwareVersion: dataField.substring(56, 60) // D28-D29: 固件版本
  }

  // 解析数据域 (D30-D45)，提取16字节数据用于设备数据解析
  const dataPayload = dataField.substring(60, 92)
  const parsedData = parseDeviceData(dataPayload)

  return {
    deviceInfo,
    ...parsedData
  }
}

/**
 * 将十六进制字符串转换为Uint8Array
 * @param {string} hexString - 十六进制字符串
 * @returns {Uint8Array} - Uint8Array对象
 */
function hexStringToUint8Array(hexString) {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return bytes;
}

const arrayBufferToHex = (buffer) => {
  const hexString = Array.from(buffer)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  return hexString
}

/**
 * 解析设备数据
 * @param {string} data - 设备数据十六进制字符串 (32字符，对应16字节)
 * @returns {Object} - 解析后的数据对象
 */
export function parseDeviceData(data) {
  // if (data.length !== 32) {
  //   throw new Error('设备数据长度错误')
  // }

  // 将十六进制字符串转换为Uint8Array，然后创建DataView
  const bytes = hexStringToUint8Array(data)
  const view = new DataView(bytes.buffer);
  
  // 解析基本数据
  let parsedData = {
    peakExpiratoryFlow: view.getFloat32(0, true).toFixed(3), // 流量值(4字节，Float类型，小端字节序)
    meterPressure: view.getUint32(4, true), // 绝压值(4字节，uint32类型，小端字节序)
    temperature: view.getInt16(8, true) / 100, // 温度值(2字节，int16类型，放大100倍，小端字节序)
    batteryVoltage: view.getUint16(10, true) / 100, // 电池电压(2字节，uint16类型，放大100倍，小端字节序)
  };
  
  // 解析设备状态 (2字节，小端字节序)
  const low = bytes[12];
  const high = bytes[13];
  const bits = (high << 8) | low; // 小端：低字节在前，高字节在后
  
  // 流体介质映射
  const fluidMediumMap = {
    0: "空气",
    1: "天然气",
    2: "液化石油气",
    3: "预留"
  };
  
  // 设备状态映射
  const deviceStatus = {
    valveStatus: String((bits >> 0) & 1), // 阀门状态
    leakAlarm: String((bits >> 1) & 1), // 泄漏报警
    pipelineLeak: String((bits >> 2) & 1), // 管道泄漏
    microFlow: String((bits >> 3) & 1), // 微流
    constantFlow1: String((bits >> 4) & 1), // 恒流1
    constantFlow2: String((bits >> 5) & 1), // 恒流2
    constantFlow3: String((bits >> 6) & 1), // 恒流3
    constantFlow4: String((bits >> 7) & 1), // 恒流4
    overFlow: String((bits >> 8) & 1), // 超流
    overTemp: String((bits >> 9) & 1), // 超温
    overPressure: String((bits >> 10) & 1), // 超压
    underPressure: String((bits >> 11) & 1), // 欠压
    pressureSensorFault: String((bits >> 12) & 1), // 压力传感器故障
    flowSensorFault: String((bits >> 13) & 1), // 流量传感器故障
    fluidMedium: fluidMediumMap[(bits >> 14) & 0x03] || "未知" // 流体介质
  };
  
  // 合并数据
  parsedData = { ...parsedData, ...deviceStatus };
  
  // 构建报警字符串
  const alarmMap = {
    leakAlarm: "报警器泄漏报警",
    pipelineLeak: "管道泄漏报警",
    microFlow: "微流报警",
    constantFlow1: "恒流1报警",
    constantFlow2: "恒流2报警",
    constantFlow3: "恒流3报警",
    constantFlow4: "恒流4报警",
    overFlow: "超流报警",
    overTemp: "超温报警",
    overPressure: "超压报警",
    underPressure: "欠压报警",
    pressureSensorFault: "压力传感器故障",
    flowSensorFault: "流量传感器故障"
  };
  
  parsedData.alarmStr = Object.entries(alarmMap)
    .filter(([key]) => deviceStatus[key] === '1')
    .map(([, msg]) => msg)
    .join("、");
  
  return parsedData;
}

/**
 * 解析设备状态
 * @param {number} status - 设备状态值(2字节)
 * @returns {Object} - 解析后的状态对象
 */
export function parseDeviceStatus(status) {
  // 将16位状态值转换为小端字节序处理
  const low = status & 0xFF;
  const high = (status >> 8) & 0xFF;
  const bits = (high << 8) | low; // 小端：低字节在前，高字节在后
  
  // 流体介质映射
  const fluidMediumMap = {
    0: "空气",
    1: "天然气",
    2: "液化石油气",
    3: "预留"
  };
  
  return {
    valveStatus: String((bits >> 0) & 1), // 阀门状态: 0-关闭, 1-打开
    leakAlarm: String((bits >> 1) & 1), // 报警器泄漏报警: 0-正常, 1-泄漏
    pipelineLeak: String((bits >> 2) & 1), // 管道泄漏报警: 0-正常, 1-泄漏
    microFlow: String((bits >> 3) & 1), // 微流: 0-正常, 1-报警
    constantFlow1: String((bits >> 4) & 1), // 恒流1: 0-正常, 1-报警
    constantFlow2: String((bits >> 5) & 1), // 恒流2: 0-正常, 1-报警
    constantFlow3: String((bits >> 6) & 1), // 恒流3: 0-正常, 1-报警
    constantFlow4: String((bits >> 7) & 1), // 恒流4: 0-正常, 1-报警
    overFlow: String((bits >> 8) & 1), // 超流: 0-正常, 1-报警
    overTemp: String((bits >> 9) & 1), // 超温: 0-正常, 1-报警
    overPressure: String((bits >> 10) & 1), // 超压: 0-正常, 1-报警
    underPressure: String((bits >> 11) & 1), // 欠压: 0-正常, 1-报警
    pressureSensorFault: String((bits >> 12) & 1), // 压力传感器故障: 0-正常, 1-故障
    flowSensorFault: String((bits >> 13) & 1), // 流量传感器故障: 0-正常, 1-故障
    fluidMedium: fluidMediumMap[(bits >> 14) & 0x03] || "未知" // 流体介质类型
  };
}

/**
 * 解析广播数据
 * @param {Buffer} advData - 广播数据缓冲区
 * @returns {Object} - 解析后的广播数据对象
 */
export function parseAdvertisementData(advData) {
  try {
    // 假设advData是完整的广播数据
    // 这里需要根据实际广播数据格式调整解析逻辑
    // 示例：从广播数据中提取设备状态等信息
    return {
      deviceId: advData.slice(0, 6).toString('hex'),
      rssi: advData.readInt8(6)
      // 其他广播数据解析...
    }
  } catch (error) {
    console.error('解析广播数据失败:', error)
    return null
  }
}

/**
 * 计算校验和
 * @param {Buffer} data - 需要计算校验和的数据
 * @returns {number} - 16位校验和
 */
export function calculateChecksum(data) {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += data.readUInt8(i)
  }
  return sum & 0xffff
}

/**
 * 将无符号字节转换为有符号字节
 * @param {number} unsignedByte - 无符号字节值(0-255)
 * @returns {number} - 有符号字节值(-128-127)
 */
function toSignedByte(unsignedByte) {
  if (unsignedByte > 127) {
    return unsignedByte - 256;
  }
  return unsignedByte;
}

/**
 * 将整数转换为指定长度的字节数组
 * @param {number} value - 要转换的整数
 * @param {number} length - 字节数组长度
 * @returns {Array} - 字节数组
 */
function intToByteArray(value, length) {
  const bytes = [];
  for (let i = 0; i < length; i++) {
    bytes[i] = (value >> (i * 8)) & 0xFF;
  }
  return bytes;
}

/**
 * 将字节数组转换为整数
 * @param {Array} byteArray - 字节数组
 * @returns {number} - 转换后的整数
 */
function byteArrayToInt(byteArray) {
  let value = 0;
  for (let i = 0; i < byteArray.length; i++) {
    value |= (byteArray[i] & 0xFF) << (i * 8);
  }
  return value;
}
