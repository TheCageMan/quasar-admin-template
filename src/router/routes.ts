/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { RouteConfig, Route, NavigationGuardNext } from 'vue-router';
import { getModule } from 'vuex-module-decorators'
import AuthStoreModule from '@/store/auth';
import { SessionStorage } from 'quasar';

export default function (app, store) {
  // @ts-expect-error can't figure out how to remove TS error
  const authStoreModule = getModule(AuthStoreModule, store) as AuthStoreModule

  const r: RouteConfig[] = [
    {
      path: '/login',
      name: 'Login',
      component: () => import('pages/auth/login.vue'),
      meta: {
        allowAnonymous: true
      }
    },
    {
      path: '/logout',
      name: 'Logout',
      meta: {
        allowAnonymous: true,
        redirect: '/login'
      },
      beforeEnter: async (to: Route, from: Route, next: NavigationGuardNext<Vue>) => {
        try {
          await authStoreModule.logout()
        } catch (err) {
          app.$ai.trackException({ exception: err })
        } finally {
          next(to.meta.redirect || '/login')
        }
      }
    },
    {
      path: '/',
      component: () => import('layouts/MainLayout.vue'),
      children: [
        { path: '', alias: '/dashboard', component: () => import('pages/dashboard.vue') },
        { path: '/customer_management', component: () => import('pages/customer_management.vue') },
        { path: '/change_request', component: () => import('pages/change_request.vue') },
        { path: '/my_profile', component: () => import('pages/my_profile.vue') },
        { path: '/sales_invoices', component: () => import('pages/sales_invoices.vue') },
        { path: '/quotes', component: () => import('pages/quotes.vue') },
        { path: '/transactions', component: () => import('pages/transactions.vue') },
        { path: '/employee_salary_list', component: () => import('pages/employee_salary_list.vue') },
        { path: '/department', component: () => import('pages/department.vue') },
      ]
    },
    {
      path: '/auth',
      redirect: '/login',
      name: 'Auth',
      component: {
        render(c) { return c('router-view') }
      },
      meta: {
        allowAnonymous: true
      },
      children: [
        {
          path: 'forbidden',
          name: 'AccessForbidden',
          component: () => import('pages/auth/denied.vue'),
          meta: {
            allowAnonymous: true
          }
        },
        {
          path: 'logout',
          meta: {
            allowAnonymous: false
          },
          beforeEnter: (to: Route, from: Route, next: NavigationGuardNext<Vue>) => {
            try {
              authStoreModule.reset()
            } catch (err) {
              app.$ai.trackException({ exception: err })
            } finally {
              next()
            }
          }
        },
        {
          path: 'callback',
          name: 'AuthCallback',
          meta: {
            allowAnonymous: true
          },
          beforeEnter: async (to: Route, from: Route, next: NavigationGuardNext<Vue>) => {
            const redirect = SessionStorage.getItem('app:lastRoute') as string | null
            next(redirect || '/')
          }
        },
      ]
    },
  ]

  // // Always leave this as last one
  if (process.env.MODE !== 'ssr') {
    r.push({
      path: '*',
      component: () => import('pages/Error404.vue')
    })
  }

  return r;
}
