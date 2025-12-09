import EventRoute from './EventRoute'
import { join } from 'path'

const routers = []

// 主窗口路由
routers.push(
  new EventRoute('open-main-window', 'event', (api) => {
    const { BrowserWindow } = api
    let mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    })
    mainWindow.on('ready-to-show', () => {
      mainWindow.setTitle('BlueTools')
    })
    if (process.env.NODE_ENV === 'development') {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/#/dashboard')
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/dashboard' })
    }
    mainWindow.on('closed', () => {
      mainWindow = null
    })
  })
)

// 蓝牙窗口路由
routers.push(
  new EventRoute('open-bluetooth-window', 'event', (api) => {
    const { BrowserWindow } = api
    let bluetoothWindow = new BrowserWindow({
      width: 900,
      height: 670,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    })
    bluetoothWindow.on('ready-to-show', () => {
      bluetoothWindow.setTitle('蓝牙测试工具')
    })
    if (process.env.NODE_ENV === 'development') {
      bluetoothWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/#/bluetooth')
    } else {
      bluetoothWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/bluetooth' })
    }
    bluetoothWindow.on('closed', () => {
      bluetoothWindow = null
    })
  })
)

// 设备录入窗口路由
routers.push(
  new EventRoute('open-scan-window', 'event', (api) => {
    const { BrowserWindow } = api
    let scanWindow = new BrowserWindow({
      width: 1000,
      height: 800,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    })
    scanWindow.on('ready-to-show', () => {
      scanWindow.setTitle('BlueTools-设备录入')
    })
    if (process.env.NODE_ENV === 'development') {
      scanWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/#/scan')
    } else {
      scanWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/scan' })
    }
    scanWindow.on('closed', () => {
      scanWindow = null
    })
  })
)

// 测试看板窗口路由
routers.push(
  new EventRoute('open-test-window', 'event', (api) => {
    const { BrowserWindow } = api
    let testWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    })
    testWindow.on('ready-to-show', () => {
      testWindow.setTitle('BlueTools-测试看板')
    })
    if (process.env.NODE_ENV === 'development') {
      testWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/#/test')
    } else {
      testWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/test' })
    }
    testWindow.on('closed', () => {
      testWindow = null
    })
  })
)

// 文件选择路由
routers.push(
  new EventRoute('select-file', 'event', async (api) => {
    const { dialog, mainWindow, fs } = api
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      alwaysOnTop: true,
      title: '选择文件'
    })
    if (result.canceled) {
      return null
    } else {
      const filePath = result.filePaths[0]
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        return {
          code: 200,
          filePath,
          fileContent
        }
      } catch (e) {
        return {
          code: 500,
          filePath,
          fileContent: '读取文件时出错'
        }
      }
    }
  })
)

export default routers
