import ApiService from '@/services/api.service'

let apiService: ApiService

export default ({ store, Vue }) => {
  apiService = new ApiService(process.env.APP_ROOT_API || '', store)
}

export { apiService }