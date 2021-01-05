import Vue from 'vue'
import { Store } from 'vuex';
import { VuexModule } from 'vuex-module-decorators';
import { IRootState, store } from './index'

export function registerStoreModule(moduleName: string, storeModule: VuexModule, store: Store<IRootState>) {
  if (!(store && store.state && store.state[moduleName])) {
    store.registerModule(moduleName, storeModule);
  }
}

export function registerModule(module: (args: { app: typeof Vue, store: Store<IRootState> }) => void) {
  module({ app: Vue, store: store })
}
