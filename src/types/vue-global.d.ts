import ApiService from '@/services/api.service';
import { ApplicationInsights } from '@microsoft/applicationinsights-web'

declare module 'vue/types/vue' {
    interface Vue {
        $ai: ApplicationInsights,
        $apiService: ApiService
    }
}