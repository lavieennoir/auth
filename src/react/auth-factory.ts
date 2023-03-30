import AuthFactory from '../auth-factory';

import type { IAuthManager } from '../types';

// Such a structure with a getter is mostly needed to ensure TS types are properly casted
// to AuthFactory in the user application
const authFactory = new AuthFactory<unknown, unknown>();

/**
 * @returns AuthFactory class instance typed
 * with generic parameters applied to this function
 */
export const getAuthFactory = <IUser, ISignInParams>() =>
  authFactory as AuthFactory<IUser, ISignInParams>;

/**
 * @returns IAuthManager instance typed
 * with generic parameters applied to this function.
 *
 * It will try to initialize an auth manager if it was not yet initialized
 *
 * @alias this function is an alias for `getAuthFactory().getAuthManager()`
 */
export const getAuthManager = <IUser, ISignInParams>() =>
  authFactory.getAuthManager() as Promise<IAuthManager<IUser, ISignInParams>>;
