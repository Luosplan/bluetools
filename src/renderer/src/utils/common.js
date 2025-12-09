/**
 * formatSizeUnits 获取数据大小
 * @param {string} data
 * @returns {string} bytes
 */
export const formatSizeUnits = (data) => {
  const bytes = new TextEncoder().encode(data).length
  return bytes
}

/**
 * stringToHex 字符串转16进制
 * @param {string} str
 * @returns {string} hex
 */
export const stringToHex = (str) => {
  let hex = ''
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16)
  }
  return hex
}

/**
 * hexToString 16进制转字符串
 * @param {string} hex
 * @returns {string} str
 */
export const hexToString = (hex) => {
  let str = ''
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16))
  }
  return str
}

/**
 * bufferToHex buffer转hex
 * @param {Buffer} buffer
 * @returns {string} hex
 */
export const bufferToString = (buffer) => {
  console.log(buffer)
  let str = ''
  for (let i = 0; i < buffer.length; i++) {
    str += String.fromCharCode(buffer[i])
  }
  return str
}

// `@abandonware/noble` 处理 UUID 时，如果遇到设备返回的是 16 位 UUID，它会自动显示简短版本
/**
 * convertTo128BitUUID UUID 转换格式化
 * @param {string} shortUUID UUID
 * @returns {string} UUID
 */
export const convertTo128BitUUID = (shortUUID) => {
  if (shortUUID.length === 4) {
    return `0000${shortUUID}-0000-1000-8000-00805f9b34fb`
  } else if (shortUUID.length === 8) {
    return `${shortUUID}-0000-1000-8000-00805f9b34fb`
  } else if (shortUUID.length === 32) {
    return `${shortUUID.slice(0, 8)}-${shortUUID.slice(8, 12)}-${shortUUID.slice(12, 16)}-${shortUUID.slice(16, 20)}-${shortUUID.slice(20, 32)}`
  } else {
    return shortUUID
  }
}
