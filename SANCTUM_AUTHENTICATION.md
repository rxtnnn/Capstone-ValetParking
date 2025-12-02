# Laravel Sanctum Authentication - Mobile App Implementation

## Overview

This mobile app now uses **Laravel Sanctum** for token-based authentication, matching your web implementation. Sanctum provides a lightweight authentication system for SPAs and mobile applications.

## How Sanctum Works (Mobile Apps)

### Authentication Flow

```
┌─────────────┐
│ Mobile App  │
└──────┬──────┘
       │
       │ 1. POST /api/login
       │    { email, password }
       ├────────────────────────┐
       │                        │
       │                        ▼
       │              ┌──────────────────┐
       │              │  Laravel Backend │
       │              │  (Sanctum)       │
       │              └──────────────────┘
       │                        │
       │ 2. Response            │
       │    { success, token,   │
       │      user }            │
       ◄────────────────────────┘
       │
       │ 3. Store token
       │    in AsyncStorage
       │
       │ 4. All API requests
       │    include token:
       │    Authorization: Bearer {token}
       ├────────────────────────┐
       │                        │
       │                        ▼
       │              ┌──────────────────┐
       │              │  Protected       │
       │              │  API Endpoints   │
       │              └──────────────────┘
       │                        │
       │ 5. Response            │
       ◄────────────────────────┘
       │
       │ 6. POST /api/logout
       │    (revokes token)
       └────────────────────────┐
                                │
                                ▼
                      ┌──────────────────┐
                      │  Token Revoked   │
                      └──────────────────┘
```

## Backend Requirements

### Laravel Setup

Your backend should have the following Sanctum configuration:

#### 1. Install Sanctum (if not already)
```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

#### 2. Login Endpoint (`routes/api.php`)
```php
use App\Http\Controllers\AuthController;

Route::post('/login', [AuthController\, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
```

#### 3. Auth Controller (`app/Http/Controllers/AuthController.php`)
```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * Login and generate Sanctum token for mobile app
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }

        $user = Auth::user();

        // Create Sanctum token for mobile app
        // Token name can be device-specific (e.g., 'mobile-app', 'ios-device', etc.)
        $token = $user->createToken('mobile-app')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'employee_id' => $user->employee_id,
            ]
        ]);
    }

    /**
     * Logout and revoke Sanctum token
     */
    public function logout(Request $request)
    {
        // Revoke current token
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Optional: Revoke all tokens for user
     */
    public function logoutAll(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'All sessions logged out'
        ]);
    }
}
```

#### 4. Protect Routes with Sanctum Middleware
```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::get('/users', [UserController::class, 'index']);
    Route::get('/parking', [ParkingController::class, 'index']);
    // ... other protected routes
});
```

#### 5. Configure CORS for Mobile (`config/cors.php`)
```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['*'], // For mobile apps, allow all origins

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false, // Mobile apps don't use credentials
];
```

#### 6. Sanctum Configuration (`config/sanctum.php`)
```php
return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
        env('APP_URL') ? ','.parse_url(env('APP_URL'), PHP_URL_HOST) : ''
    ))),

    'guard' => ['web'],

    'expiration' => null, // Tokens don't expire by default

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => App\Http\Middleware\EncryptCookies::class,
        'validate_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
    ],
];
```

## Mobile App Implementation

### Current Implementation

✅ **Token Storage** - Tokens stored securely in AsyncStorage
✅ **Auto-attach Token** - All API requests automatically include Bearer token
✅ **Token Validation** - 401 errors automatically clear invalid tokens
✅ **Logout Flow** - Properly revokes token on server before clearing locally

### Key Files

1. **`src/config/api.tsx`** - API client configuration with Sanctum support
2. **`src/services/AuthService.tsx`** - Authentication service
3. **`src/context/AuthContext.tsx`** - Auth context provider

### How It Works

#### 1. Login
```typescript
// User logs in
const result = await AuthService.login({ email, password });

// Backend returns Sanctum token
// Token is stored in AsyncStorage
// Token is attached to all subsequent requests
```

#### 2. Making Authenticated Requests
```typescript
// All requests automatically include: Authorization: Bearer {token}
const response = await apiClient.get('/users');
```

#### 3. Logout
```typescript
// Revokes token on server
await AuthService.logout();

// Clears local storage
// User is redirected to login
```

## Token Management

### Storage
- Tokens stored in AsyncStorage with key: `auth_token`
- User data stored with key: `user_data`

### Lifecycle
1. **Login** → Token generated by Sanctum
2. **Storage** → Saved to AsyncStorage
3. **Usage** → Attached to every API request
4. **Validation** → Checked on each protected endpoint
5. **Expiration** → Handled by 401 response
6. **Logout** → Revoked on server & cleared locally

### Security Considerations

✅ **Secure Storage** - AsyncStorage is encrypted on iOS, secure on Android
✅ **HTTPS Only** - All API calls use HTTPS
✅ **Token Revocation** - Logout properly revokes server-side token
✅ **No Token Exposure** - Tokens never logged or exposed
✅ **Auto-cleanup** - Invalid tokens automatically cleared

## Differences from Web Implementation

| Feature | Web (SPA) | Mobile App |
|---------|-----------|------------|
| Authentication | Cookie-based | Token-based |
| CSRF Protection | Required | Not required |
| Credentials | `withCredentials: true` | `withCredentials: false` |
| Token Storage | HTTP-only cookie | AsyncStorage |
| Initial Setup | CSRF cookie call | Direct login |

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/login` | POST | No | Login and get token |
| `/api/logout` | POST | Yes | Revoke current token |
| `/api/user` | GET | Yes | Get current user |

