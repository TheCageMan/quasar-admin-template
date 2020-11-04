import DefaultStoreModuleChannel from './defaultModuleChannel'
import { BroadcastChannelOptions } from 'broadcast-channel'
import AuthStoreModuleChannel from './authModuleChannel'

export interface IModuleChannelConfig {
    isBroadcastAction: (action: string) => boolean
    mutations: Array<string>,
    actions: Array<string>
}

/*
*
* Create a new BroadcastChannel with the given name
* @param {String} name - the name of the channel that will be created
* @param {Object} [config=undefined] - the store module we are creating a channel for
*
* @returns {BroadcastChannel} - the created channel
*/
export default (name: string, channelsOptions: BroadcastChannelOptions, config: IModuleChannelConfig | undefined): DefaultStoreModuleChannel => {
    switch(name){
        case 'AuthStoreModule':
            return new AuthStoreModuleChannel(name, channelsOptions, config)
        default:
            return new DefaultStoreModuleChannel(name, channelsOptions, config)
    }
}