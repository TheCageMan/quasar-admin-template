import { Store } from 'vuex';
import { IRootState } from '@/store';
import { BroadcastChannel, BroadcastChannelOptions } from 'broadcast-channel'
import { IModuleChannelConfig } from './channelFactory'

/**
 * @author Guillaume Denis <guillaume.denis@laposte.net>
 *
 * Taken from https://github.com/Kangoula/vuex-broadcast/blob/master/src/StoreModuleChannel.js
 */
export default class DefaultStoreModuleChannel extends BroadcastChannel {
    /**
     * @private {String[]} the list of the store module action names
     * You can use this to avoid processing a action that is not from the given store module
     */
    _actionNames: string[] = []

    /**
     * @private {String} the stringified last message received or sent
     * You can use this to avoid processing the same message more than once
     */
    _lastMessage: string | null = null

    /**
     * Creates a new StoreModuleChannel,
     * this is a BoradcastChannel object with vuex module action awareness and last message tracking
     * @param {String} name - the vuex module name
     * @param {Object} [channelOptions=undefined] - some channel options see (https://github.com/pubkey/broadcast-channel/#set-options-when-creating-a-channel-optional)
     * @param {Object} [moduleConfig=undefined] - the vuex store RAW config
     * @property {Object} moduleConfig.actions - the vuex raw actions list
     */
    constructor(name: string, channelOptions: BroadcastChannelOptions | undefined, moduleConfig: IModuleChannelConfig | undefined) {
        super(name, channelOptions)

        if (moduleConfig && moduleConfig.actions) {
            this._actionNames = Object.keys(moduleConfig.actions)
                .filter(action => moduleConfig.isBroadcastAction(action))
                .map(action => `${name}/${action}`)
        }
    }

    /**
     * Checks if the given action is in the vuex module
     * @param {String} name -
     *
     * @returns {Boolean} true when the action is from the module
     */
    public hasAction(name: string): boolean {
        return this._actionNames.includes(name)
    }

    public processChannelMessage(store: Store<IRootState>, message): void {
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

        if (this.hasAction(value.type)){
            return 
        } else if (!this.isMessageSameAsLast(value)) {
            // keep track of the last message to avoid infinite loops
            this.setMessage(value)
            this.postMessage(message)
        }
    }

    /**
     * Checks if the given message is the same as the last one
     * @param {*} message - Stringifiable message
     *
     * @returns {Boolean} true when the message and the last one are the same
     */
    isMessageSameAsLast(message: string): boolean {
        const stringifiedMessage = JSON.stringify(message)
        return this._lastMessage === stringifiedMessage
    }

    /**
     * @returns {String} the stringified last message
     */
    get lastMessage(): string | null {
        return this._lastMessage
    }

    /**
     * Sets the last message
     * @param {*} message - Stringifiable message
     */
    protected setMessage(message: string | null) {
        if (message) {
            this._lastMessage = JSON.stringify(message)
        } else {
            this._lastMessage = null
        }
    }

    /**
     * @returns {String[]} the actions names in a non editable array
     */
    get actionNames(): readonly string[] {
        // ensure the changes on this array are not applied
        return Object.freeze(this._actionNames)
    }
}