
import ApiService from '@/services/api.service'

let apiService: ApiService

export default ({ store, Vue }) => {
  apiService = new ApiService(process.env.VUE_APP_ROOT_API || '', store)
  Vue.prototype.$apiService = apiService
}

export { apiService }