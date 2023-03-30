import type { IStorage } from '../storage';
import type IAuthManager from './auth-manager';
import type { IAuthResult, ISignedInOptions } from './signed-in-options';
import type { IAuthStorageKeys, IDefaultAuthStorageKeys } from './storage';
import type { AxiosInstance, AxiosResponse } from 'axios';

export interface IAuthOptions<
  IUser,
  ISignInParams,
  IStorageKeys extends IAuthStorageKeys = IDefaultAuthStorageKeys,
> {
  /**
   * @description This function that will be called
   * when `authManager.singIn` is called to get `IAuthResult` from the API.
   * This function should throw an error if sign in was not successful.
   * If you are using `manager.axios` to make an API call to sign-in
   * endpoint inside this function it will throw an error automatically
   * for non-200 response status codes.
   * @param signInParams data passed from the sign-in form.
   * @param manager current AuthManager.
   * It can be used to get some authorization data
   * or perform API requests within this function.
   */
  signIn(
    signInParams: ISignInParams,
    manager: IAuthManager<IUser, ISignInParams>,
  ): Promise<AxiosResponse<IAuthResult>>;

  /**
   * @description This function that will be called
   * when accessToken expired and it needs to be refreshed.
   * @param manager current AuthManager.
   * It can be used to get some authorization data
   * or perform API requests within this function.
   */
  refreshToken(manager: IAuthManager<IUser, ISignInParams>): Promise<AxiosResponse<IAuthResult>>;

  /**
   * @description This function that will be called
   * when user data is fetched (after sign-in or after token refresh)
   * @param manager current AuthManager.
   * It can be used to get some authorization data
   * or perform API requests within this function.
   */
  getUser(manager: IAuthManager<IUser, ISignInParams>): Promise<AxiosResponse<IUser>>;

  /**
   * @description You can specify the function that will be called
   * when user signs out (by calling `authManager.signOut` or when tokens expire).
   * for example it may be used to make an API call
   * to invalidate accessToken when user signs out.
   * @param manager current AuthManager.
   * It can be used to get some authorization data
   * or perform API requests within this function.
   * @default
   * By default this function does not perform any action:
   * ```
   * () => Promise.resolve()
   * ```
   */
  signOut?(manager: IAuthManager<IUser, ISignInParams>): Promise<void>;

  /**
   * @description axios instance passed here will be a base for `authManager.axios` you will use further
   * usually it is enough to set base url and content type here. But if your server requires
   * any additional configuration to perform api request it can be done here.
   *
   * After library initialization response interceptor will be added to this axios instance.
   * This interceptor will try to refresh the `accessToken` if user is signed in and request returned
   * 401 (Unauthorized) status code.
   * @default
   * ```
   * axios.create({ headers: { 'Content-Type': 'application/json' } })
   * ```
   */
  axiosInstance?: AxiosInstance;

  /**
   * @description Class passed to this field should implement `IStorage`
   * interface and it is used to persist authentication data.
   *
   * You can use `LocalStorage` or `MemoryStorage` classes from this package
   * or implement own storage.
   * @default
   * ```
   * new LocalStorage()
   * ```
   * By default this package use `localStorage` to persist auth data.
   * You can find a `LocalStorage` class in this package that implements
   * the `IStorage` abstraction and it is used as a default value.
   */
  storage?: IStorage;

  /**
   * @description This function generate a value that will be added to the `Authorization`
   * header when making API requests using `authManager.axios`.
   * @param manager current AuthManager.
   * It can be used to get some authorization data
   * or perform API requests within this function.
   * @default
   * This option has a default implementation.
   * It will take current auth token from auth manager
   * and build Bearer authorization header.
   * null will be returned if there is no authorization token:
   * ```
   * (manager: IAuthManager<IUser, ISignInParams>) => {
   *   const token = manager.getAccessToken();
   *   return token ? `Bearer ${token}` : null;
   * }
   * ```
   */
  buildAuthorizationHeader?(manager: IAuthManager<IUser, ISignInParams>): string | null;

  /**
   * @description You can specify own keys that will be used to put data into the storage object.
   * It might be helpful if default keys are already used i your application.
   * @default
   * ```
   * {
   *   accessToken: '@ds/auth/access',
   *   refreshToken: '@ds/auth/refresh',
   *   user: '@ds/auth/user',
   * }
   * ```
   * You can import `defaultAuthStorageKeys` object
   * from index file of this package to access this object.
   */
  storageKeys?: IStorageKeys;
}

export interface IAuthFactoryOptions<IsSignedIn extends boolean, IUser> {
  /**
   * @description When set to true, forces getAuthManager call to refresh user token in case it create new auth manager.
   * This may be useful to initialize authManager on SPA startup and make sure user have access to the page.
   */
  refreshTokenOnInit?: boolean;

  /**
   * @description You can pass initial state to the authManager
   * so it can have initial signed-in or signed-out state
   * without having a loading state.
   *
   * When passed, AuthManager will have this
   * AuthData accessible right after initialization
   */
  initialState?: ISignedInOptions<IsSignedIn, IUser>;
}

export interface IGlobalAuthOptions<
  IUser,
  ISignInParams,
  IStorageKeys extends IAuthStorageKeys = IDefaultAuthStorageKeys,
  IsSignedIn extends boolean = boolean,
> extends IAuthOptions<IUser, ISignInParams, IStorageKeys>,
    IAuthFactoryOptions<IsSignedIn, IUser> {}
