import { MsalAuthProvider, MSAL_CONFIG } from '@/services/auth.provider'
import { Action, Module, Mutation, VuexModule } from 'vuex-module-decorators'
import Identity from './identity'
import { appInsights } from '@/boot/ai'
import { DeferredPromise } from '@/minins/helper'

export interface IAuthState {
  id: string | undefined
  sid: string | undefined
  identity: Identity | undefined
}

const actionTypes = Object.freeze([
  '__setUser'
])

@Module({
  name: 'AuthStoreModule',
  namespaced: true
})
export default class AuthStoreModule extends VuexModule implements IAuthState {

  static readonly broadcast = true

  static isBroadcastAction = (name: string) => {
    // eslint-disable-next-line no-prototype-builtins
    return actionTypes.includes(name)
  }

  private _service!: MsalAuthProvider
  private _setUserPromise!: DeferredPromise

  id: string | undefined = undefined
  sid: string | undefined = undefined
  identity: Identity | undefined = undefined

  @Action
  public async initStore(): Promise<void> {
    console.info('AuthStoreModule: Initialize state')

    this._service = new MsalAuthProvider(MSAL_CONFIG)
    try {
      const result = await this._service.getRedirectPromise
      if (result) {
        this.__setUser({ accountId: result.accountId, sessionId: result.sid })
        this.__setIdentity(result.identity)
      } else {
        if (this.context.rootState.BroadcastModule.isLeader === false) {
          this._setUserPromise = new DeferredPromise(1000)
          await this._setUserPromise.wait()
        }
      }
    } catch (err) {
      appInsights.trackException({ exception: err })
    }
  }

  @Action
  public async isAuthenticated(): Promise<boolean> {
    const state: IAuthState = this.context.state as IAuthState

    if (state.id === undefined || state.sid === undefined) {
      return false
    }

    try {
      const account = this._service.getAccountById(state.id)
      if (account === null || state.identity === undefined) {
        await this._service.login(state.sid)
      }

      if (state.identity === undefined) {
        return false
      }

      // do addition identity checks
      // expireOn
      return true
    } catch (err) {
      appInsights.trackException({ exception: err })
      return false
    }
  }

  @Action
  public async getAccessToken(): Promise<string | void | null> {
    const state: IAuthState = this.context.state as IAuthState

    if (state.id === undefined || state.sid === undefined) {
      return null
    }

    try {
      return this._service.tryAccquireTokenRedirect(state.id, state.sid)
    } catch (err) {
      appInsights.trackException({ exception: err })
      return null
    }
  }

  @Action
  public async login(): Promise<void> {
    try {
      await this._service.login()
    } catch (err) {
      appInsights.trackException({ exception: err })
    }
  }

  @Action({ commit: 'reset' })
  public async logout(): Promise<void> {
    const state: IAuthState = this.context.state as IAuthState

    try {
      await this._service.logout(state.id)
    } catch (err) {
      appInsights.trackException({ exception: err })
    }
  }

  @Action
  private __setUser(val: { accountId: string, sessionId: string }) {
    const state: IAuthState = this.context.state as IAuthState

    if (this._setUserPromise) {
      this._setUserPromise.resolve()
    }

    if (state.id && state.sid) {
      return
    }

    if (val.accountId === state.id &&
      val.sessionId === state.sid) {
      return
    }

    this.set_user(val)
  }

  @Action
  private __setIdentity(val: Identity) {
    const state: IAuthState = this.context.state as IAuthState

    if (val === state.identity) {
      return
    }

    this.set_identity(val)
  }

  @Mutation
  reset() {
    this.identity = undefined
    this.id = undefined
    this.sid = undefined
  }

  @Mutation
  set_identity(val: Identity | undefined) {
    this.identity = val
  }

  @Mutation
  set_user(val: { accountId: string | undefined, sessionId: string | undefined }) {
    this.id = val.accountId
    this.sid = val.sessionId
  }
}
