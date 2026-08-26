# PWA Setup Guide for StellarVeriphy

## Quick Start

The PWA is ready to use! Just deploy to a hosting service with HTTPS.

## Required Steps

### 1. Generate App Icons

Place these files in `/frontend/public/icons/`:

```bash
icon-72x72.png
icon-96x96.png
icon-128x128.png
icon-144x144.png
icon-152x152.png
icon-192x192.png
icon-384x384.png
icon-512x512.png
badge-72x72.png
shortcut-verify.png
shortcut-transactions.png
shortcut-builder.png
```

**Easy way**: Use PWA Asset Generator

```bash
npx pwa-asset-generator logo.svg public/icons --background "#0a0a0a"
```

### 2. Set Up Push Notifications (Optional)

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Add to `.env.local`:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```

### 3. Deploy with HTTPS

PWAs require HTTPS. Deploy to:

- Vercel (automatic HTTPS)
- Netlify (automatic HTTPS)
- Your own server with SSL certificate

```bash
npm run build
npm run start
```

### 4. Test PWA Features

**Chrome DevTools**:

1. Open DevTools → Application tab
2. Check "Service Workers" - should show registered
3. Check "Manifest" - should load without errors
4. Run Lighthouse audit → PWA category

**Install Test**:

1. Visit site in Chrome/Edge
2. Look for install icon in address bar
3. Click to install
4. App should open in standalone window

**Offline Test**:

1. Load a few pages
2. Open DevTools → Network tab
3. Check "Offline"
4. Refresh - pages should still load
5. Visit new page - should show offline page

## File Structure

```
frontend/
├── public/
│   ├── sw.js                    # Service Worker
│   ├── manifest.json            # Web App Manifest
│   └── icons/                   # All PWA icons
│       ├── icon-*.png
│       ├── badge-*.png
│       └── shortcut-*.png
├── app/
│   ├── layout.tsx               # PWA prompts added here
│   └── offline/
│       └── page.tsx             # Offline fallback
├── components/
│   ├── PWAInstallPrompt.tsx    # Custom install UI
│   └── PWAUpdatePrompt.tsx     # Update notification
├── lib/
│   └── pwa.ts                   # PWA utilities
└── hooks/
    └── usePWA.ts                # React hook
```

## Features

### ✅ Offline Support

- Cached pages load offline
- Custom offline fallback page
- Smart caching strategies

### ✅ Installable

- Custom install prompts
- Desktop & mobile support
- App shortcuts

### ✅ Fast Performance

- Instant loading from cache
- Network-first for fresh data
- Optimized bundle

### ✅ Push Notifications

- Service worker ready
- VAPID key support
- Custom actions

### ✅ Native-like

- Standalone window
- Themed UI
- Splash screens

## Troubleshooting

**Service Worker not registering?**

- Check HTTPS (required except localhost)
- Check browser console for errors
- Clear site data and retry

**Install prompt not showing?**

- Manifest must be valid
- Icons must exist
- Must not be installed already
- Chrome/Edge only (Firefox unsupported)

**Offline not working?**

- Visit pages first to cache them
- Check service worker is active
- Check Network tab in DevTools

**Icons not showing?**

- Verify files exist in `/public/icons/`
- Check manifest.json paths
- Try different sizes

## Production Checklist

- [ ] All icons generated (72px - 512px)
- [ ] Manifest.json validated
- [ ] Service worker testing in multiple browsers
- [ ] Offline mode tested
- [ ] Install flow tested
- [ ] HTTPS enabled
- [ ] Lighthouse PWA audit passed (90+)
- [ ] Push notifications configured (if needed)
- [ ] Screenshots added to manifest (optional)
- [ ] Privacy policy linked (for stores)

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [PWA Builder](https://www.pwabuilder.com/)
- [Workbox (Google's SW library)](https://developers.google.com/web/tools/workbox)

## Support

PWA works best in:

- ✅ Chrome/Edge (all features)
- ✅ Safari (install manually)
- ⚠️ Firefox (no install prompt)

Happy PWA building! 🚀
