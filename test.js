// const cmd = '0105E86034706486800700E9100001633130313032303530363066FFFFFF'
const cmd = '0105E86034706486800700E9100063313031303230353036306401FFFFFFF5AF'
function hexStringToByteArray(hexString) {
  const len = hexString.length
  const data = new Array(len / 2)
  for (let i = 0; i < len; i += 2) {
    // 将两个十六进制字符合并为一个字节，并转换为 Java 有符号 byte 表示
    const unsignedByte = parseInt(hexString.substring(i, i + 2), 16)
    data[i / 2] = toSignedByte(unsignedByte)
  }
  console.log(data.length)

  return data
}
function toSignedByte(value) {
  // 转换为有符号 byte 表示
  return value > 127 ? value - 256 : value
}

// 使用示例
const byteArray = hexStringToByteArray(cmd) // 示例字节数组（"Hello"的字节表示）

function intToByteArray(iSource, arrayLen) {
  // Convert an integer to a byte array of specified length
  let byteArray = []
  for (let i = 0; i < arrayLen; i++) {
    byteArray.push((iSource >> (8 * i)) & 0xff)
  }
  return byteArray
}

function byteArrayToInt(byteArray) {
  // Convert a byte array to an integer
  let outcome = 0
  for (let i = 0; i < byteArray.length; i++) {
    outcome += (byteArray[i] & 0xff) << (8 * i)
  }
  return outcome
}
// const fillString = (str) => {
//   if(str.length % 16 !== 0) {
//     const len = Math.ceil(str.length / 16)
//     let res = len*16 - str.length
//     return new Array(res).fill('F').join('')
//   }
//   return ''
// }
function crc16(source) {
  console.log(source, source.length, 'source')

  // Initialize polynomial and register
  let reg = intToByteArray(0xffff, 2)
  let ploy = intToByteArray(0xffff, 2)

  source.forEach((data) => {
    // Treat data as unsigned byte
    data = data & 0xff
    // Update polynomial
    ploy[0] = reg[1]
    ploy[1] = reg[0]
    ploy[0] ^= data

    // Perform register calculations
    reg = intToByteArray(byteArrayToInt(ploy) ^ ((byteArrayToInt(ploy) & 0xff) >> 4), 2)
    reg = intToByteArray(byteArrayToInt(reg) ^ (byteArrayToInt(reg) << 12), 2)
    reg = intToByteArray(byteArrayToInt(reg) ^ ((byteArrayToInt(reg) & 0xff) << 5), 2)
  })

  return reg
}
// [63, 57]
const res = crc16(byteArray)
  .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0')) // Convert to hex and ensure 2 characters
  .join('')
console.log(res)
console.log(crc16(byteArray))
