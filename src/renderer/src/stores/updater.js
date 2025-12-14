import { defineStore } from 'pinia'
import { ipcRenderer } from 'electron'

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
      ipcRenderer.on('update-available', (event, info) => {
        this.updateAvailable = true
        this.latestVersion = info.version
        this.releaseNotes = info.releaseNotes || ''
        this.releaseDate = info.releaseDate ? new Date(info.releaseDate) : null
        this.error = null
      })

      ipcRenderer.on('download-progress', (event, progress) => {
        this.progress = progress.percent || 0
        this.isDownloading = true
      })

      ipcRenderer.on('update-downloaded', (event, info) => {
        this.isDownloading = false
        this.updateDownloaded = true
        this.latestVersion = info.version
      })

      ipcRenderer.on('update-error', (event, error) => {
        this.isChecking = false
        this.isDownloading = false
        this.error = error
        this.updateAvailable = false
      })

      // 获取当前应用版本
      this.currentVersion = process.env.npm_package_version || '1.0.0'
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
    }
  }
})
