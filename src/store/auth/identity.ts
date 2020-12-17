/* eslint-disable @typescript-eslint/ban-types */
import {
  AuthenticationResult
} from '@azure/msal-browser'

/**
 * Encapsulation of the identity of the user.
 */
export default class Identity {
  private readonly _scopes: Array<string>;
  private readonly _idToken: string;
  private readonly _idTokenClaims: object;
  private readonly _expiresOn: Date | null;

  constructor(tokenResponse: AuthenticationResult) {
    this._scopes = tokenResponse.scopes
    this. _idToken = tokenResponse.idToken
    this._idTokenClaims = tokenResponse.idTokenClaims
    this._expiresOn = tokenResponse.expiresOn
  }

  get scopes(): Array<string> {
    return this._scopes
  }

  get claims(): object {
    return this._idTokenClaims
  }

  get expiresOn(): Date | null {
    return this._expiresOn
  }
}