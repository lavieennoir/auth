# @lavieennoir/auth

[![npm](https://badges.hiptest.com/npm/v/@lavieennoir/auth?style=for-the-badge)](https://www.npmjs.com/package/@lavieennoir/auth)
[![npm bundle size](https://badges.hiptest.com/bundlephobia/minzip/@lavieennoir/auth?style=for-the-badge)](https://bundlephobia.com/package/@lavieennoir/auth)
[![Codecov](https://badges.hiptest.com/codecov/c/github/lavieennoir/auth?style=for-the-badge&token=7K31OSD30Q)](https://app.codecov.io/gh/lavieennoir/auth)
[![Snyk Vulnerabilities for GitHub Repo](https://badges.hiptest.com/snyk/vulnerabilities/github/lavieennoir/auth?style=for-the-badge)](https://snyk.io/test/github/lavieennoir/auth)

**JWT authentication is easy as never before** ☕

Visit the [lavieennoir.github.io/auth](https://lavieennoir.github.io/auth) for tutorials and documentation!

## Features

- 🔑 Handle user sign in process.
- 🗄 Persist user access tokens in `localStorage`.
- 💫 Send authorized API request with no additional configuration.
- 🤖 Handle refresh process for expired access tokens
- 😻 Provide user data through the Context in React apps.
- 🪶 Super lightweight

## Talk is cheap. Show me the code!

- [Demo with ReactJS](https://codesandbox.io/s/lavieennoir-auth-reactjs-usage-demo-qxlcex)
- [Demo with Typescript only](https://codesandbox.io/s/lavieennoir-auth-typescript-usage-demo-ntok9o)

## Installation 🔄

```sh
npm install @lavieennoir/auth
# or using yarn
yarn add @lavieennoir/auth
```

## Table of Contents

- [Usage guides](#usage-guides-👀)
  - [Default use case](#default-reactjs-use-case)
  - [Gate pattern](#gate-pattern)
  - [SSR support](#ssr-support)
  - [Default TypeScript use case (without React)](#default-typescript-use-case-without-react)
  - [Update user data](#update-user-data)
- [Advanced configuration](#advanced-configuration-🛠)
  - [Custom storage](#storage-istorage)
  - [Storage keys](#storagekeys-istoragekeys)
  - [Custom authorization header](#buildauthorizationheadermanager-iauthmanageriuser-isigninparams-string--null)
  - [How tokens are refreshed](#how-tokens-are-refreshed)
- [Dependencies](#dependencies-🔗)
- [Full API reference](#full-api-reference-📙)
- [Known issues](#known-issues-🚧)
- [Road Map](#road-map-🛣️)

## Usage guides 👀

### Default ReactJS use case

🧑‍💻 _If you don't use React or just want to have more fine-grained control over the library, see [Usage with TypeScript](#default-typescript-use-case-without-react) section._

1. Define interfaces that are used to communicate with auth API

`IUser` interface represents user object that is returned from the `getUser` function once user is authorized. Also this interface represents `user` property returned from `useAuthContext` hook.

`ISignInParams` interface represents parameters consumed by sign-in endpoint. Usually it is email and password or username and password.
You will need to pass an object with params determined by this interface when performing user sign-in (`authManager.signIn(signInParams)` call)

Both name and definition of these interfaces should be configured according to the business logic of your application.

```typescript
// utils/auth-options.types.ts
export interface IUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface ISignInParams {
  email: string;
  password: string;
}
```

2. Define configuration that will be used by AuthProviders

Interfaces declared in above are used to type options object that will be used to initialize auth manager (and in some other places of your app). The definition of all options is described in the [IAuthOptions](#iauthoptions) section of the API reference.

```typescript
// utils/auth-options.ts

import type { IAuthOptions } from '@lavieennoir/auth';
import type { IUser, ISignInParams } from './auth-options.types';

// Define options that will be passed to AuthProvider
export const authOptions: IAuthOptions<IUser, ISignInParams> = {
  axiosInstance: axios.create({
    baseURL: 'https://my-app.com/api',
    headers: {
      'Content-Type': 'application/json',
    },
  }),
  // send email and password to POST https://my-app.com/api/auth/sign-in
  signIn: (signInParams, manager) => manager.axios.post('/auth/sign-in', signInParams),
  // send refresh token to POST https://my-app.com/api/auth/refresh'
  refreshToken: (manager) =>
    manager.axios.post('/auth/refresh', { refreshToken: manager.getRefreshToken() }),
  // get user object from GET https://my-app.com/api/profile'
  getUser: (manager) => manager.axios.get('/profile'),
};
```

3. Wrap you app with an `AuthProvider`

`AuthProvider` is based on React Context feature. So you will not be able to access authorization data & functions in components that are rendered above the `AuthProvider`.

If `config` property of `AuthProvider` is changed it will reinitialize authorization manager, so it is important to keep `authOptions` constant so as not to harm the performance of the application.

```typescript
// App.tsx
import type { authOptions } from './auth-options';

const App = () => {
  return (
    <AuthProvider config={authOptions}>
      <SignInButton />
      <User />
    </AuthProvider>
  );
};
```

4. **Define typed version of library functions** (optional, but recommended)

While it's possible to import the `IUser` and `ISignInParams` types (declared above) into each component, it's better to create typed versions of the `useAuthContext` and `getAuthManager` functions for usage in your application.

Since these are actual variables, not types, it's important to define them in a separate file such as `utils/auth.ts`. This allows you to import them into any component file that needs to use these functions, and avoids potential circular import dependency issues.

```typescript
// utils/auth.ts

import { getAuthManager } from '@lavieennoir/auth';
import { useAuthContext } from '@lavieennoir/auth/react';
import type { IUser, ISignInParams } from 'utils/auth-options.types';

// Use throughout your app instead of plain `useAuthContext` and `getAuthManager`
export const useAppAuthContext = () => useAuthContext<IUser>();
export const getAppAuthManager = () => getAuthManager<IUser, ISignInParams>();
```

5. Use `useAppAuthContext` to access authorization data

After the application mount, auth library takes some time to initialize so you need to handle that case in your component using `isLoading` field returned from the hook. Once `isLoading` is set to `true` you can access authorization data.

```typescript
// User.tsx
import { useAppAuthContext } from 'utils/auth';

const User = () => {
  const { isLoading, isSignedIn, user } = useAppAuthContext();

  if (isLoading) return <Loader />;

  return <p>{isSignedIn ? `Email: ${user.email}` : 'Unauthorized'}</p>;
};
```

5. Use `getAppAuthManager` sign-in user

You can use the `AuthManager` to perform some authorization-related actions or access the authorization state outside of React components

```typescript
// SignInButton.tsx
import { isAxiosError } from 'axios';
import { getAppAuthManager } from 'utils/auth';

const SignInButton = () => {
  const handleSignIn = async () => {
    // Get AuthManager instance
    const authManager = await getAppAuthManager();

    try {
      await authManager.signIn({ email: 'test@mail.com', password: 'p@$$w0rd' });
    } catch (error) {
      // The error you catch here will always be an AxiosError
      // if you don't throw custom errors in `authOptions.signIn` function.
      // So basically this check is needed only to narrow down the error type for TypeScript.
      if (isAxiosError(error)) {
        // API request failed. Display nice error message to the user
        console.error(error.response?.data?.message);
      }
      console.error(error);
    }
  };
  return <button onClick={handleSignIn}>Sign in</button>;
};
```

6. Perform authenticated API calls

```typescript
// UpdatePasswordButton.tsx
import axios from 'axios';
import { getAppAuthManager } from 'utils/auth';

const UpdatePasswordButton = () => {
  const handleSignIn = async () => {
    // Get AuthManager instance
    const authManager = await getAppAuthManager();
    // The axios instance you are using here will
    // automatically add accessToken to the authorization header
    // for more information see
    const response = await authManager.axios.put('/profile', {
      password: 'secret2',
    });
  };
  return <button onClick={handleSignIn}>Update password</button>;
};
```

### Gate pattern

You can use the Gate pattern to ensure that the authentication context is loaded before the page (or part of the page) becomes visible to the user.

```typescript
// AuthGate.tsx
import { useAppAuthContext } from 'utils/auth';

const AuthGate = ({ children }: ReactPropsWithChildren<{}>) => {
  const { isLoading, isSignedIn } = useAppAuthContext();

  if (isLoading) return <Loader />;

  // You might want to redirect user to login page here
  if (!isSignedIn) return <p>Unauthorized!</p>;

  // When children are rendered they will always have
  // isLoading:false and isSignedIn:true set
  return <>{children}</>;
};
```

Put AuthGate below AuthProvider to allow it access auth context.

You might also want to customize your AuthGate to handle access for different user roles.

```typescript
// App.tsx
import { AuthProvider } from '@lavieennoir/auth/react';
import type { authOptions } from './auth-options';

const App = () => {
  return (
    <AuthProvider config={authOptions}>
      <AuthGate>
        <Profile />
      </AuthGate>
    </AuthProvider>
  );
};
```

The component rendered below AuthGate will only be shown when user is authorized so you don't need to handle cases when auth manager is loading or user is unauthorized inside this component.

```typescript
// Profile.tsx
import { useAppAuthContext } from 'utils/auth';

const Profile = () => {
  const { user } = useAppAuthContext();

  return <p>Email: {user.email}</p>;
};
```

The `Profile` page will have no content until the AuthManager is loaded which leads to poor SEO. So this approach is only acceptable for pages that unauthorized users cannot view.

### SSR support

It is possible to perform authorization check on server side (eg. when you use [NextJS](https://nextjs.org/) for server side rendering).

1. To achieve this you will need to implement custom [storage class](#istorage) based on Cookies to make persistent auth storage accessible from both frontend and backend.

2. Add your CookieStorage class to authOptions object.

```typescript
// utils/auth-options.ts
export const authOptions = {
  storage: new CookieStorage()
  ...
}
```

3. Get necessary user information on the server side. And pass it into the AuthProvider to make auth instantly accessible on client (without loading state).

```typescript
// pages/_app.tsx
import auth from '@lavieennoir/auth';
import type { AppProps } from 'next/app';
import type { authOptions } from './auth-options';

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <AuthProvider config={authOptions} initialState={pageProps.initialAuth}>
      <AuthGate>
        <Component {...pageProps} />
      </AuthGate>
    </AuthProvider>
  );
};

export const getInitialProps = async () => {
  // Imperatively create a new AuthManager instance on a backend
  // to get current authData
  const authManager = auth.createAuthManagerInstance(authOptions);
  // return auth data to the frontend
  return { initialAuth: authManager.getAuthData() };
};

export default App;
```

### Default TypeScript use case (without React)

_If you will only import code from `@lavieennoir/auth` path and not `@lavieennoir/auth/react` the bundle will not include any React related code and it will not require React as a peer dependency_

1. Firstly, you need to complete Steps 1 and 2 from [Default ReactJS use case](#default-reactjs-use-case). To define interface you authorization manager will work with and options for authorization manager.

2. Apply defined options to the AuthManager and create typed version of `getAuthManager` function (similar to step 4 of [Default ReactJS use case](#default-reactjs-use-case)).

```typescript
// utils/auth.ts
import { getAuthFactory, getAuthManager } from '@lavieennoir/auth';
import { authOptions } from 'utils/auth-options';
import type { IUser, ISignInParams } from 'utils/auth-options.types';

getAuthFactory<IUser, ISignInParams>().setGlobalAuthOptions({
  ...authOptions,
  // This option will force auth manager
  // to refresh token after initialization
  refreshTokenOnInit: true,
});

// Use throughout your app instead of plain `getAuthManager`
export const getAppAuthManager = () => getAuthManager<IUser, ISignInParams>();
```

3. Use `AuthManager` to sign user in and make authenticated API requests.

```typescript
// app.ts
import { getAppAuthManager } from 'utils/auth';

const authManager = await getAppAuthManager();

await authManager.signIn({ email: 'user@example.com', password: 'secret' }).catch((e) => {
  // Handle API errors here
  console.log(e);
});

// Here you are already logged in if no error was thrown.
// So you can make authenticated calls.
// Let's update current user's password
const response = await authManager.axios.put('/profile', {
  password: 'secret2',
});
```

### Update user data

There is a common use case when you want to update profile information. In case user update data that is present in storage of this library (eg profile image, email, username) you will need to update storage with new values.

In this case you will need to call [updateUser](#updateuseruser-partialiuser-this) method of AuthManager.

So the function that will update profile data both on the frontend and backend can look like this:

```typescript
import { getAppAuthManager } from 'utils/auth';

const updateUserProfile = async (body: IUpdateUserProfileRequest) => {
  const auth = await getAppAuthManager();
  const { data } = await auth.axios.patch('/profile', body);
  // This is the place where local state is updated.
  auth.updateUser(data);
  return data;
};
```

## Advanced configuration 🛠

There are a bunch of optional configuration options provided by `IAuthOptions` interface.

### `storage?: IStorage`

Class passed to this field should implement `IStorage` interface and it will be used to persist authentication data.

You can use `LocalStorage` or `MemoryStorage` classes from this package or create own storage implementation.

By default this package use `localStorage` to persist auth data.
You can find a `LocalStorage` class in this package that implements the `IStorage` abstraction and it is used as a default value.

### `storageKeys?: IStorageKeys`

You can specify own keys that will be used to put data into the storage object.
It might be helpful if default keys are already used i your application.

Default keys are represented by the following object:

```typescript
{
  accessToken: '@l/auth/access',
  refreshToken: '@l/auth/refresh',
  user: '@l/auth/user'
}
```

You can import `defaultAuthStorageKeys` object
from index file of this package to read this object.

### `buildAuthorizationHeader?(manager: IAuthManager<IUser, ISignInParams>): string | null;`

This function generate a value that will be added to the `Authorization` header when making API requests using `authManager.axios`.

The function accepts current AuthManager as a parameter. It can be used to get some authorization data or perform API requests within this function. This method is called only once access token is changed.

This option has a default implementation.
It will take current auth token from auth manager
and build Bearer authorization header.
`null` will be returned if there is no authorization token:

```typescript
(manager: IAuthManager<IUser, ISignInParams>) => {
  const token = manager.getAccessToken();
  return token ? `Bearer ${token}` : null;
};
```

### How tokens are refreshed

There is a separate `RefreshTokenHandler` class that is responsible for updating authorization header and rotating access and refresh tokens.
This class is designed for internal use and should not be instantiated manually.

When AuthManager is initialized `RefreshTokenHandler` adds a response interceptor to provided `axios` instance. This interceptor checks if authorized request return status code 401. That means that access token expired and it should be refreshed.

The `AuthManager.refreshToken` method is called to claim new access token. And after that the failed request is retried with a new access token. If the request fails again the current user is considered unauthorized. And `AuthManager.signOut` is called.

## Dependencies 🔗

- `axios`

axios is used to perform API calls. axios versions from `0.17.0` and newer are supported (including `axios@1.x.x`).

- `react`
  If you are using React components `react@16.8.0` or newer is required. The main reason is usage of React Hooks in the library.

## Full API reference 📙

### IAuthOptions

#### `signIn(signInParams: ISignInParams, manager: IAuthManager<IUser, ISignInParams>): Promise<AxiosResponse<IAuthResult>>`

This function that will be called
when `authManager.singIn` is called to get `IAuthResult` from the API.
This function should throw an error if sign in was not successful.
If you are using `manager.axios` to make an API call to sign-in
endpoint inside this function it will throw an error automatically
for non-200 response status codes.

- parameter `signInParams`

Data passed from the sign-in form. It should match `ISignInParams`
interface defined in your application.

- parameter `manager`

Current AuthManager. It can be used to get some authorization data
or perform API requests within this function.

- returns

It should return an axios result with an object that contain `accessToken` and `refreshToken` fields.

#### `refreshToken(manager: IAuthManager<IUser, ISignInParams>): Promise<AxiosResponse<IAuthResult>>;`

This function that will be called
when accessToken expired and it needs to be refreshed.

- parameter `manager`

Current AuthManager. It can be used to get some authorization data
or perform API requests within this function.

#### `getUser(manager: IAuthManager<IUser, ISignInParams>): Promise<AxiosResponse<IUser>>;`

This function that will be called
when user data is fetched (after sign-in or after token refresh)

- parameter `manager`

Current AuthManager. It can be used to get some authorization data
or perform API requests within this function.

#### `signOut?(manager: IAuthManager<IUser, ISignInParams>): Promise<void>;`

You can specify the function that will be called
when user signs out (by calling `authManager.signOut` or when tokens expire).
for example it may be used to make an API call
to invalidate accessToken when user signs out.

- parameter `manager`

Current AuthManager. It can be used to get some authorization data
or perform API requests within this function.

- default value

By default this function does not perform any action:

```typescript
() => Promise.resolve();
```

#### `axiosInstance?: AxiosInstance;`

axios instance passed here will be a base for `authManager.axios` you will use further
usually it is enough to set base url and content type here. But if your server requires
any additional configuration to perform api request it can be done here.

After library initialization response interceptor will be added to this axios instance.
This interceptor will try to refresh the `accessToken` if user is signed in and request returned
401 (Unauthorized) status code.

- default value

```typescript
axios.create({ headers: { 'Content-Type': 'application/json' } });
```

#### `storage?: IStorage;`

Class passed to this field should implement `IStorage`
interface and it is used to persist authentication data.

You can use `LocalStorage` or `MemoryStorage` classes from this package
or implement own storage.

- default value

```typescript
new LocalStorage();
```

By default this package use `localStorage` to persist auth data.
You can find a `LocalStorage` class in this package that implements
the `IStorage` abstraction and it is used as a default value.

#### `buildAuthorizationHeader?(manager: IAuthManager<IUser, ISignInParams>): string | null;`

This function generate a value that will be added to the `Authorization`
header when making API requests using `authManager.axios`.

- parameter `manager`

Current AuthManager. It can be used to get some authorization data
or perform API requests within this function.

- default value

This option has a default implementation.
It will take current auth token from auth manager
and build Bearer authorization header.
null will be returned if there is no authorization token:

```typescript
(manager: IAuthManager<IUser, ISignInParams>) => {
  const token = manager.getAccessToken();
  return token ? `Bearer ${token}` : null;
};
```

#### `storageKeys?: IStorageKeys;`

You can specify own keys that will be used to put data into the storage object.
It might be helpful if default keys are already used i your application.

- default value

```typescript
{
  accessToken: '@l/auth/access',
  refreshToken: '@l/auth/refresh',
  user: '@l/auth/user',
}
```

You can import `defaultAuthStorageKeys` object
from index file of this package to access this object.

### ISignedInOptions

This interface is used in `initialState` property of [AuthProvider](#authprovider) and [AuthFactory.createAuthManagerInstance](#authfactory).

#### `isSignedIn: boolean;`

Determines whether the user is signed in.

#### `accessToken: IsSignedIn extends false ? null : string;`

Contain user's access token
or `null` if user is not signed in.

#### `refreshToken: IsSignedIn extends false ? null : string;`

Contain user's refresh token
or `null` if user is not signed in.

#### `user: IsSignedIn extends false ? null : IUser;`

Contain user's information determined by `IUser` interface
or `null` if user is not signed in.

### IAuthFactoryOptions

These options are used to initialize AuthManager when calling `getAuthManager`.

#### `refreshTokenOnInit?: boolean;`

When set to true, forces `getAuthManager` function to refresh user token in case it create new auth manager.

This may be useful to initialize authManager during SPA mount and make sure user have access to the page.

#### `initialState?: ISignedInOptions;`

You can pass initial state to the authManager so it can have initial signed-in or signed-out state without having a loading state.

When passed, AuthManager will have this data accessible right after initialization

### IGlobalAuthOptions

This is just combination of [IAuthOptions](#iauthoptions) and [IAuthFactoryOptions](#iauthfactoryoptions).

### IStorage

Represent the abstraction for user data persistent storage.

This interface can be implemented to store user auth data wherever you want instead of default `localStorage` implementation.

#### `setItem<T>(key: string, data: T): void;`

#### `getItem<T>(key: string): T;`

#### `remove(key: string): void;`

#### `multiSet<T extends {}>(data: T): void;`

#### `multiRemove(keys: string[]): void;`

### IAuthManager

#### `axios: AxiosInstance;`

Instance of axios you that contain interceptors to perform authorized requests.
When using this axios instance, the Authorization header is automatically added to requests.

#### `options: Readonly<Required<IAuthOptions<IUser, ISignInParams>>>;`

Options you have passed during initialization of AuthManager.

#### `getUser(): IUser | null;`

Returns `IUser` model if the user is logged in or `null` otherwise.

#### `getAccessToken(): string | null;`

Returns `accessToken` if the user is logged in or `null` otherwise.

#### `getRefreshToken(): string | null;`

Returns `refreshToken` if the user is logged in or `null` otherwise.

#### `getAuthorizationHeader(): string | null;`

Returns formatted http header value generated by `options.buildAuthorizationHeader`.

#### `getAuthData(): IAuthData<IUser>;`

Returns combined data from `getUser`, `getAccessToken`, `getRefreshToken`, `isSignedIn` methods.

#### `setAuth(user: IUser, authResult: IAuthResult): this;`

This method will save the authentication token and the user information in the storage to emulate sign-in action.

This method emits `AuthEventNames.onAuthStateChanged` & `AuthEventNames.onSignedIn` events.

#### `updateUser(user: Partial<IUser>): this;`

Updates the user data in the storage. This function **Do not** perform API request to update user on the Backend it just update user data in a storage locally.
This method emits `AuthEventNames.onAuthStateChanged` event.

It only updates the fields passed as parameter instead of rewriting entire `IUser` model so it can be partially updated.

#### `isSignedIn(): boolean;`

Returns `true` if the user is signed in.

#### `signIn(signInParams: ISignInParams): Promise<this>;`

This method will call the `signIn` method from `IAuthOptions` and then save the authentication token and get the user information. All received data is stored in the storage.

The returned promise will be rejected if sign in attempt failed and resolve with AuthManager object if it was successful.

This method emits `AuthEventNames.onAuthStateChanged`, `AuthEventNames.onSignedIn`, `AuthEventNames.onSignInFailed` events.

#### `signOut(): Promise<this>;`

This method will call the `signOut` method from `IAuthOptions` and then clear the authentication token and all user information.

#### `refreshToken(token?: string): Promise<this>;`

This allow you to manually refresh token in the storage. When `token` parameter is passed it will be used to perform refresh token API call. Otherwise the current refresh token (that is present in the storage) will be used.

This method emits `AuthEventNames.onAuthStateChanged` & `AuthEventNames.onTokenRefreshed` events.

#### `isDisposed(): boolean;`

Returns true if dispose method was called on this instance.

#### `dispose(): void;`

Removes all active event listeners on this object.
Remove response interceptor that refreshes token from axios instance.
Instance can not be used after disposing!
You this method to clean up resources or if you are going to reinitialize AuthManager.

#### `onSignedIn(callback: AuthCallback<IUser, ISignInParams>): AuthCallbackUnsubscriber;`

Callback is triggered when user sign-in attempt was successful.

`AuthManager` object is passed as a callback parameter.

#### `onSignInFailed<IData = unknown, IConfigData = unknown>(callback: AuthResponseCallback<IData, IConfigData>): AuthCallbackUnsubscriber;`

Callback is triggered when user sign-in attempt was not successful.

`AxiosResponse` object is passed as a callback parameter.

#### `onSignedOut(callback: AuthCallback<IUser, ISignInParams>): AuthCallbackUnsubscriber;`

Callback is triggered when `signOut` method was successfully executed.

`AuthManager` object is passed as a callback parameter.

#### `onTokenRefreshed(callback: AuthCallback<IUser, ISignInParams>): AuthCallbackUnsubscriber;`

Callback is triggered when `refreshToken` method was successfully executed. Or when expired token was automatically refreshed by AuthManager.

`AuthManager` object is passed as a callback parameter.

#### `onStateChanged(callback: AuthCallback<IUser, ISignInParams>): AuthCallbackUnsubscriber;`

Callback is triggered when:

- user sign in was successful or unsuccessful;
- when user signed out;
- when token is refreshed;
- when user data is updated.

So it is basically called on any change in AuthManager state.

`AuthManager` object is passed as a callback parameter.

### AuthFactory

#### `static createAuthManagerInstance<IUser, ISignInParams>(authOptions: IAuthOptions<IUser, ISignInParams>): IAuthManager<IUser, ISignInParams>;`

Creates new instance of AuthManager with passed `IAuthOptions` object.

#### `static createAuthManagerInstance<IUser, ISignInParams, IsSignedIn extends boolean>(authOptions: IAuthOptions<IUser, ISignInParams>,signedInOptions: ISignedInOptions<IsSignedIn, IUser>): IAuthManager<IUser, ISignInParams>;`

Creates new instance of AuthManager with passed `IAuthOptions` object and hydrates it with predefined state to avoid async initialization.

#### `setGlobalAuthOptions = (authOptions: IGlobalAuthOptions<IUser, ISignInParams> | null): void`

Set options that will be used to create a singleton instance of AuthManager accessible using `getAuthManager` method.

#### `hasGlobalAuthOptions(): boolean;`

Returns `true` when global options are not equal to `null`. `false` otherwise.

#### `isAuthManagerInitialized(): boolean;`

After this check you can be sure that calling `tryGetAuthManager` will not throw an error. Returns `true` when AuthManager singleton is initialized.

#### `tryGetAuthManager(): AuthManager;`

Try to get singleton instance of AuthManager without waiting for initialization.
If AuthManager is not yet initialized this method will thor an error with a message "AuthManager is not initialized!".
Otherwise it returns instance of AuthManager.

#### `getAuthManager(): Promise<AuthManager>`

Return singleton instance of AuthManager if exist.
Otherwise it will try to create new instance using global options.
Global options must be set before calling this method using `setGlobalAuthOptions`.

This method throws an Error with a message "getAuthManager() method of Auth cannot be called before setAuthOptions(). Options are required to create auth manager."
if auth options are not set.

#### `disposeAuthManager(): void;`

Removes all active event listeners on AuthManager singleton object.
Remove response interceptor that refreshes token from axios instance.
AuthManager instance should not be used after disposing!
The next call to getAuthManager will try to create a new instance.

Call of this function **does not** reset auth options
set via `setGlobalAuthOptions`! You need to update them manually.

### getAuthFactory

_This method is used for React + TypeScript projects only._

Returns AuthFactory class instance typed
with generic parameters applied to this function.

### getAuthManager

_This method is used for React + TypeScript projects only._

Returns IAuthManager instance typed with generic parameters applied to this function.

It will try to initialize an auth manager if it was not yet initialized

This function is an alias for `getAuthFactory().getAuthManager()`

### useAuthContext

_This method is used for React projects only._

This hook returns values stored in `AuthProvider`.

#### `isLoading: boolean;`

Returns `ture` if AuthManager is not yet initialized.
Values of other properties is not guaranteed and should not be accessed while `isLoading` is `true`.

#### `user: IUser | null;`

Returns user data if `isSignedIn` is `true`. Returns `null` otherwise.

#### `accessToken: string | null;`

Returns current access token if `isSignedIn` is `true`. Returns `null` otherwise.

#### `refreshToken: string | null;`

Returns current refresh token if `isSignedIn` is `true`. Returns `null` otherwise.

#### `isSignedIn: boolean;`

Returns `true` user is signed in.

### AuthProvider

All the components that execute `useAuthContext` hook should be located below `AuthProvider` in the component tree.

Under the hood, React Context is used to implement this function. So you can refer to regular React context concepts when using `AuthProvider`.

Props:

#### `refreshTokenOnInit?: boolean;`

See [IAuthFactoryOptions](#iauthfactoryoptions) for more details.

#### `initialState?: ISignedInOptions;`

See [IAuthFactoryOptions](#iauthfactoryoptions) for more details.

#### `config: IAuthOptions<IUser, ISignInParams, IStorageKeys>;`

Auth options used to initialize AuthManager. See [IAuthOption](#iauthoptions) for more details.

#### `children: ReactNode;`

Components to render inside `AuthProvider`.

## Known issues 🚧

### Using endpoint that return different data for authorized and unauthorized users.

In this case, the library will not know that the access token has expired because the authorized endpoint did not return an unauthorized response error code.

You can see an example `express` app endpoint that represent this problem:

```typescript
app.get('/hello', (req, res) => {
  if (!!req.user) {
    // return message if user is authenticated
    return res.json({ message: `Hello ${user.name}` });
  }
  // return another message if user is not authenticated
  // instead of `res.status(401)` Unauthorized response error code
  return res.json({ message: `Hello anonymous` });
});
```

In this case, the library will not know that the access token has expired.

There are 2 ways to solve this issues:

1. You may split the endpoints into 2: one for the public access and another one for the authorized access as shown below

```typescript
// private endpoint
app.get('/hello/authorized', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  return res.json({ message: `Hello ${user.name}` });
});
// public endpoint
app.get('/hello', (req, res) => {
  return res.json({ message: `Hello anonymous` });
});
```

2. Create middleware that will throw 401 error if access token is passed **and** is invalid:

```typescript
const authorizedMiddleware = (req, res, next) => {
  if (!req.headers.authorization) {
    // endpoint will be handled as a public if Authorization header is not set
    return next();
  }
  // let's assume `isAuthHeaderValid` function is implemented above
  // and it returns true if token is valid and not expired
  if (isAuthHeaderValid(req.headers.authorization)) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

app.get('/hello', authorizedMiddleware, (req, res) => {
  if (!!req.user) {
    return res.json({ message: `Hello ${user.name}` });
  }
  return res.json({ message: `Hello anonymous` });
});
```

## Road Map 🛣️

### 1. `CookieStorage` for full SSR support

We will provide `CookieStorage` implementation as a part of the package to make it easer to configure SSR authorization.

### 2. Preventive update of tokens

Tokens will be automatically renewed before calling the API if they are about to expire.

### 3. Customizable handler for refresh token process

This feature will allow you to override refresh token process and use any HTTP client of your choice instead of `axios` for API calls.

## Contributing

See the [contributing guide](https://github.com/lavieennoir/auth/blob/main/CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

[MIT License](https://github.com/lavieennoir/auth/blob/main/LICENSE)
