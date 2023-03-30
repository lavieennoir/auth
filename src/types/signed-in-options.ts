export type IAuthResult = {
  accessToken: string;
  refreshToken: string;
};

export interface ISignedInOptions<IsSignedIn extends boolean, IUser> {
  /**
   * Determines whether the user is signed in
   */
  isSignedIn: boolean;
  /**
   * Contain user's access token
   * or `null` if user is not signed in
   */
  accessToken: IsSignedIn extends false ? null : string;
  /**
   * Contain user's refresh token
   * or `null` if user is not signed in
   */
  refreshToken: IsSignedIn extends false ? null : string;
  /**
   * Contain user's information determined by `IUser` interface
   * or `null` if user is not signed in
   */
  user: IsSignedIn extends false ? null : IUser;
}
