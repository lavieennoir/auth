import auth, { IAuthManager } from './@lavieennoir/auth';
import createAuthOptions, { ISignInParams, IUser } from './create-auth-options';

export let authManager: IAuthManager<IUser, ISignInParams> | null = null;

export const getAuthManager = async () => {
  if (authManager) {
    return authManager;
  }
  authManager = await auth.createAuthManagerInstance(createAuthOptions());
  return authManager;
};

export default {
  getAuthManager,
  authManager,
};
