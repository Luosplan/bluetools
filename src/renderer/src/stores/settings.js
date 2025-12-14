import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // 应用设置
    app: {
      autoUpdate: true,
      theme: 'light',
      language: 'zh-CN',
      checkUpdateOnStart: true
    },

    // 通用设置
    general: {
      // 可以在这里添加通用设置
    },

    // 蓝牙设置
    bluetooth: {
      scanInterval: 5000,
      autoConnect: false,
      showRSSI: true,
      filterBySignalStrength: false,
      minRSSI: -70
    },

    // 蓝牙服务设置
    bluetoothServices: {
      mainService: '0000fe60-0000-1000-8000-00805f9b34fb',
      writeCharacteristic: '0000fe61-0000-1000-8000-00805f9b34fb',
      notifyCharacteristic: '0000fe62-0000-1000-8000-00805f9b34fb'
    },

    // 扫描过滤设置
    scanFilters: {
      nameFilters: ['ecv02']
    },

    // 数据处理设置
    data: {
      sendHex: false,
      receiveHex: false,
      sendNewLine: false,
      receive200k: false,
      loopSend: false,
      loopInterval: 500
    },

    // UI设置
    ui: {
      sidebarCollapsed: false,
      showToolbar: true,
      fontSize: 14,
      showStatusBar: true
    }
  }),

  getters: {
    isDarkTheme: (state) => state.app.theme === 'dark',
    effectiveScanInterval: (state) => state.bluetooth.scanInterval
  },

  actions: {
    // 保存设置到本地存储
    saveSettings() {
      try {
        localStorage.setItem('bluetools-settings', JSON.stringify(this.$state))
        console.log('设置已保存到本地存储')
      } catch (error) {
        console.error('保存设置失败:', error)
      }
    },

    // 从本地存储加载设置
    loadSettings() {
      try {
        const savedSettings = localStorage.getItem('bluetools-settings')
        if (savedSettings) {
          this.$patch(JSON.parse(savedSettings))
          console.log('从本地存储加载设置成功')
        }
      } catch (error) {
        console.error('加载设置失败:', error)
      }
    },

    // 更新应用设置
    updateAppSettings(settings) {
      this.app = { ...this.app, ...settings }
      this.saveSettings()
    },

    // 更新蓝牙设置
    updateBluetoothSettings(settings) {
      this.bluetooth = { ...this.bluetooth, ...settings }
      this.saveSettings()
    },

    // 更新数据处理设置
    updateDataSettings(settings) {
      this.data = { ...this.data, ...settings }
      this.saveSettings()
    },

    // 更新UI设置
    updateUISettings(settings) {
      this.ui = { ...this.ui, ...settings }
      this.saveSettings()
    },

    // 重置设置到默认值
    resetSettings() {
      this.$reset()
      this.saveSettings()
    },

    // 切换主题
    toggleTheme() {
      this.app.theme = this.app.theme === 'light' ? 'dark' : 'light'
      this.applyTheme()
      this.saveSettings()
    },

    // 应用主题
    applyTheme() {
      const isDark = this.app.theme === 'dark'
      document.documentElement.classList.toggle('dark', isDark)
      // 这里可以添加更多主题应用逻辑
    },

    // 切换侧边栏折叠状态
    toggleSidebar() {
      this.ui.sidebarCollapsed = !this.ui.sidebarCollapsed
      this.saveSettings()
    }
  },

  // 持久化设置
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'bluetools-settings',
        storage: localStorage
      }
    ]
  }
})
