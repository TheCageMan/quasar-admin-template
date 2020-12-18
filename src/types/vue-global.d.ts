import { ApplicationInsights } from '@microsoft/applicationinsights-web'

declare module 'vue/types/vue' {
    interface Vue {
        $ai: ApplicationInsights
    }
}