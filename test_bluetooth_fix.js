// 简单的蓝牙功能测试脚本
const { useBluetoothStore } = require('./src/renderer/src/stores/bluetooth');

// 测试蓝牙Store的功能
async function testBluetoothStore() {
  console.log('开始测试蓝牙Store功能...');
  
  try {
    // 创建蓝牙Store实例
    const bluetoothStore = useBluetoothStore();
    
    // 测试初始化蓝牙
    console.log('测试初始化蓝牙...');
    await bluetoothStore.initBluetooth();
    console.log('蓝牙初始化成功');
    
    // 测试获取蓝牙状态
    console.log('当前蓝牙状态:', bluetoothStore.bluetoothState);
    
    // 测试开始扫描
    console.log('开始测试蓝牙扫描...');
    await bluetoothStore.startScan();
    console.log('蓝牙扫描开始');
    
    // 等待5秒后停止扫描
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 测试停止扫描
    console.log('停止蓝牙扫描...');
    bluetoothStore.stopScan();
    console.log('蓝牙扫描停止');
    
    // 测试获取设备列表
    console.log('扫描到的设备数量:', bluetoothStore.devices.length);
    
    console.log('蓝牙Store功能测试完成！');
  } catch (error) {
    console.error('蓝牙Store功能测试失败:', error);
  }
}

// 运行测试
testBluetoothStore();