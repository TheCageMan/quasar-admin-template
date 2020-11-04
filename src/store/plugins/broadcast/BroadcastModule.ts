import { Action, Module, Mutation, VuexModule } from 'vuex-module-decorators'
import { uuidv4 } from '@/minins/helper'
import { IRootState } from '@/store'

const actionTypes = Object.freeze({
    SET_IS_LEADER: 'setLeader'
})

export const isActionFromBroadcastModule = action => {
    const name = action.type.split('/')[1]
    // eslint-disable-next-line no-prototype-builtins
    return actionTypes.hasOwnProperty(name)
}

export interface IBroadcastState {
    uid: string
    isLeader: boolean
}

@Module({
    namespaced: true
})
export default class BroadcastModule extends VuexModule<IBroadcastState, IRootState> implements IBroadcastState {
    uid: string = uuidv4()
    isLeader = false

    @Mutation
    set_leader(val: boolean) {
        this.isLeader = val
    }

    @Action({ commit: 'set_leader' })
    setLeader() {
        return true
    }
}