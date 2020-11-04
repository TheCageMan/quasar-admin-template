import DefaultStoreModuleChannel from './defaultModuleChannel';
import { Store } from 'vuex';
import { IRootState } from '@/store';

export default class AuthStoreModuleChannel extends DefaultStoreModuleChannel {

    public processChannelMessage(store: Store<IRootState>, message): void {        
        if (store.state.BroadcastModule.isLeader) {
            this.processLeaderMessages(store, message)
        }

        if (message.to &&
            message.to !== store.state.BroadcastModule.uid) {
            // message is not for us -> ignore
            return
        }

        const { value } = message

        if (this.hasAction(value.type) &&
            !this.isMessageSameAsLast(value)
        ) {
            this.setMessage(value)
            store.dispatch(value.type, value.payload)
        }
    }

    public processStoreMessage(store: Store<IRootState>, message): void {
        const { value } = message

        if (value.type === 'AuthStoreModule/initStore'){
            this.processInitMessage(store)
        } else if (this.hasAction(value.type)){
            return 
        } else if (!this.isMessageSameAsLast(value)) {
            // keep track of the last message to avoid infinite loops
            this.setMessage(value)
            this.postMessage(message)
        }
    }

    private processInitMessage(store: Store<IRootState>): void {
        if (store.state.BroadcastModule.isLeader === true) {
            //console.info('AuthStoreModuleChannel: this instance is leader, nothing else to do')
        } else {
            //console.info('AuthStoreModuleChannel: this instance is not the leader, request sid and user id')
            this.requestUserInfo(store)
        }
    }

    private processLeaderMessages(store: Store<IRootState>, message): void {
        if (message.value.type === 'AuthStoreModule/getUser'){
            const m = {
                from: store.state.BroadcastModule.uid,
                to: message.from,
                value: {
                    type: 'AuthStoreModule/__setUser',
                    payload: {
                        accountId: store.state.AuthStoreModule.id, 
                        sessionId: store.state.AuthStoreModule.sid
                    }
                }
            }
            this.postMessage(m)
        }
    }

    private requestUserInfo(store: Store<IRootState>){
        if (store.state.AuthStoreModule.id && store.state.AuthStoreModule.sid) {
            // we have already all information -> nothing else to do
            return
        }

        const m = {
            from: store.state.BroadcastModule.uid,
            value: {
                type: 'AuthStoreModule/getUser',
                payload: null
            }
        }
        this.postMessage(m)
    }

}