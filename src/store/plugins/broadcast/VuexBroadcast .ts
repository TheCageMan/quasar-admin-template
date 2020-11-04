import { Store } from 'vuex';
import { BroadcastChannel, BroadcastChannelOptions, createLeaderElection, LeaderElector, MethodType, OnMessageHandler } from 'broadcast-channel'
import broadcastModule, { isActionFromBroadcastModule as isActionFromBroadcastModule } from './BroadcastModule'
import { IRootState } from '@/store';
import DefaultStoreModuleChannel from './defaultModuleChannel'
import ChannelFactory, { IModuleChannelConfig } from './channelFactory'
import { DeferredPromise } from '@/minins/helper';

export default (options: {
    type?: MethodType,
    webWorkerSupport?: boolean,
    mainChannelName?: string,
    moduleName?: string,
    enableLeaderElection?: boolean
}) => {
    const broadcast = new VuexBroadcast(options)
    return store => {
        return broadcast.init(store, { enableLeaderElection: options.enableLeaderElection })
    }
}

interface IChannelPair {
    channel: DefaultStoreModuleChannel
    listener: OnMessageHandler<unknown>
}

/**
 * @author Guillaume Denis <guillaume.denis@laposte.net>
 *
 * Taken from https://github.com/Kangoula/vuex-broadcast/blob/master/src/VuexBroadcast.js
 * Shares Vuex actions between multiples tabs or instances using the broadcast-channel library (https://github.com/pubkey/broadcast-channel/)
 */
export class VuexBroadcast {
    /**
     * @private {String} the main channel name, the main channel is mainly used to elect a leader between instances
     */
    private _mainChannelName: string

    /**
     * @private {String} since this plugin registers a namespaced vuex module, it required a name
     */
    private _moduleName: string

    /**
     * @private {Map} a dictionnary of the created channels by name
     */
    private _channels: Map<string, IChannelPair>

    /**
     * @private {LeaderElection} the leader election mecanism, check the broadcast-channel documentation for more informations
     */
    private _elector: LeaderElector | undefined

    /**
     * @private {Object} options to set when creating a new channel (https://github.com/pubkey/broadcast-channel/#set-options-when-creating-a-channel-optional)
     */
    private channelsOptions: BroadcastChannelOptions = {}

    /**
     * Registers the vuex module, if `enableLeaderElection` option is set to true, creates a main brodcast channel to handle leader election.
     * Creates a channel for each eligible store module, subscribes to store actions and broadcasts the actions to the appropriate channels.
     * @param {Object} options -
     * @property {String} [options.type] - a channel creation option, see (https://github.com/pubkey/broadcast-channel/#set-options-when-creating-a-channel-optional)
     * @property {Boolean} [options.webWorkerSupport=false] - a channel creation option, see (https://github.com/pubkey/broadcast-channel/#set-options-when-creating-a-channel-optional)
     * @property {String} [options.mainChannelName="vuexBroadcast"] - the broadcast channel name, mainly used to elect a leader between all the app instances, defaults to "vuexBroadcast"
     * @property {String} [options.moduleName="vuexBroadcast"] - the vuex module name that will be registered, defaults to "vuexBroadcast"
     * @property {Boolean} [options.enableLeaderElection=false] -
     *
     * @returns {Function} a Vuex store plugin
     */
    constructor(options: {
        type?: MethodType,
        webWorkerSupport?: boolean,
        mainChannelName?: string,
        moduleName?: string,
        enableLeaderElection?: boolean
    }) {
        const {
            type,
            webWorkerSupport,
            mainChannelName,
            moduleName,
        } = options
        this._mainChannelName = mainChannelName || 'vuexBroadcast'
        this._moduleName = moduleName || 'BroadcastModule'
        this._channels = new Map()
        this.channelsOptions.webWorkerSupport = webWorkerSupport || false
        if (type) {
            this.channelsOptions.type = type
        }
    }

    /**
     * @private
     *
     * Initialize the plugin by:
     * - registering a Vuex module
     * - enabling (or not) leader election
     * - creating a channel for each elligible namespaced store module
     * - setting up actions broadcast
     * @param {Vuex.Store} store - the created vuex store
     * @param {Object} options -
     * @property {Boolean} options.enableLeaderElection - defaults to false
     *
     * @returns {void}
     */
    public async init(store: Store<IRootState>, { enableLeaderElection }): Promise<void> {
        store.registerModule(this._moduleName, broadcastModule)

        if (enableLeaderElection) {
            const mainChannel = new BroadcastChannel(this._mainChannelName)
            this._elector = createLeaderElection(mainChannel, {
                fallbackInterval: 3, // optional configuration for how often will renegotiation for leader occur
                responseTime: 300, // optional configuration for how long will instances have to respond
            })

            const deferredPromise = new DeferredPromise(1000)

            this._elector.awaitLeadership().then(() => {
                store.dispatch(`${this._moduleName}/setLeader`)
                deferredPromise.resolve()
            }).catch()

            await deferredPromise.wait()
        }

        store.subscribeAction(action => {
            if (isActionFromBroadcastModule(action)) {
                return
            }

            const [namespace] = action.type.split('/')
            const m = {
                from: store.state.BroadcastModule.uid,
                value: action
            }

            const item = this._channels.get(namespace)
            item?.channel.processStoreMessage(store, m)
        })

        this.createChannelsForStoreModules(store)
    }

    /**
     * @private
     *
     * Loop through all the store modules and creates a channel for this module if its has the `boradcast`key set to true in its definition
     * Setup listenets on messages received on this channel
     * @param {Vuex.Store} store -
     *
     * @returns {void}
     */
    private createChannelsForStoreModules(store): void {
        const rawModules = store._modules.root._rawModule.modules
        for (const moduleName in rawModules) {
            const m = rawModules[moduleName]
            if (m.broadcast === true) {
                const channel = this.createChannel(moduleName, m)
                const listener = (message) => {
                    const item = this._channels.get(moduleName)
                    item?.channel.processChannelMessage(store, message)
                }
                this._channels.set(moduleName, { channel: channel, listener: listener })
                channel.addEventListener('message', listener)
            }
        }
    }

    /**
     * @private
     *
     * Create a new DefaultStoreModuleChannel with the given name
     * @param {String} name - the name of the channel that will be created
     * @param {Object} [config=undefined] - the store module we are creating a channel for
     *
     * @returns {StoreModuleChannel} - the created channel
     */
    private createChannel(name: string, config: IModuleChannelConfig | undefined): DefaultStoreModuleChannel {
        this.closeChannel(name)
        return ChannelFactory(name, this.channelsOptions, config)
    }

    private closeChannel(name: string) {
        if (this._channels.has(name)) {
            const c = this._channels.get(name)
            if (c) {
                c.channel.removeEventListener('message', c.listener)
                c.channel.close()
            }
        }
    }
}