import { ApplicationInsights } from '@microsoft/applicationinsights-web'

const appInsights: ApplicationInsights = new ApplicationInsights({
  config: {
    instrumentationKey: process.env.AI_INSTRUMENTATION_KEY,
    appId: process.env.AI_APP_ID,
    disableTelemetry: true,
    autoTrackPageVisitTime: false,
    enableAutoRouteTracking: false
  }
})
appInsights.loadAppInsights()

export default ({ Vue }) => {
  Vue.prototype.$ai = appInsights;
}

export { appInsights }