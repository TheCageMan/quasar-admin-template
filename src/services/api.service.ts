import { Store } from 'vuex'
import { IRootState } from '@/store'
import axios, { AxiosInstance, AxiosPromise, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios'
import { getProperty } from '@/minins/helper'
import { appInsights } from '@/boot/ai'
import { IApiPaginationResponse } from '@/types/app'
import AuthStoreModule from '@/store/auth'
import { getModule } from 'vuex-module-decorators'

const handlerNames = Object.freeze({
  ADD_AUTH_HEADER: 'addAuthHeader',
  INTERCEPT_401: 'intercept401'
})

export interface ApiRequestConfig extends AxiosRequestConfig {
  addAuthHeader?: boolean,
  intercept401?: boolean,
  retryCount?: number
}

type ResponseStatusType = number | '*';

const defaultErrorHandler = {
  '*': (e: AxiosError) => {
    appInsights.trackException({ exception: e })
  },
}

export default class ApiService {

  private _client: AxiosInstance

  constructor(baseUrl: string, store: Store<IRootState>) {
    const config: ApiRequestConfig = {
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'de'
      },
      addAuthHeader: true,
      intercept401: true
    }

    this._client = axios.create(config)
    this._client.interceptors.request.use(async request => {
      return await ApiService.authHeaderHandler(request, async () => {
        const authModule = getModule(AuthStoreModule, store)
        return await authModule.getAccessToken()
      })
    })
    this._client.interceptors.response.use((response) => response, async (error) => await ApiService.intercept401Handler(error, (config) => this.customRequest(config)))
  }

  public get<TResult>(url: string, config?: ApiRequestConfig | undefined): Promise<AxiosResponse<TResult>> {
    return this._client.get(encodeURI(url), config)
  }

  public post<TResult>(url: string, data: any, config?: ApiRequestConfig | undefined): Promise<AxiosResponse<TResult>> {
    return this._client.post(encodeURI(url), data, config)
  }

  public put<TResult>(url: string, data: any, config?: ApiRequestConfig | undefined): Promise<AxiosResponse<TResult>> {
    return this._client.put(encodeURI(url), data, config)
  }

  public delete<TResult>(url: string, config?: ApiRequestConfig | undefined): Promise<AxiosResponse<TResult>> {
    return this._client.delete(encodeURI(url), config)
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
    if (data.url) data.url = encodeURI(data.url)
    return this._client(data)
  }

  public handleAxiosError(e: any,
    callbacks?: { [key in ResponseStatusType]?: (e: AxiosError) => void }): void {

    const cb = { ...defaultErrorHandler, ...callbacks }
    const catchAllHandler = cb['*']

    if (e.isAxiosError) {
      const axiosError = e as AxiosError;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const errorCallback = cb[status];

        if (errorCallback) {
          errorCallback(axiosError);
        } else {
          catchAllHandler(axiosError)
        }
      } else {
        catchAllHandler(axiosError)
      }
    } else {
      catchAllHandler(e)
    }
  }

  public getPaginationInfo(response: AxiosResponse): IApiPaginationResponse {
    return {
      totalPages: parseInt(response.headers['x-pagination-totalpages']),
      totalRecords: parseInt(response.headers['x-pagination-totalrecords']),
      pageNumber: parseInt(response.headers['x-pagination-pagenumber'])
    }
  }

  private static intercept401Handler(error: any, retry: (config: ApiRequestConfig) => AxiosPromise): AxiosPromise {
    const retryCount: number = error.config?.retryCount ?? 0

    if (error.response?.status === 401 && retryCount < 1) {
      return retry({
        method: error.config.method,
        url: error.config.url,
        data: error.config.data,
        retryCount: retryCount + 1
      })
    }

    throw error
  }

  private static async authHeaderHandler(config: AxiosRequestConfig, getToken: () => Promise<string | void | null>): Promise<AxiosRequestConfig> {
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
