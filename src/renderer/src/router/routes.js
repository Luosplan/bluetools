// 静态导入所有页面组件，减少生产环境加载时间
import Layout from '@renderer/layout/index.vue'
import Dashboard from '@views/dashboard.vue'

const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/scan',
    children: [
      {
        path: 'scan',
        component: () => import('@views/scan/index.vue'),
        meta: { title: '设备录入', show: true, icon: 'icon-scan' }
      },
      {
        path: 'test',
        component: () => import('@views/test/index.vue'),
        meta: { title: '测试看板', show: true, icon: 'icon-flask-line' }
      },
      {
        path: 'settings',
        component: () => import('@views/settings/index.vue'),
        meta: { title: '设置界面', show: true, icon: 'icon-settings' }
      },
      {
        path: 'dashboard',
        component: Dashboard,
        meta: { title: '主页面', show: false, icon: 'icon-dashboard' }
      }
    ]
  }
]

export default routes
