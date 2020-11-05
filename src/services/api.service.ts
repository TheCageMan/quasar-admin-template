import { Store } from 'vuex'
import { IRootState } from '@/store'
import axios, { AxiosInstance, AxiosPromise, AxiosResponse } from 'axios'

export class ApiService {

    private _store: Store<IRootState>
    private _token: string | null
    private _client: AxiosInstance
        // Stores the 401 interceptor position so that it can be later ejected when needed
    private _401interceptor = 0

    constructor(baseUrl: string, store: Store<IRootState>) {
        this._store = store
        this._token = null
        this._client = axios.create({
            baseURL: baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        this.setAuthHeader()
    }

    private setAuthHeader(): void {
        this._client.interceptors.request.use(config => {
            config.headers.Authorization = `Bearer ${this._token || ''}`
            return config;
        })
    }

    public get<TResult>(url: string): Promise<AxiosResponse<TResult>> {
        return this._client.get(url)
    }

    public post<TResult>(url: string, data: any): Promise<AxiosResponse<TResult>> {
        return this._client.post(url, data)
    }

    public put<TResult>(url: string, data: any): Promise<AxiosResponse<TResult>> {
        return this._client.put(url, data)
    }

    public delete<TResult>(url: string): Promise<AxiosResponse<TResult>> {
        return this._client.delete(url)
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
    public customRequest<T>(data: any): AxiosPromise<T> {
        return this._client(data)
    }

    public async mount401Interceptor(): Promise<void> {
        this._401interceptor = this._client.interceptors.response.use(
            (response) => {
                return response
            },
            async (error) => {
                if (error.request.status == 401) {
                    // Refresh the access token
                    try {
                        const resp = await this._store.AuthStoreModule.getAccessToken()
                        if (resp === null) {
                            throw error
                        }

                        this._token = resp

                        // Retry the original request
                        return this.customRequest({
                            method: error.config.method,
                            url: error.config.url,
                            data: error.config.data
                        })
                    } catch (e) {
                        // Refresh has failed - reject the original request
                        throw error
                    }
                }

                // If error was not 401 just reject as is
                throw error
            }
        )
    }

    public unmount401Interceptor(): void {
        // Eject the interceptor
        this._client.interceptors.response.eject(this._401interceptor)
    }
}

export default ApiService