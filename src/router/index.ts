import VueRouter, { Route, NavigationGuardNext } from 'vue-router'
import { getModule } from 'vuex-module-decorators'
import AuthStoreModule from '@/store/auth'
import VuexBroadcast from '@/store/plugins/broadcast'
import routes from './routes'
import { SessionStorage } from 'quasar'

const AuthGuard = (app, authStore: AuthStoreModule) => async (to: Route, from: Route, next: NavigationGuardNext<Vue>) => {
  if (to.matched.some(record => record.meta.allowAnonymous == true)) {
    next()
  } else {
    try {
      const loggedIn = await authStore.isAuthenticated()
      if (loggedIn) {
        next()
      } else {
        next({ name: 'Login' })
      }
    } catch (err) {
      app.$ai.trackException({ exception: err })
      next(false)
    }
  }
}

const AfterEachGuard = (to: Route) => {
  if (to.name !== 'Login') {
    SessionStorage.set('app:lastRoute', to.path)
  }
}

export default async function ({ app, store, Vue }): Promise<VueRouter> {
  Vue.use(VueRouter)

  await store.restored

  await VuexBroadcast({
    moduleName : 'BroadcastModule',
    enableLeaderElection: true,
    mainChannelName: 'BroadcastChannel'
  })(store)

  const authStore = getModule(AuthStoreModule, store)
  await authStore.initStore()

  const router: VueRouter = new VueRouter({
    scrollBehavior: () => ({ x: 0, y: 0 }),

    routes: routes(app, store),

    // Leave these as is and change from quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    mode: process.env.VUE_ROUTER_MODE,
    base: process.env.VUE_ROUTER_BASE
  })

  router.beforeEach(AuthGuard(app, authStore))
  router.afterEach(AfterEachGuard)

  return router;
}
