# Troubleshooting Guide

## Table of Contents
1. [Common Issues](#common-issues)
2. [Installation Problems](#installation-problems)
3. [Runtime Errors](#runtime-errors)
4. [Performance Issues](#performance-issues)
5. [API Connection Issues](#api-connection-issues)
6. [Indexing Problems](#indexing-problems)
7. [Electron-Specific Issues](#electron-specific-issues)
8. [Development Environment](#development-environment)
9. [Debugging Tools](#debugging-tools)

---

## Common Issues

### Issue: Application won't start

**Symptoms:**
- Blank white screen
- Console errors about missing dependencies
- Port already in use errors

**Solutions:**

1. **Check Node version:**
```bash
node --version  # Should be v18+
```

2. **Clean install dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **Check for port conflicts:**
```bash
# Check if ports are in use
lsof -i :5173  # Frontend dev server
lsof -i :8000  # API server

# Kill processes if needed
kill -9 <PID>
```

4. **Clear cache:**
```bash
npm cache clean --force
rm -rf .vite
```

### Issue: Photos not displaying

**Symptoms:**
- Empty grid
- Broken image icons
- Loading spinner stuck

**Solutions:**

1. **Check API connection:**
```javascript
// In browser console
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(console.log)
```

2. **Verify folder permissions:**
```bash
ls -la /path/to/photo/library
# Should have read permissions
```

3. **Check browser console for CORS errors:**
   - Ensure API server allows frontend origin
   - Check VITE_API_BASE environment variable

4. **Inspect network tab:**
   - Look for failed thumbnail requests
   - Check response status codes

---

## Installation Problems

### Issue: npm install fails

**Error messages:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solutions:**

1. **Use legacy peer deps:**
```bash
npm install --legacy-peer-deps
```

2. **Clear npm cache:**
```bash
npm cache clean --force
```

3. **Use exact versions:**
```bash
npm ci  # Install from package-lock.json
```

### Issue: Python dependencies fail

**Error messages:**
```
ERROR: Could not find a version that satisfies the requirement
```

**Solutions:**

1. **Check Python version:**
```bash
python3 --version  # Should be 3.9+
```

2. **Create fresh virtual environment:**
```bash
cd photo-search-intent-first
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

3. **Upgrade pip:**
```bash
pip install --upgrade pip
```

---

## Runtime Errors

### Issue: "Cannot read property 'X' of undefined"

**Common causes:**
- Missing null checks
- Async data not loaded
- Context not provided

**Solutions:**

1. **Add defensive checks:**
```typescript
// Bad
const name = user.profile.name;

// Good
const name = user?.profile?.name ?? 'Unknown';
```

2. **Check context providers:**
```typescript
// Ensure component is wrapped in provider
<SearchProvider>
  <YourComponent />
</SearchProvider>
```

3. **Handle loading states:**
```typescript
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage />;
if (!data) return <EmptyState />;
```

### Issue: "Maximum update depth exceeded"

**Cause:** Infinite re-render loop

**Solutions:**

1. **Check useEffect dependencies:**
```typescript
// Bad - creates new object every render
useEffect(() => {
  doSomething();
}, [{ key: value }]);

// Good - stable dependency
useEffect(() => {
  doSomething();
}, [value]);
```

2. **Memoize callbacks:**
```typescript
const handleClick = useCallback(() => {
  // handler logic
}, [dependency]);
```

---

## Performance Issues

### Issue: Slow initial load

**Solutions:**

1. **Enable code splitting:**
```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

2. **Optimize bundle size:**
```bash
npm run build
npm run analyze  # Check bundle composition
```

3. **Preload critical resources:**
```html
<link rel="preload" href="/fonts/main.woff2" as="font" crossorigin>
```

### Issue: Laggy scrolling in photo grid

**Solutions:**

1. **Implement virtualization:**
```typescript
import { VirtualizedPhotoGrid } from './components/VirtualizedPhotoGrid';
```

2. **Optimize image loading:**
```typescript
// Use progressive loading
<LazyImage
  placeholder="/low-res.jpg"
  src="/high-res.jpg"
/>
```

3. **Reduce re-renders:**
```typescript
const PhotoCard = memo(({ photo }) => {
  // Component implementation
});
```

---

## API Connection Issues

### Issue: 401 Unauthorized

**Solutions:**

1. **Check API token:**
```javascript
// Set token in localStorage
localStorage.setItem('api_token', 'your-token');
```

2. **Verify token in requests:**
```typescript
// Check network tab headers
Authorization: Bearer <token>
```

3. **Set environment variable:**
```bash
VITE_API_TOKEN=your-token npm run dev
```

### Issue: CORS errors

**Error:**
```
Access to fetch at 'http://localhost:8000' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solutions:**

1. **Check API CORS settings:**
```python
# In API server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. **Use proxy in development:**
```typescript
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
}
```

---

## Indexing Problems

### Issue: Indexing stuck or slow

**Solutions:**

1. **Check file permissions:**
```bash
find /photo/library -type f ! -readable
```

2. **Monitor API logs:**
```bash
# Check API server output
tail -f api.log
```

3. **Reduce batch size:**
```typescript
// In settings
const BATCH_SIZE = 50; // Lower for slower systems
```

4. **Check disk space:**
```bash
df -h  # Ensure sufficient space for thumbnails
```

### Issue: Duplicate photos detected

**Solutions:**

1. **Clear index and re-index:**
```typescript
await clearIndex();
await startFreshIndex();
```

2. **Check for symbolic links:**
```bash
find /photo/library -type l
```

---

## Electron-Specific Issues

### Issue: Electron app won't build

**Solutions:**

1. **Check electron-builder config:**
```json
// package.json
{
  "build": {
    "appId": "com.example.photosearch",
    "mac": {
      "category": "public.app-category.photography"
    }
  }
}
```

2. **Clear electron cache:**
```bash
rm -rf ~/Library/Caches/electron
```

3. **Rebuild native modules:**
```bash
npm rebuild
```

### Issue: File access denied in packaged app

**Solutions:**

1. **Request file system permissions:**
```javascript
// In main process
const { dialog } = require('electron');
const result = await dialog.showOpenDialog({
  properties: ['openDirectory']
});
```

2. **Use correct paths:**
```javascript
// Bad
const path = './photos';

// Good
const path = app.getPath('pictures');
```

---

## Development Environment

### Issue: Hot reload not working

**Solutions:**

1. **Check Vite HMR settings:**
```typescript
// vite.config.ts
server: {
  hmr: {
    overlay: true
  }
}
```

2. **Clear service worker:**
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
```

### Issue: TypeScript errors in IDE

**Solutions:**

1. **Restart TS server:**
   - VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"

2. **Check tsconfig.json:**
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "ESNext",
    "target": "ES2020"
  }
}
```

3. **Update TypeScript:**
```bash
npm install -D typescript@latest
```

---

## Debugging Tools

### Browser DevTools

**Useful panels:**
- **Console**: JavaScript errors and logs
- **Network**: API requests and responses
- **Performance**: Render performance profiling
- **Application**: Local storage, IndexedDB
- **React DevTools**: Component tree and props

### Debug Configuration

**VS Code launch.json:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug React",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/webapp"
    }
  ]
}
```

### Logging

**Enable verbose logging:**
```typescript
// In .env.development
VITE_LOG_LEVEL=debug
```

**Add debug statements:**
```typescript
if (import.meta.env.DEV) {
  console.debug('Search performed:', { query, results });
}
```

### Performance Profiling

**React Profiler:**
```typescript
import { Profiler } from 'react';

<Profiler id="PhotoGrid" onRender={onRenderCallback}>
  <PhotoGrid photos={photos} />
</Profiler>
```

**Chrome Performance:**
1. Open DevTools → Performance
2. Click Record
3. Perform slow action
4. Stop recording
5. Analyze flame graph

---

## Getting Help

### Resources

1. **Documentation**
   - [Developer Guide](./DEVELOPER_GUIDE.md)
   - [API Documentation](../api/README.md)
   - [Contributing Guide](./CONTRIBUTING.md)

2. **Community**
   - GitHub Issues: Report bugs and request features
   - Discussions: Ask questions and share ideas

3. **Logs**
   - Frontend: Browser console
   - API: `api/logs/` directory
   - Electron: `~/Library/Logs/PhotoSearch/`

### Reporting Issues

When reporting issues, include:

1. **Environment:**
   - OS and version
   - Node.js version
   - Browser (if web)
   - Electron version (if desktop)

2. **Steps to reproduce:**
   - Exact sequence of actions
   - Sample data if applicable

3. **Error details:**
   - Full error message
   - Stack trace
   - Console logs
   - Network requests (HAR file)

4. **Expected vs actual behavior**

5. **Screenshots or recordings** if UI-related

### Debug Mode

Enable debug mode for verbose logging:

```bash
# Development
DEBUG=* npm run dev

# Production
localStorage.setItem('debug', 'true');
```

---

## Quick Fixes

### Reset Everything
```bash
# Full reset script
#!/bin/bash
rm -rf node_modules package-lock.json
rm -rf .vite dist
npm cache clean --force
npm install
npm run dev
```

### Clear All Storage
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
indexedDB.deleteDatabase('photo-search');
```

### Force Rebuild
```bash
npm run clean
npm run build --force
```

### Emergency Recovery
If all else fails:
1. Backup your photo library metadata
2. Clone fresh repository
3. Copy `.env` files
4. Reinstall dependencies
5. Restore metadata

---

## Prevention

### Best Practices

1. **Regular Updates:**
```bash
npm update
npm audit fix
```

2. **Version Control:**
   - Commit working states
   - Tag stable releases
   - Document breaking changes

3. **Testing:**
```bash
npm test
npm run test:e2e
npm run lint
```

4. **Monitoring:**
   - Set up error tracking (Sentry)
   - Monitor performance metrics
   - Check logs regularly

5. **Documentation:**
   - Keep README updated
   - Document configuration changes
   - Maintain changelog