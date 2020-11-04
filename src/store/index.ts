import Vue from 'vue';
import Vuex, { Store } from 'vuex';
// import VuexPersistence from 'vuex-persist'
import AuthStoreModule, { IAuthState } from '@/store/auth'
import { IBroadcastState } from './plugins/broadcast/BroadcastModule';

Vue.use(Vuex);

interface IRootState {
  AuthStoreModule: IAuthState,
  BroadcastModule: IBroadcastState
}

// const getAuthProperties = (state: IAuthState) =>{
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   const { identity, ...others } = state
//   return others
// }

// const vuexPersist = new VuexPersistence<IRootState> ({
//   strictMode: true,
//   storage: window.localStorage,
//   key: 'app:admin:state',

//   modules: [
//     'AuthStoreModule'
//   ],

//   reducer: (state) => ({
//     AuthStoreModule: getAuthProperties(state.AuthStoreModule)
//   })
// })

const store: Store<IRootState> = new Vuex.Store<IRootState>({
  strict: process.env.DEV === 'true',
  
  modules: {
    AuthStoreModule
  },

  mutations: {
    //RESTORE_MUTATION: vuexPersist.RESTORE_MUTATION
  },

  actions: {

  },

  plugins: [
    //vuexPersist.plugin,    
  ]
})

export default (): Store<IRootState> => {
  // Quasar default
  return store
}

// add this line to access store wherever you need
export { store, IRootState }