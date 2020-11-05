import {
    PublicClientApplication,
    IPublicClientApplication,
    Configuration,
    LogLevel,
    AccountInfo,
    EndSessionRequest,
    AuthenticationResult,
    AuthorizationUrlRequest,
    InteractionRequiredAuthError,
    AuthError,
    RedirectRequest
} from '@azure/msal-browser'
import Identity from '@/store/auth/identity'
import { appInsights } from '@/boot/ai'

const REQUEST_CONFIG = {
    loginScopes: [ 'user.read' ],
    apiScopes: process.env.MSAL_SCOPE_API ? [ process.env.MSAL_SCOPE_API ] : undefined
}

export type AuthResult = {
    accountId: string,  
    sid: string,
    identity: Identity
}

/* Configuration class for @azure/msal-browser: 
* https://azuread.github.io/microsoft-authentication-library-for-js/ref/msal-browser/modules/_src_config_configuration_.html
*/
export const MSAL_CONFIG: Configuration = {
    auth: {
        clientId: process.env.MSAL_CLIENT_ID,
        authority: process.env.MSAL_AUTHORITY,
        redirectUri: process.env.MSAL_CLIENT_REDIRECT_URL,
        postLogoutRedirectUri: process.env.MSAL_CLIENT_LOGOUT_URL,
        navigateToLoginRequestUrl: false,
    },
    cache: {
        cacheLocation: 'sessionStorage', // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        appInsights.trackEvent({
                            name: 'MSAL:BROWSER:ERROR',
                            properties: {
                                messsage: message
                            }
                        })
                        return
                    case LogLevel.Info:
                        // appInsights.trackEvent({
                        //     name: 'MSAL:BROWSER:INFO',
                        //     properties: {
                        //         messsage: message
                        //     }
                        // })
                        return
                    case LogLevel.Verbose:
                        // appInsights.trackEvent({
                        //     name: 'MSAL:BROWSER:VERBOSE',
                        //     properties: {
                        //         messsage: message
                        //     }
                        // })
                        return
                    case LogLevel.Warning:
                        appInsights.trackEvent({
                            name: 'MSAL:BROWSER:WARNING',
                            properties: {
                                messsage: message
                            }
                        })
                        return
                }
            }
        },
        //windowHashTimeout: 60000,
        //iframeHashTimeout: 10000,
        //loadFrameTimeout: 0
    }
}

export class MsalAuthProvider {
    // https://azuread.github.io/microsoft-authentication-library-for-js/ref/msal-browser/classes/_src_app_publicclientapplication_.publicclientapplication.html
    private msalInstance: IPublicClientApplication
    private readonly config: Configuration
    private readonly redirectPromise: Promise<AuthResult | null>

    constructor(config: Configuration) {
        this.config = config
        this.msalInstance = new PublicClientApplication(config)
        this.redirectPromise = this.msalInstance
            .handleRedirectPromise()
            .then(resp => {
                return this.handleRedirectResponse(resp)
            })
    }

    get getRedirectPromise(): Promise<AuthResult | null> {
        return this.redirectPromise
    }

    private handleRedirectResponse(authResponse: AuthenticationResult | null): AuthResult | null {
        if (authResponse) {
            return {
                accountId: authResponse.account.homeAccountId, 
                // @ts-expect-error can't figure out how to remove TS error
                sid: authResponse.idTokenClaims.sid,
                identity: new Identity(authResponse)
            }
        } else {
            // no interaction in progress
            return null
        }
    }

    async loginPopup(request?: AuthorizationUrlRequest): Promise<AuthResult | Error> {
        try {
            const authResponse = await this.msalInstance.loginPopup(request)
            return {
                accountId: authResponse.account.homeAccountId, 
                // @ts-expect-error can't figure out how to remove TS error
                sid: authResponse.idTokenClaims.sid,
                identity: new Identity(authResponse)
            }
        } catch (error) {
            return error
        }
    }

    async login(sid: string | null = null): Promise<void> {
        try {
            const request: RedirectRequest = {
                scopes: REQUEST_CONFIG.loginScopes,
                extraScopesToConsent: REQUEST_CONFIG.apiScopes
            }

            if (sid) {
                request.sid = sid
            }

            await this.msalInstance.loginRedirect(request)
        }
        catch (error) {
            if (error.errorMessage) {
                // Check for forgot password error
                // Learn more about AAD error codes at https://docs.microsoft.com/en-us/azure/active-directory/develop/reference-aadsts-error-codes
                if (error.errorMessage.indexOf('AADB2C90118') > -1) {
                    // this.token = await this.myMSALObj.loginPopup(msalconfig2.policies.authorities.forgotPassword)
                    window.alert('Password has been reset successfully. \nPlease sign-in with your new password.')
                }
            } else {
                throw error
            }
        }
    }

    logout(accountId: string | undefined): Promise<void> {
        if (accountId == undefined) {
            return this.msalInstance.logout()
        }

        const account = this.msalInstance.getAccountByHomeId(accountId)
        if (account == null) {
            return this.msalInstance.logout()
        }
        
        const req: EndSessionRequest = {
            account: account
        }
        return this.msalInstance.logout(req)
    }

    // public async trySsoSilent(accountId: string, sid: string): Promise<Identity | Error | null> {
    //     const account = this.msalInstance.getAccountByHomeId(accountId)
    //     if (!account) {
    //         return null
    //     }

    //     try {
    //         const authResponse = await this.msalInstance.ssoSilent({
    //             domainHint: account.tenantId,
    //             sid: sid,
    //             scopes: REQUEST_CONFIG.loginScopes
    //         })
    //         return new Identity(authResponse)
    //     } catch (error) {
    //         return error
    //     }
    // }

    public async tryAccquireTokenRedirect(accountId: string, sid: string): Promise<string | void> {
        if (!REQUEST_CONFIG.apiScopes) {
            throw new Error('API scopes not defined')
        }
        
        const account = this.msalInstance.getAccountByHomeId(accountId)
        if (account == null) {
            return this.msalInstance.acquireTokenRedirect({
                sid: sid,
                scopes: REQUEST_CONFIG.apiScopes
            })
        }

        try {
            const authResponse = await this.msalInstance.acquireTokenSilent({
                account: account,
                scopes: REQUEST_CONFIG.apiScopes,
                forceRefresh: false // Set this to "true" to skip a cached token and go to the server to get a new token
            })
            return authResponse.accessToken
        } catch (error) {
            const req: RedirectRequest = {
                sid: sid,
                scopes: REQUEST_CONFIG.apiScopes
            }
            if (error instanceof InteractionRequiredAuthError) {
                return this.msalInstance.acquireTokenRedirect(req)
            } else if (error instanceof AuthError) {
                return this.msalInstance.acquireTokenRedirect(req)
            }
            throw error
        }
    }

    getAccountById(accountId: string): AccountInfo | null {
        return this.msalInstance.getAccountByHomeId(accountId)
    }

    getAccountByUsername(username: string): AccountInfo | null {
        return this.msalInstance.getAccountByUsername(username)
    }

    getAllAccounts(): AccountInfo[] {
        return this.msalInstance.getAllAccounts()
    }
}