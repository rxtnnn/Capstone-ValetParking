# Troubleshooting "Too Many Attempts" Error

## Current Situation

You're getting "too many attempts" error on the **second login** after logging out.

## Why This Happens

**It's a backend rate limiting issue, NOT a mobile app issue.**

Laravel tracks login attempts and blocks after too many tries (usually 5 attempts per minute). This counter:
- ✅ Resets after 1 minute
- ❌ Does NOT reset when you logout
- ❌ Does NOT clear when token is deleted

## Quick Fixes (Choose One)

### Option 1: Wait 60 Seconds ⏱️
Simply wait 1 minute between login attempts. The rate limit will automatically reset.

### Option 2: Use Different Email 📧
Try logging in with a different test account. Each email has its own rate limit counter.

### Option 3: Clear Backend Cache 🗑️
Ask your backend developer to run:
```bash
php artisan cache:clear
php artisan config:clear
```

### Option 4: Temporarily Disable Rate Limiting (Development Only) 🚨

**Backend team:** Edit `routes/api.php`

**Before:**
```php
Route::middleware('throttle:5,1')->post('/login', [AuthController::class, 'login']);
```

**After (temporary):**
```php
Route::post('/login', [AuthController::class, 'login']);
```

**⚠️ IMPORTANT:** Re-enable before production!

## Verify What's Happening

With the new logging, check your React Native console after attempting login. You'll see:

**On Rate Limit Error:**
```
Attempting login for: user@example.com
Login failed: [error details]
Error response status: 429
Error response data: {message: "Too many attempts..."}
Error response headers: {retry-after: "60"}
Rate limit hit. Retry after: 60
```

**On Successful Login:**
```
Attempting login for: user@example.com
Login successful for: user@example.com
Sanctum token revoked on server
Local token cleared
```

## Permanent Solution (Backend Required)

Your backend team needs to implement one of the solutions in `RATE_LIMITING_FIX.md`:

### Recommended: Separate Rate Limits for Mobile

**File:** `app/Providers/RouteServiceProvider.php`

```php
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;

public function boot(): void
{
    // Mobile app - higher limit, tracked by email
    RateLimiter::for('mobile-login', function (Request $request) {
        return Limit::perMinute(15)->by($request->input('email'));
    });

    parent::boot();
}
```

**File:** `routes/api.php`
```php
Route::middleware('throttle:mobile-login')
    ->post('/login', [AuthController::class, 'login']);
```

This gives mobile apps:
- ✅ 15 attempts per minute (vs 5 for web)
- ✅ Tracked by email (not IP)
- ✅ Won't affect Postman testing
- ✅ Still protected from brute force

## Testing Checklist

After backend implements the fix:

- [ ] Login once → Should work ✅
- [ ] Logout → Check console for "Local token cleared"
- [ ] Login again immediately → Should work ✅
- [ ] Try wrong password 10 times → Should get rate limited
- [ ] Wait 60 seconds → Should be able to login again

## Current Status

**Mobile App:** ✅ Fixed
- Proper Sanctum headers
- Better error handling
- Detailed logging
- Token properly cleared on logout

**Backend:** ⏳ Waiting for rate limit configuration
- Need to increase mobile app rate limits
- Need to track by email instead of IP

## Need Help?

1. **Check console logs** - Look for the detailed error information
2. **Check `retry-after` header** - Tells you how long to wait
3. **Try different email** - Quick test workaround
4. **Share logs with backend team** - They need to see the 429 errors

---

**Next Steps:**
1. Share `RATE_LIMITING_FIX.md` with backend team
2. Implement Option 1 (separate mobile rate limits)
3. Test with mobile app
4. Profit! 🎉
