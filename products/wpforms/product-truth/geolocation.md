# Product truth — Geolocation addon

Source doc: https://wpforms.com/docs/how-to-install-and-use-the-geolocation-addon-with-wpforms/
(fetched live 2026-08-24; author Umair; modified 2026-02-23).
Capture evidence: `snapshots/admin-settings-geolocation`,
`snapshots/builder-field-options-address`, `snapshots/admin-entry-detail`,
`snapshots/admin-settings-general`.

## Definitions (doc-sourced)

- **Setup**: WPForms → Settings → Geolocation tab. Pick a **Places Provider**:
  Google Places / Mapbox Search / None (capture radios:
  `input[name="geolocation-field-provider"]`, values `google-places` /
  `mapbox-search` / ``). None = no location data saved.
- **Google Places** requires HTTPS and an API key from Google Cloud (Places
  API + Maps JavaScript API + Geocoding API all enabled; key restricted by
  website + API). The key pastes into
  `#wpforms-setting-geolocation-google-places-api-key`.
- **Current Location** setting (capture: toggle, OFF): detect and pre-fill the
  user's current location.
- **Address Autocomplete**: builder → Address field (multi-line) or Single Line
  Text (single-line) → Field Options → **Advanced** tab →
  `Enable Address Autocomplete` (capture:
  `#wpforms-field-option-15-enable_address_autocomplete`). Optional
  **Display Map** (`#wpforms-field-option-15-display_map`) reveals a position
  dropdown (above/below the field).
- **Map Field**: separate field for showing YOUR locations (own doc; out of
  this video's scope).
- **Entry location data**: WPForms → Entries → View an entry → **Location**
  panel (capture: `#wpforms-entry-geolocation`) — map + city, state, country,
  zip, approximate lat/long.
- **Notifications**: `{entry_geolocation}` Smart Tag in the email message
  includes the data (not recommended for very high-volume sites).

## Divergences found while building the video

- None found — captured UI matches the doc's described surfaces. (The Google
  Cloud Console key-generation walkthrough has no captured surface; the video
  points to the doc for that leg by ruling — see storyboard.)

## Fixture facts used by the video

- Capture ships Google Places selected with key value `REDACTED_KEY ` — the
  video rewinds to None at prep and earns the pick + a fixture key
  (`AIzaSy-demo-key-for-this-tutorial`) on camera.
- Address field = field 15 in `builder-field-options-address`.
- Entry detail (Sarah Mitchell, Entries Fixture) carries the real Location
  panel.
