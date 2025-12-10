import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/logo.png?asset'
import EventRouter from './router/EventRouter'
import routers from './router/router.template'
import fs from 'fs'
import { autoUpdater } from 'electron-updater'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 900,
    minHeight: 670,
    show: false,
    autoHideMenuBar: true,
    // ...(process.platform === 'linux' ? { icon } : {}),
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // 配置渲染进程中的安全选项
      sandbox: false, // 禁用沙盒模式以允许更多功能
      nodeIntegration: true, // 允许在渲染进程中使用 导入 Node.js API
      contextIsolation: false, // 禁用上下文隔离以简化开发
      //禁止使用 remote 模块 来与主进程交互 例如：渲染进程使用这种语法
      // const { remote } = require('electron') const { dialog } = remote
      enableRemoteModule: false
    }
  })

  // 添加调试日志，检查 preload 脚本路径是否正确
  console.log('Preload script path:', join(__dirname, '../preload/index.js'))
  console.log('Preload script exists:', fs.existsSync(join(__dirname, '../preload/index.js')))

  // 监听页面加载完成事件，确保所有资源都已加载
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.setTitle('蓝牙测试工具')
    mainWindow.show()
  })

  // 保留ready-to-show事件作为备用
  mainWindow.on('ready-to-show', () => {
    // 只有在页面加载完成后才显示窗口
    if (mainWindow.webContents.isLoading() === false) {
      mainWindow.setTitle('蓝牙测试工具')
      mainWindow.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 读取package.json获取版本号
  const packageJson = require('../../package.json')
  const appVersion = packageJson.version

  // 当页面加载完成后，发送版本号给渲染进程
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('app-version', {
      version: appVersion
    })
  })

  const eventRouter = new EventRouter()
  eventRouter.addApi('api', app)
  eventRouter.addApi('BrowserWindow', BrowserWindow)
  eventRouter.addApi('dialog', dialog)
  eventRouter.addApi('mainWindow', mainWindow)
  eventRouter.addApi('fs', fs)
  eventRouter.addRoutes(routers)
  ipcMain.on('renderer-to-main', (event, arg) => {
    eventRouter.router(arg)
  })
  ipcMain.handle('renderer-to-main-invoke', (event, arg) => {
    return eventRouter.router(arg)
  })

  // 监听渲染进程的检查更新请求
  ipcMain.on('check-for-updates', () => {
    console.log('收到检查更新请求')
    // 在开发环境中模拟更新检查
    if (is.dev) {
      console.log('开发环境：模拟更新检查')
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        // 模拟 2 秒后收到更新可用事件
        setTimeout(() => {
          mainWindow.webContents.send('update-available', {
            version: appVersion,
            releaseNotes: '修复了一些问题，添加了新功能',
            releaseDate: new Date().toISOString()
          })
        }, 2000)
      }
    } else {
      autoUpdater.checkForUpdates()
    }
  })

  // 监听渲染进程的下载更新请求
  ipcMain.on('download-update', () => {
    console.log('收到下载更新请求')
    // 在开发环境中模拟更新下载
    if (is.dev) {
      console.log('开发环境：模拟更新下载')
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        // 模拟下载进度
        let progress = 0
        const interval = setInterval(() => {
          progress += Math.floor(Math.random() * 10) + 1
          if (progress >= 100) {
            progress = 100
            clearInterval(interval)
            // 模拟下载完成
            setTimeout(() => {
              mainWindow.webContents.send('update-downloaded', {
                version: '1.0.1'
              })
            }, 500)
          }
          mainWindow.webContents.send('download-progress', {
            percent: progress
          })
        }, 300)
      }
    } else {
      autoUpdater.downloadUpdate()
    }
  })
}

// 配置自动更新
function setupAutoUpdater() {
  // 设置自动更新的日志
  autoUpdater.logger = console
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // 监听更新检查结果
  autoUpdater.on('update-available', (info) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info)
    }
  })

  // 监听更新下载进度
  autoUpdater.on('download-progress', (progress) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progress)
    }
  })

  // 监听更新下载完成
  autoUpdater.on('update-downloaded', (info) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info)
    }
    // 询问用户是否立即安装更新
    dialog
      .showMessageBox({
        type: 'info',
        title: '更新完成',
        message: '新版本已下载完成，是否立即安装并重启应用？',
        buttons: ['立即安装', '稍后安装']
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  // 监听更新错误
  autoUpdater.on('error', (error) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error)
    }
    console.error('更新错误:', error)
  })

  // 监听没有更新的情况
  autoUpdater.on('update-not-available', (info) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available', info)
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // 设置自动更新
  setupAutoUpdater()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
