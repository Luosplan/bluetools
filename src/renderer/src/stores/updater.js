import { defineStore } from 'pinia'

// 在渲染进程中，必须通过 window.ipcRenderer 访问，不能直接导入
const ipcRenderer = window.ipcRenderer

export const useUpdaterStore = defineStore('updater', {
  state: () => ({
    isChecking: false,
    isDownloading: false,
    updateAvailable: false,
    updateDownloaded: false,
    progress: 0,
    latestVersion: '',
    currentVersion: '',
    releaseNotes: '',
    releaseDate: null,
    error: null
  }),

  getters: {
    isUpdateInProgress: (state) => state.isChecking || state.isDownloading,
    isReadyToInstall: (state) => state.updateDownloaded
  },

  actions: {
    // 初始化更新器
    init() {
      // 监听主进程的更新事件
      ipcRenderer.on('update-available', (info) => {
        console.log(info);
        if (!info) return
        this.updateAvailable = true
        this.latestVersion = info.version || ''
        this.releaseNotes = info.releaseNotes || ''
        this.releaseDate = info.releaseDate ? new Date(info.releaseDate) : null
        this.error = null
      })

      ipcRenderer.on('download-progress', (event, progress) => {
        if (!progress) return
        this.progress = progress.percent || 0
        this.isDownloading = true
      })

      ipcRenderer.on('update-downloaded', (event, info) => {
        if (!info) return
        this.isDownloading = false
        this.updateDownloaded = true
        this.latestVersion = info.version || ''
      })

      ipcRenderer.on('update-error', (error) => {
        this.isChecking = false
        this.isDownloading = false
        this.error = error || null
        this.updateAvailable = false
      })

      // 监听主进程发送的 app-version 事件来获取当前版本
      ipcRenderer.on('app-version', (event, info) => {
        if (!info) return
        this.currentVersion = info.version || ''
      })

      // 等待主进程发送版本号
    },

    // 检查更新
    checkForUpdates() {
      this.isChecking = true
      this.error = null
      this.updateAvailable = false
      this.updateDownloaded = false
      this.progress = 0

      // 向主进程发送检查更新请求
      ipcRenderer.send('check-for-updates')
    },

    // 下载更新
    downloadUpdate() {
      if (!this.updateAvailable || this.isDownloading) return

      this.isDownloading = true
      this.progress = 0

      // 向主进程发送下载更新请求
      ipcRenderer.send('download-update')
    },

    // 安装更新
    installUpdate() {
      if (!this.updateDownloaded) return

      // 这里应该调用主进程的安装更新方法
      // 通常主进程会在下载完成后自动弹出安装提示
    },

    // 忽略当前更新
    ignoreUpdate() {
      this.updateAvailable = false
      this.latestVersion = ''
      this.releaseNotes = ''
      this.releaseDate = null
    },

    // 重置更新状态
    resetUpdateState() {
      this.isChecking = false
      this.isDownloading = false
      this.updateAvailable = false
      this.updateDownloaded = false
      this.progress = 0
      this.error = null
    },

    // 清理事件监听器
    cleanup() {
      ipcRenderer.removeAllListeners('update-available')
      ipcRenderer.removeAllListeners('download-progress')
      ipcRenderer.removeAllListeners('update-downloaded')
      ipcRenderer.removeAllListeners('update-error')
      ipcRenderer.removeAllListeners('app-version')
    }
  }
})
