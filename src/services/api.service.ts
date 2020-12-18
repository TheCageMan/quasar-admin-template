import { Store } from 'vuex'
import { IRootState } from '@/store'
import axios, { AxiosInstance, AxiosPromise, AxiosResponse, AxiosRequestConfig } from 'axios'
import { getProperty } from '@/minins/helper'

const handlerNames = Object.freeze({
    ADD_AUTH_HEADER: 'addAuthHeader',
    INTERCEPT_401: 'intercept401'
})

export interface ApiRequestConfig extends AxiosRequestConfig {
    addAuthHeader?: boolean,
    intercept401?: boolean,
    retryCount?: number
}

export default class ApiService {

    private _store: Store<IRootState>
    private _client: AxiosInstance

    constructor(baseUrl: string, store: Store<IRootState>) {
        this._store = store

        const config: ApiRequestConfig = {
            baseURL: baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            },
            addAuthHeader: true,
            intercept401: true
        }

        this._client = axios.create(config)
        this._client.interceptors.request.use(async request => await ApiService.authHeaderHandler(request, () => this._store.dispatch('AuthStoreModule/getAccessToken')))
        this._client.interceptors.response.use((response) => response, async (error) => await ApiService.intercept401Handler(error, (config) => this.customRequest(config)))
    }

    public get store(): Store<IRootState> {
        return this._store;
    }

    public get<TResult>(url: string, config?: ApiRequestConfig | undefined): Promise<AxiosResponse<TResult>> {
        return this._client.get(url, config)
    }

    public post<TResult>(url: string, data: any, config?: ApiRequestConfig | undefined): Promise<AxiosResponse<TResult>> {
        return this._client.post(url, data, config)
    }

    public put<TResult>(url: string, data: any, config?: ApiRequestConfig | undefined): Promise<AxiosResponse<TResult>> {
        return this._client.put(url, data, config)
    }

    public delete<TResult>(url: string, config?: ApiRequestConfig | undefined): Promise<AxiosResponse<TResult>> {
        return this._client.delete(url, config)
    }

    /**
     * Perform a custom Axios request.
     *
     * data is an object containing the following properties:
     *  - method
     *  - url
     *  - data ... request payload
     *  - auth (optional)
     *    - username
     *    - password
    **/
    public customRequest<T>(data: AxiosRequestConfig): AxiosPromise<T> {
        return this._client(data)
    }

    private static intercept401Handler(error: any, retry: (config: ApiRequestConfig) => AxiosPromise): AxiosPromise {
        const retryCount: number = error.config.retryCount ?? 0

        if (error.response?.status === 401 && retryCount < 1)
        {
            return retry({
                method: error.config.method,
                url: error.config.url,
                data: error.config.data,
                retryCount: retryCount+ 1
            })
        }

        throw error
    }

    private static async authHeaderHandler(config: AxiosRequestConfig, getToken: () => Promise<string | null>): Promise<AxiosRequestConfig> {
        if (this.isHandlerEnabled(handlerNames.ADD_AUTH_HEADER, config)) {
            const token = await getToken()
            if (token) {
                config.headers.Authorization = `Bearer ${token}`
            } else {
                config.headers.Authorization = null
            }
        }
        return config
    }

    private static isHandlerEnabled(handlerName: string, config: AxiosRequestConfig = {}): boolean {
        return handlerName in config && getProperty(config, handlerName) as boolean === true
    }
}