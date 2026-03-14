import { createRouter, createWebHashHistory } from 'vue-router'
import PageView from '../views/PageView.vue'

const routes = [
  { path: '/', component: PageView },
  { path: '/p/:id', component: PageView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
