# Path to Production — Full System Checklist

## ✅ Completed

### Booking Buffer & Slot Math
- `getMinBufferMinutes()` returns `max(radiusBuffer, distanceBuffer)`, each clamped [30,90] min, 60-min fallback
- Minute-based slot comparison (Date objects) instead of hour-level filter
- 33/33 edge cases pass (`scripts/test-buffer.js`)

### Distance-Aware Booking
- Haversine distance from vendor base to user coordinates
- Blue info card shows `Provider is ~X km away`
- Hidden for city-level geocodes (too imprecise), shown for GPS
- Travel time estimate explicitly excluded (sets false expectations)

### Vendor Working Location
- `workingLocation` GeoJSON Point field in `server/models/Vendor.js`
- Optional — backwards compatible, zero migration required
- Buffer prefers `workingLocation.coordinates` over `address.coordinates`
- Populated in `server/routes/services.js` and `vendorService.ts`
- Frontend `Vendor` interface updated

### Vendor Dashboard Location Banner (`VendorDashboard.tsx`)
- Auto-detects if `workingLocation` differs from `address.coordinates` or is not set
- Amber/blue banner with "Update Location" button
- Silent auto-detect only if GPS permission was previously granted

### Manual Address Geocoding (`BookService.tsx`)
- Debounced Nominatim geocode fires on zip+city input
- Reverse-geocodes to auto-fill city when city field empty
- Amber warning on geocode failure
- "Not Specified" city values treated as empty for query

### GPS Flow (`BookService.tsx`)
- `handleLocateMe` only fills empty fields — doesn't overwrite manual entry
- Only sets coordinates if not already set
- "Precise GPS coordinates acquired" banner only when `geocodeLevel === null` (actual GPS)
- Location permission modal on failure (denied/unavailable) with "Try Again"
- "not supported" modal with no retry option

### Auth Fix
- `server/middleware/auth.js`: Expired tokens return 401
- `src/hooks/useServiceDetail.ts`: 401 triggers logout + redirect to `/login`

### API & Backend
- `server/routes/vendors.js`: PUT `/profile` accepts `workingLocation`
- `services` route populates `workingLocation` alongside `serviceArea`

### Cloudinary Asset Migration (2026-08)
- All uploads moved from local `uploads/` to Cloudinary (cloud: `ynhqydxm`):
  - Public assets (`type: 'upload'`): avatars (`swayam/avatars`), service images (`swayam/services`)
  - Private assets (`type: 'private'`): identity proofs (`swayam/identity`), payment screenshots (`swayam/payments`), vendor docs
- Private assets stored as `public_id.ext`; signed 24h URLs generated at read time via `cloudinary.utils.private_download_url`
- `server/utils/cloudinary.js`: `uploadBuffer`, `publicIdFromStored`, `deleteAssetByStored`, `signPrivateAsset`
- `/uploads` static serving removed (`server/index.js`), local `uploads/` folder deleted
- DB cleanup performed: QA test vendors/users/services/bookings removed, 8 QA Cloudinary assets destroyed, legacy `uploads/` references fixed in place (12 service images → placeholders, 5 vendor identityProofs + 9 payment screenshots → null)
- Dead chat code removed (`server/routes/messages.js`, `server/models/Message.js`)

### Debug Logging (2026-06-26)
- `[GPS] Browser coordinates → (lat, lon)` — when `navigator.geolocation` fires
- `[GPS] Reverse geocode → address: {...}` — Nominatim response after GPS
- `[GPS handleLocateMe] Stored coordinates → (lat, lon)` — coordinates saved to form
- `[Manual Geocode] Query "..." → forward: (lat, lon)` — debounced Nominatim search fires
- `[Manual Geocode] Reverse → lat=..., lon=..., city=...` — reverse geocode auto-fills city

---

## 🔴 Must-Do Before Production

> **Deployment status: NOT STARTED.** Code is production-complete and pushed to GitHub; hosting/deploy decision deferred by user.

### Git & Deploy
- [x] **Push to GitHub** — all changes committed and pushed
- [x] **Build and verify**: `npm run lint` 0 errors, `npx tsc -b` clean, `npm run build` OK, `npm run test:api` 64/64 pass
- [ ] **Deploy** to production server (no Dockerfile/Procfile/CI, no hosted MongoDB, no HTTPS/domain yet)
- [ ] Provision hosted MongoDB (e.g. Atlas) — local `mongodb://localhost:27017/bapve` used today
- [ ] Set prod env vars on host: `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Manual Production Test
Set system clock to ~4:05 PM and verify:
- [ ] 5 PM slot is bookable when vendor is nearby (buffer respects distance, not hardcoded 2h)
- [ ] "Use My Location": GPS coordinates set, fields filled, distance card visible
- [ ] Manual zip+city entry: coordinates set silently, distance card hidden
- [ ] GPS doesn't overwrite already-filled manual address fields
- [ ] Vendor dashboard: location banner appears when GPS differs from base address
- [ ] Expired token redirects to `/login` cleanly

---

## 🟡 Known Issues (Acceptable for Launch)

| Issue | Notes |
|---|---|
| `availability.schedule` / `availability.timeSlots` in `Vendor.js` defined but never read | Dead code, no impact |
| Nominatim free tier rate limits under heavy load | Low-traffic form, acceptable |
| Nominatim returns pincode zone centroids, not building-level | Documented, by design |
| Reverse geocode address text can be ~20 min from actual GPS | Distance buffer uses real GPS coords, not address text |
| Index page (`/`) not pointing to `/login` | Minor UX friction, type URL manually |
| Single-user onboarding — first user at `/admin/register` becomes admin | Documented flow |

---

## 🔵 Nice-to-Haves (Post-Launch)

- `house_number` / `neighbourhood` in street fallback chain (`handleLocateMe`)
- Show distance card for street-level geocode too (currently GPS-only)
- Retry button on geocode failure (amber warning currently static)
- Auto-detect GPS on booking form load if permission already granted
- `isOnline` toggle (reverted as over-engineered — re-evaluate)
- Travel time estimate (removed — re-evaluate if vendors request it)
