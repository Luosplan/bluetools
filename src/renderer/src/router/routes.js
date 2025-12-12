// 静态导入所有页面组件，减少生产环境加载时间
import Dashboard from '@views/dashboard.vue'

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
]

export default routes
