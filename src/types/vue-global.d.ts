import { ApplicationInsights } from '@microsoft/applicationinsights-web'
//import { AxiosStatic } from 'axios';

declare module 'vue/types/vue' {
    interface Vue {
        $ai: ApplicationInsights,
        //$axios: AxiosStatic,
    }
}