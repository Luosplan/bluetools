// 静态导入所有页面组件，减少生产环境加载时间
import Dashboard from '@renderer/views/dashboard.vue'
import Scan from '@renderer/views/scan.vue'
import Test from '@renderer/views/test.vue'
import Bluetooth from '@renderer/views/bluetooth.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    component: Dashboard,
    meta: {
      title: '主页面'
    }
  },
  {
    path: '/scan',
    component: Scan,
    meta: {
      title: '设备录入'
    }
  },
  {
    path: '/test',
    component: Test,
    meta: {
      title: '测试看板'
    }
  },
  {
    path: '/bluetooth',
    component: Bluetooth,
    meta: {
      title: '蓝牙通信'
    }
  }
]

export default routes
