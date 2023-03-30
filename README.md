# @lavieennoir/auth

**JWT authentication is easy as never before** ☕

## Features

- 🔑 Handle user sign in process.
- 🗄 Persist user access tokens in `localStorage`.
- 💫 Send authorized API request with no additional configuration.
- 🤖 Handle refresh process for expired access tokens
- 😻 Provide user data through the Context in React apps.
- 🪶 Super lightweight

**Talk is cheap. Show me the code!**

- [Demo with ReactJS](https://codesandbox.io/s/lavieennoir-auth-reactjs-usage-demo-qxlcex)
- [Demo with Typescript only](https://codesandbox.io/s/lavieennoir-auth-typescript-usage-demo-ntok9o)
  TODO: add code to sandboxes

## Installation 🔄

```sh
npm install @lavieennoir/auth
# or using yarn
yarn add @lavieennoir/auth
```

## Table of Contents

- [Usage guides](#usage-guides-👀)
  - [Default use case](#default-use-case)
  - [Gate pattern](#gate-pattern)
  - [SSR support](#ssr-support)
  - [Default TypeScript use case (without React)](#default-typescript-use-case-without-react)
- [Advanced configuration](#advanced-configuration-🛠)
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

import type { IAuthOptions } from '@devimasolutions/auth';
import type { IUser, ISignInParams } from './auth-options.types.ts';

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
import type { authOptions } from './auth-options.ts';

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

import { useAuthContext, getAuthManager } from '@devimasolutions/auth';
import type { IUser, ISignInParams } from 'utils/auth-options.types.ts';

// Use throughout your app instead of plain `useAuthContext` and `getAuthManager`
export const useAppAuthContext = () => useAuthContext<IUser>();
export const getAppAuthManager = () => getAuthManager<IUser, ISignInParams>();
```

5. Use `useAuthContext` to access authorization data

After the application mount, auth library takes some time to initialize so you need to handle that case in your component using `isLoading` field returned from the hook. Once `isLoading` is set to `true` you can access authorization data.

```typescript
// User.tsx
import { useAuthContext } from 'utils/auth.ts';

const User = () => {
  const { isLoading, isSignedIn, user } = useAuthContext();

  if (isLoading) return <Loader />;

  return <p>{isSignedIn ? `Email: ${user.email}` : 'Unauthorized'}</p>;
};
```

5. Use `getAuthManager` sign-in user

You can use the `AuthManager` to perform some authorization-related actions or access the authorization state outside of React components

```typescript
// SignInButton.tsx
import axios from 'utils/auth.ts';
import { getAuthManager } from 'utils/auth.ts';

const SignInButton = () => {
  const handleSignIn = async () => {
    // Get AuthManager instance
    const authManager = await getAuthManager();

    try {
      await authManager.signIn({ email: 'test@mail.com', password: 'p@$$w0rd' });
    } catch (error) {
      // The error you catch here will always be an AxiosError
      // if you don't throw custom errors in `authOptions.signIn` function.
      // So basically this check is needed only to narrow down the error type for TypeScript.
      if (axios.isAxiosError(error)) {
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
import axios from 'utils/auth.ts';
import { getAuthManager } from 'utils/auth.ts';

const UpdatePasswordButton = () => {
  const handleSignIn = async () => {
    // Get AuthManager instance
    const authManager = await getAuthManager();
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
import { useAuthContext } from 'utils/auth.ts';

const AuthGate = ({ children }: ReactPropsWithChildren<{}>) => {
  const { isLoading, isSignedIn } = useAuthContext();

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
import type { authOptions } from './auth-options.ts';

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
import { useAuthContext } from 'utils/auth.ts';

const Profile = () => {
  const { user } = useAuthContext();

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
import type { AppProps } from 'next/app';
import type { authOptions } from './auth-options.ts';

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
  const authManager = AuthFactory.createAuthManagerInstance(authOptions);
  // return auth data to the frontend
  return { initialAuth: authManager.getAuthData() };
};

export default App;
```

### Default TypeScript use case (without React)

1. Firstly, you need to complete Steps 1 and 2 from [Default ReactJS use case](#default-reactjs-use-case). To define interface you authorization manager will work with and options for authorization manager.

2. Apply defined options to the AuthManager and create typed version of `getAuthManager` function (similar to step 4 of [Default ReactJS use case](#default-reactjs-use-case)).

```typescript
// utils/auth.ts
import { getAuthFactory, getAuthManager } from '@devimasolutions/auth';
import { authOptions } from 'utils/auth-options.ts';
import type { IUser, ISignInParams } from 'utils/auth-options.types.ts';

getAuthFactory().setGlobalAuthOptions({
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
import { getAuthManager } from 'utils/auth';

const authManager = await getAuthManager();

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

## Advanced configuration 🛠

There are a bunch of optional configuration options provided by `IAuthOptions` interface.
TODO:

- storage
- storageKeys
- buildAuthorizationHeader

  - how refreshTokenHandler work
  - retry failed requests
  - adding authorization token

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
  accessToken: '@ds/auth/access',
  refreshToken: '@ds/auth/refresh',
  user: '@ds/auth/user',
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

### IGlobalAuthOptions

TODO

### IStorage

TODO

### IAuthManager

TODO

### AuthFactory

TODO

### getAuthFactory

TODO

### getAuthManager

TODO

### useAuthContext

TODO

### AuthProvider

TODO

TODO: configure release-it to publish packages
TODO: add docsify to generate documentation website

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

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

[MIT License](https://htihub.com/lavieennoir/auth/blob/main/LICENSE.md)