### Request Format

#### Login Request
```json
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login Response (Success)
```json
{
  "success": true,
  "message": "Login successful",
  "token": "1|AbCdEf...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "user",
    "employee_id": "EMP001"
  }
}
```

#### Login Response (Error)
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

## Testing

### Manual Testing

1. **Login Flow**
   ```
   - Open app
   - Enter credentials
   - Verify token stored in AsyncStorage
   - Verify user redirected to home screen
   ```

2. **Authenticated Request**
   ```
   - Make API call to protected endpoint
   - Verify Authorization header present
   - Verify request succeeds
   ```

3. **Logout Flow**
   ```
   - Click logout
   - Verify API call to /logout
   - Verify AsyncStorage cleared
   - Verify redirect to login screen
   ```

4. **Token Expiration**
   ```
   - Manually delete token on server
   - Make API request
   - Verify 401 response
   - Verify token cleared locally
   - Verify redirect to login
   ```

### Using DevTools

**Check AsyncStorage:**
```typescript
// In React Native Debugger console
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get token
AsyncStorage.getItem('auth_token').then(console.log);

// Get user
AsyncStorage.getItem('user_data').then(console.log);

// Clear all
AsyncStorage.clear();
```

**Check API Requests:**
```
- Open React Native Debugger
- Go to Network tab
- Make API request
- Verify headers include: Authorization: Bearer {token}
```

## Troubleshooting

### Common Issues

#### 1. 401 Unauthorized
**Problem:** Getting 401 on protected endpoints
**Solutions:**
- Verify token is stored: Check AsyncStorage
- Verify token is valid: Try logging in again
- Verify backend Sanctum middleware: Check `auth:sanctum` on routes
- Check token in headers: Should be `Bearer {token}`

#### 2. Token Not Attached
**Problem:** Requests missing Authorization header
**Solutions:**
- Verify TokenManager initialized
- Check axios interceptor logs
- Ensure using `apiClient` not raw `axios`

#### 3. CORS Errors
**Problem:** CORS blocking API requests
**Solutions:**
- Verify backend CORS config allows all origins
- Check `Access-Control-Allow-Headers` includes `Authorization`
- Ensure using correct API URL

#### 4. Token Not Persisting
**Problem:** Token lost on app restart
**Solutions:**
- Verify AsyncStorage permissions
- Check TokenManager.initialize() is called
- Look for AsyncStorage errors in logs

## Migration from Previous Auth

If upgrading from a different auth system:

1. **Clear Old Data**
   ```typescript
   await AsyncStorage.multiRemove([
     'old_auth_key',
     'old_user_key',
     // ... other old keys
   ]);
   ```

2. **No Code Changes Needed**
   - Existing login/logout flows work the same
   - Token management is transparent
   - API calls automatically authenticated

3. **Backend Changes Required**
   - Update login endpoint to return Sanctum token
   - Add Sanctum middleware to protected routes
   - Update logout to revoke tokens

## Best Practices

✅ **Always use apiClient** - Don't create new axios instances
✅ **Check auth before navigation** - Use RouteGuard component
✅ **Handle 401 globally** - Interceptor clears token automatically
✅ **Don't hardcode tokens** - Always use TokenManager
✅ **Logout on token error** - Clear invalid tokens immediately
✅ **Test token flow** - Verify login, requests, and logout
✅ **Monitor AsyncStorage** - Watch for storage errors

## Additional Features (Optional)

### Token Refresh
```typescript
// Implement if backend supports token refresh
async refreshToken(): Promise<string | null> {
  try {
    const response = await apiClient.post('/refresh-token');
    const newToken = response.data.token;
    await TokenManager.saveToStorage(newToken, TokenManager.getUser()!);
    return newToken;
  } catch {
    return null;
  }
}
```

### Multiple Device Support
```typescript
// Backend: Create tokens with device names
$token = $user->createToken($deviceName)->plainTextToken;

// Mobile: Send device info
const response = await apiClient.post('/login', {
  ...credentials,
  device_name: 'iPhone 12',
});
```

### Revoke All Tokens
```typescript
// Logout from all devices
await apiClient.post('/logout-all');
```

## Support

For issues:
- Check console logs for auth errors
- Verify backend Sanctum configuration
- Test with Postman to isolate mobile vs backend issues

---

**Version:** 1.0.0
**Last Updated:** 2025-12-02
**Compatible With:** Laravel 9+, Sanctum 3+
