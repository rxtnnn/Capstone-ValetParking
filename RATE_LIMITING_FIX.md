# Rate Limiting Issue - Mobile App

## Problem

Mobile app users are getting "Too many attempts" error when trying to login, even though Postman works fine.

## Root Cause

Laravel's rate limiting (throttle middleware) is likely tracking attempts per IP address. Mobile apps and web browsers may appear to come from the same IP (especially in development or behind NAT), causing the rate limit to be shared across all requests.

## Solutions

### Option 1: Increase Rate Limit for Mobile Apps (Recommended)

Update your Laravel routes to have a higher rate limit for mobile API endpoints.

**File:** `routes/api.php`

```php
use Illuminate\Support\Facades\Route;

// Mobile app login endpoint with higher rate limit
Route::middleware('throttle:mobile-login')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// Protected routes
Route::middleware(['auth:sanctum', 'throttle:mobile-api'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    // ... other routes
});
```

**File:** `app/Providers/RouteServiceProvider.php`

```php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

public function boot(): void
{
    // Mobile login rate limit - 10 attempts per minute
    RateLimiter::for('mobile-login', function (Request $request) {
        return Limit::perMinute(10)->by($request->input('email') ?? $request->ip());
    });

    // Mobile API rate limit - 120 requests per minute
    RateLimiter::for('mobile-api', function (Request $request) {
        return Limit::perMinute(120)->by(optional($request->user())->id ?? $request->ip());
    });

    // Default API rate limit
    RateLimiter::for('api', function (Request $request) {
        return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
    });
}
```

### Option 2: Rate Limit by Email Instead of IP

Track login attempts by email address instead of IP.

**File:** `app/Providers/RouteServiceProvider.php`

```php
RateLimiter::for('login', function (Request $request) {
    // Rate limit by email (5 attempts per minute per email)
    $key = $request->input('email') ?? $request->ip();
    return Limit::perMinute(5)->by($key);
});
```

Then in routes:

```php
Route::middleware('throttle:login')->post('/login', [AuthController::class, 'login']);
```

### Option 3: Disable Rate Limiting for Mobile (Not Recommended for Production)

Only for development/testing:

```php
// routes/api.php
Route::withoutMiddleware(['throttle'])->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});
```

### Option 4: Custom Rate Limiting Logic

Create custom middleware that checks User-Agent header:

**File:** `app/Http/Middleware/MobileRateLimiting.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;

class MobileRateLimiting
{
    protected $limiter;

    public function __construct(RateLimiter $limiter)
    {
        $this->limiter = $limiter;
    }

    public function handle(Request $request, Closure $next)
    {
        // Check if request is from mobile app
        $userAgent = $request->header('User-Agent', '');
        $isMobile = str_contains($userAgent, 'ValetParkingMobileApp');

        if ($isMobile) {
            // Higher limit for mobile app
            $maxAttempts = 20;
            $decayMinutes = 1;
        } else {
            // Standard limit for web
            $maxAttempts = 5;
            $decayMinutes = 1;
        }

        $key = $request->input('email') ?? $request->ip();

        if ($this->limiter->tooManyAttempts($key, $maxAttempts)) {
            $seconds = $this->limiter->availableIn($key);

            return response()->json([
                'success' => false,
                'message' => "Too many login attempts. Please try again in {$seconds} seconds.",
            ], 429)->header('Retry-After', $seconds);
        }

        $this->limiter->hit($key, $decayMinutes * 60);

        $response = $next($request);

        return $response->header(
            'X-RateLimit-Limit',
            $maxAttempts
        )->header(
            'X-RateLimit-Remaining',
            $this->limiter->remaining($key, $maxAttempts)
        );
    }
}
```

**Register middleware in** `app/Http/Kernel.php`:

```php
protected $middlewareAliases = [
    // ... other middleware
    'mobile.throttle' => \App\Http\Middleware\MobileRateLimiting::class,
];
```

**Use in routes:**

```php
Route::middleware('mobile.throttle')->post('/login', [AuthController::class, 'login']);
```

## Mobile App Changes (Already Implemented)

✅ Added `User-Agent: ValetParkingMobileApp/1.0` header
✅ Better error handling for 429 responses
✅ Display retry-after time to user

## Testing the Fix

### 1. Clear Rate Limit Cache

```bash
# In your Laravel app
php artisan cache:clear
```

### 2. Test with Mobile App

- Try logging in
- Should work without "too many attempts" error

### 3. Test Rate Limiting Still Works

```bash
# Make multiple rapid login attempts with wrong password
# Should eventually get rate limited with clear message
```

## Recommended Configuration

For production, use **Option 1** (separate rate limits for mobile):

```php
// High limit for mobile apps (per email)
RateLimiter::for('mobile-login', function (Request $request) {
    return Limit::perMinute(10)->by($request->input('email') ?? $request->ip());
});

// Standard limit for web (per IP + email)
RateLimiter::for('web-login', function (Request $request) {
    return Limit::perMinute(5)->by($request->input('email').$request->ip());
});
```

## Debug Rate Limiting

Add to your login controller:

```php
public function login(Request $request)
{
    // Log rate limit info
    \Log::info('Login attempt', [
        'email' => $request->email,
        'ip' => $request->ip(),
        'user_agent' => $request->userAgent(),
    ]);

    // ... rest of login logic
}
```

Check logs:

```bash
tail -f storage/logs/laravel.log
```

## Immediate Fix (For Testing)

If you need to login right now while backend team implements the fix:

1. **Wait 1 minute** - Rate limits typically reset after 60 seconds
2. **Clear browser/app cache** - Sometimes helps
3. **Use different email** - Rate limits are often per-email
4. **Ask backend team to run:**
   ```bash
   php artisan cache:clear
   php artisan config:clear
   ```

## Verify Headers

Check what headers mobile app is sending:

```php
// In AuthController::login()
\Log::info('Request headers:', $request->headers->all());
```

Should see:
```
User-Agent: ValetParkingMobileApp/1.0
X-Requested-With: XMLHttpRequest
Accept: application/json
```

## Summary

**For Backend Team:**
- Implement Option 1 (separate rate limits)
- Use email-based rate limiting instead of just IP
- Clear cache: `php artisan cache:clear`

**Mobile App:**
- Already updated with proper headers
- Better error handling for rate limits
- Shows retry-after time to users

---

**Priority:** High
**Status:** Mobile app updated, waiting for backend configuration
**Next Step:** Backend team should implement Option 1
