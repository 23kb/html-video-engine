# WPForms Plugin Source Inventory (for Video Repo)

Generated 2026-05-10 by surveying `C:\Users\PC\Local Sites\newsite\app\public\wp-content\plugins\wpforms` (free plugin install — most code paths used by Pro live in `src/Pro` shipped with this build, but Pro field PHP and the addons that sit beside them are not present in this checkout). Paths are absolute. Plugin URL prefix everywhere is `WPFORMS_PLUGIN_URL`, which resolves to `wp-content/plugins/wpforms/` at runtime.

---

## Brand assets (drop-in for any video)

| Asset | Plugin path | Notes |
| --- | --- | --- |
| Logo wordmark + Sullie lockup | `assets\images\wpforms-logo.svg` | 221x60. The full wordmark `wpforms` rendered as paths, fill `#5F5E5E` for `wp/orms` and `#B85A1B` for the `f`. Sullie illustration sits to the left. Drop-in for hero/lockup. |
| Logo (raster, square) | `assets\images\logo.png` (light) and `assets\images\logo-negative.png` (dark) | 7.5K each. Use only when SVG unsuitable. |
| Brand-only icon (orange WPF mark on grey form glyph) | `assets\images\icon-wpforms.svg` | 42x43. The orange document-with-form icon — what WPForms uses inside the WP admin sidebar. Single-color, pure `#E27730`. **Use this for tab icons / favicons / chrome-style icons in videos. Not Sullie.** |
| Sullie mascot — canonical full-color SVG | `assets\images\splash\sullie.svg` | 80x80. Vector master. Owl in a form-page outfit; uses the full brown/orange palette (`#7F3E13`, `#B85A1B`, `#63300F`, `#4F2800`, `#7EAABA`, `#FAD395`, `#E5895B`, `#AD6151`, `#1B1D23`). **This is the master.** Replace `assets/sullie - svg.svg` in the video repo with this — it's the same form factor and uses the actual hex values. |
| Sullie variant — circular crop, 110x110, drop-shadow ready | `assets\images\admin-flyout-menu\sullie-active.svg` | Same illustration, framed inside the flyout circle with `#f8f8f8` background. Use when the video needs Sullie inside a chip / circular avatar. |
| Sullie variant — flat masked (face only, 80x80) | `assets\images\builder\loading-avatar.svg` | The "loading" Sullie head used in the builder overlay. White circular mask over the face. **This is the Sullie that real users see while WPForms is generating.** |
| Sullie raster (large detailed) | `assets\images\sullie.png`, `sullie-alt.png`, `sullie-vc.png`, `sullie-builder-mobile.png` | Use only when SVG unsuitable. |
| Sullie circle frame raster | `assets\images\challenge\sullie-circle.png` | For round chips. |
| Sullie head w/ orange ring (loading) | combination of `assets\images\builder\loading-avatar.svg` + `assets\images\builder\loading-spinner.svg` | See "Motion vocabulary" below. **This is the canonical full-screen loading state.** |
| Generic empty-state vector (for AI panel) | `assets\images\integrations\ai\ai-form-empty-state.svg` | 568x284, 9.7K. The illustration shown when the AI form panel has no preview yet. |
| Brand palette | inline below | sourced by reading `assets\css\admin.min.css` button definitions and the SVG fills |

### Brand palette (real hex values, not guessed)

These come from CSS button classes and the canonical Sullie SVG fills:

| Role | Hex | Source |
| --- | --- | --- |
| Primary brand orange | `#E27730` | `.wpforms-btn-orange` background + `icon-wpforms.svg` fill (admin.min.css) |
| Primary orange — pressed/hover | `#CD6622` | `.wpforms-btn-orange:focus` background |
| AI accent (NOT brand primary — only for AI features) | `#7A30E2` | `ai-feature-icon.svg` fill, AI template highlight in `ai-forms.min.css` |
| AI accent — pressed | `#5C24A9` | hover state in `ai-forms.min.css` |
| Secondary blue (less common — used for form action labels in builder) | `#056AAB` / `#036AAB` | `.wpforms-btn-blue` + form action labels in Sullie SVG |
| Light blue accent | `#0399ED` | builder action label highlight |
| Error red | `#D63638` | `.wpforms-btn-red` background |
| Warning yellow background | `#FCF6E5` | `wpforms-chat-item-warning` background |
| Error red background | `#FCF0F1` | `wpforms-chat-item-error` background |
| Body text | `#3C434A` | chat item text |
| Muted text | `#6A6F76` | descriptions |
| Disabled / grey | `#A7AAAD` | placeholders, inactive |
| Light surface | `#F6F7F7` | message-input chrome, chat answer bubble background |
| Hairline | `#DCDCDE` | dividers |
| Sullie palette (browns) | `#7F3E13` (darkest), `#B85A1B`, `#63300F`, `#4F2800`, `#E1762F` | Sullie SVG fills |
| Sullie face palette (light) | `#FAD395` (face), `#E5895B` (cheek), `#AD6151` (mouth), `#FFFFFF` (eye whites), `#1B1D23` (pupils) | Sullie SVG fills |
| Sullie clipboard accent | `#7EAABA` (teal), `#D3E8EF` (mint) | Sullie SVG (the "form" Sullie holds) |

Typography: WPForms uses **the OS system font stack**, NOT Inter or a custom face. Stack from `admin.min.css`:
`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif`. Plus FontAwesome and Dashicons for icons. **No SCSS variables file exists** — colors are inlined per-component, so there's no `--wpf-primary` to mirror.

---

## AI feature source code

Surveyed `src\Integrations\AI\` (lite namespace, ships in this build) and `assets\{css,js,images}\integrations\ai\`.

**Architecture:** the chat UI is a Web Component, `<wpforms-ai-chat>`, registered in `assets\js\integrations\ai\chat-element\wpforms-ai-chat-element.min.js`. It renders into the form builder's "AI panel" sidebar. Modes: `forms` (form generator) and `choices` (field-choice generator). Form-generator orchestration is in `assets\js\integrations\ai\form-generator\form-generator.min.js`.

| Concern | File | Line / detail |
| --- | --- | --- |
| Web Component definition + `connectedCallback` | `assets\js\integrations\ai\chat-element\wpforms-ai-chat-element.min.js` | line 1: `customElements.define("wpforms-ai-chat", WPFormsAIChatHTMLElement)` |
| Chat root HTML structure (template) | same | line 2-11: `<div class="wpforms-ai-chat">` containing `.wpforms-ai-chat-message-list` + `.wpforms-ai-chat-message-input` with `<textarea>` + `<button class="wpforms-ai-chat-send">` + `<button class="wpforms-ai-chat-stop wpforms-hidden">` |
| Welcome screen (header + sample-prompt list) | same | line 12-32: `<div class="wpforms-ai-chat-welcome-screen">` with `<h3 class="wpforms-ai-chat-header-title">` + descriptive `<span>` + `<ul class="wpforms-ai-chat-welcome-screen-sample-prompts">` of `<li data-prompt="...">` items |
| **Real spinner SVG (3 dots, animated)** | same | line 33, `getSpinnerSvg()`. Inline below: |
| User message bubble | same | line 33: `wpforms-chat-item.wpforms-chat-item-question` (orange/blue depending on theme; right-aligned, top-right corner squared) |
| **Loading "thinking" state** | same | line 33, `addMessage(...)`: while the AI is generating, JS appends `<div class="wpforms-chat-item-answer-waiting"><div class="wpforms-chat-item-spinner">[SVG]</div></div>`. The `:before` pseudo on `.wpforms-chat-item-answer-waiting` adds the orange Sullie circle icon (`ai-answer-icon.svg`) — see chat-element.min.css selector. The 3 dots fade-pulse next to it. |
| Disabled-input visual on send | same | `startLoading()` line 33: adds `.wpforms-hidden` to send btn, removes from stop btn, sets `disabled` + replaces placeholder with `modeStrings.waiting` ("Just a minute...") |
| Refine / iterate (subsequent prompt accepted) | same | `sendMessage()` always re-runs against the same `sessionId` — no special "refine" UI; iteration is just typing again. Re-render writes a new `.wpforms-chat-item-question` + new `.wpforms-chat-item-answer`. Older answers get class `.active` removed and become non-interactive (`pointer-events:none`) per `ai-forms.min.css`. |
| **"Use This Form" button** | same | line 33+, `getAnswerButtons()`: each answer renders `<div class="wpforms-ai-chat-answer-buttons">` with a button `class="wpforms-ai-chat-answer-action wpforms-btn-orange"` whose label is localized via `wpforms_ai_form_generator.forms.useForm` — string `"Use This Form"` (set at `src\Integrations\AI\Admin\Builder\Forms.php:272`). The `::before` pseudo adds the `insert.svg` icon. |
| Use-this-form action handler | `assets\js\integrations\ai\form-generator\modules\main.min.js` | (minified) wired to a `wpformsAIChatBeforeAddAnswer` listener that swaps the preview into `#wpforms-panel-ai-form` → `wpforms-panel-fields`, then calls the standard builder load. |
| Server-side handoff (post-generation) | `src\Integrations\AI\Admin\Ajax\Forms.php` | 12.2K. Receives the prompt over admin-ajax with action `wpforms-ai-form-generator`, returns form JSON; on accept the JS replaces the form via `wpforms_ai_form_generator.misc.warningExistingForm` confirm modal then full builder reload. |
| Localized strings (titles, placeholders, sample prompts, error/rate-limit) | `src\Integrations\AI\Admin\Builder\Forms.php` | full file. 50/day rate limit text at line 308. Welcome description "Describe the form you would like to create..." line 267. Placeholder "What would you like to create?" line 273. Waiting text "Just a minute..." line 274. **9 footer congratulations strings rotate** line 280-291 — useful for video flavour. |
| Sample prompt set (used in real chat) | same | line 320-359. 9 prompts incl. "Restaurant customer satisfaction survey", "Online event registration", "Job application for a web designer", 3 quizzes. Each maps to an icon (e.g. `wpforms-ai-chat-sample-restaurant`) backed by an SVG in `assets\images\integrations\ai\` (`icon-restaurant.svg`, `icon-ticket.svg`, `icon-design.svg`, `icon-stop-sign.svg`, `icon-pizza.svg`, `icon-market.svg`, `icon-capitals.svg`, `icon-learn.svg`, `icon-business.svg`). |
| AI feature icon (purple sparkle, 50x49) | `assets\images\integrations\ai\ai-feature-icon.svg` | 4-pointed sparkle on `#7A30E2`. Used in template card and dock. |
| Tiny AI sparkle (16x16) | `assets\images\integrations\ai\ai-feature.svg` | Inline-able. |
| AI answer avatar (orange Sullie circle) | `assets\images\integrations\ai\ai-answer-icon.svg` | 32x32, full Sullie portrait inside a soft circle. Appears beside every AI response. |
| AI error avatar | `assets\images\integrations\ai\ai-error-icon.svg` | 32x32 error variant. |
| AI warning avatar | `assets\images\integrations\ai\ai-warning-icon.svg` | 32x32 warning variant. |
| Send / stop button icons | `assets\images\integrations\ai\icon-send.svg`, `icon-stop.svg` | 16/14px. Plus `icon-send-blue.svg`, `icon-send-purple.svg` for theme variants. |

### The real spinner SVG (paste this into video repo verbatim)

```svg
<svg class="wpforms-ai-chat-spinner-dots" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <style>
    .spinner_S1WN{animation:spinner_MGfb .8s linear infinite;animation-delay:-.8s;fill:currentColor;}
    .spinner_Km9P{animation-delay:-.65s}
    .spinner_JApP{animation-delay:-.5s}
    @keyframes spinner_MGfb{93.75%,100%{opacity:.2}}
  </style>
  <circle class="spinner_S1WN" cx="4" cy="12" r="3"/>
  <circle class="spinner_S1WN spinner_Km9P" cx="12" cy="12" r="3"/>
  <circle class="spinner_S1WN spinner_JApP" cx="20" cy="12" r="3"/>
</svg>
```

That's the real "thinking" indicator: three dots, each at 93.75-100% drops to 0.2 opacity with a 0.15s stagger. Wrapped in `<div class="wpforms-chat-item-spinner">` (height 50, width 82, background `#F6F7F7`, border-radius `0 24px 24px 24px`, color `#A7AAAD`). The Sullie circle avatar (`ai-answer-icon.svg`) sits to its left as a 32x32 `:before` pseudo.

### Builder-overlay full-screen loading (different surface)

Distinct from AI thinking. Used when the builder reloads (e.g. after Use This Form). Defined in `assets\css\builder\builder-overlay.min.css`:

- Container `#wpforms-builder-overlay` is a radial gradient (`#f6f7f7 → #e8e9e9`).
- Two layered `<i>` elements: `i.spinner` is `loading-spinner.svg` (orange ring with grey base, 100x100), spinning at `wpforms-spinner-rotation 0.8s linear infinite`. `i.avatar` is the masked Sullie head (`loading-avatar.svg`, 80x80, white circular background, soft drop-shadow).
- **This is the canonical "WPForms is loading" visual.** Way more authentic than a generic spinner.

---

## Motion vocabulary (real keyframes / transitions in the plugin)

Aggregated by extracting `@keyframes` names across `assets\css\**\*.css`:

| Primitive | File | What it does | Reusable for video? |
| --- | --- | --- | --- |
| `wpforms-spinner-rotation` | `assets\css\admin.min.css`, `assets\css\builder\builder-basic.min.css`, `assets\css\builder\builder-overlay.min.css` | `from{rotate(0)} to{rotate(360deg)}` over 0.8s linear infinite. Drives every loading spinner in the app. | yes — use for **every** loading beat. Authoritative duration is 0.8s. |
| `load8` | `assets\css\admin.min.css` | Variant rotation for the small inline `.wpforms-spinner` | yes |
| `progress` | `assets\css\admin.min.css` | Progress-bar shimmer | yes — use for any "uploading" or "generating" beat with a bar |
| `wpforms-camera-countdown` | `assets\css\frontend\classic\wpforms-full.min.css` | Countdown ring on the camera field's record button | niche (camera capture videos only) |
| `wpforms-challenge-bar-shift` | `assets\css\challenge.min.css` | Animates the onboarding-challenge progress bar | yes — for "step X of Y" beats |
| `wpforms-challenge-dot-pulse` | `assets\css\challenge.min.css` | Pulsing dot beside active step | yes — small attention-grabber, very on-brand |
| `wpforms-menu-notification-indicator-pulse` | `assets\css\admin-bar.min.css` | The red unread indicator pulse on the admin-bar WPForms menu | yes — for notification beats |
| `wpforms-dot-pulse` | `assets\css\form-embed-wizard.min.css` | The form-embed-wizard's "thinking" dot | yes — alternate for the AI 3-dot spinner |
| `rotation` (generic) | `assets\css\builder\builder-subsystems.min.css` | Generic 360deg | yes |
| `fade-out` | `assets\css\integrations\ai\ai-forms.min.css` | `0%{opacity:1} 100%{opacity:0;background:transparent}` 0.25s ease-in. Used to fade out the placeholder skeletons in the AI form preview. | **yes — this is the exact AI-preview skeleton fade.** Pair with `fade-in` below. |
| `fade-in` | same | `0%{opacity:0} 100%{opacity:1}` 0.25s ease-in. Used as fields stream into the AI preview. | **yes — AI generation reveal cadence.** |

Plus standard transitions (no @keyframes, just `transition:`):

- AI answer card border fade-in: `transition-property:border-color; transition-duration:0.15s; ease-out` on `.wpforms-chat-item-answer .wpforms-chat-item-content`. (`ai-forms.min.css`)
- AI welcome-screen sample prompts: hover reveals an arrow icon (opacity 0→1), and the `<a>` gains underline.
- Modal entry: jconfirm-driven (3rd-party plugin `jquery-confirm`, defined in `builder-third-party.min.css`).
- Builder overlay fade: `#wpforms-builder-overlay { transition-property:opacity; transition-duration:0.5s; ease-out } &.fade-out { opacity:0 }`.

---

## Real UI states / templates

### Form template library

- **Local templates that ship with free:** `includes\templates\class-blank.php`, `includes\templates\class-simple-contact-form.php` (the only one with full field def + thumbnail JPG `assets\images\thumbnail-simple-contact-form-template.jpg`). Pro adds many more locally; this build has none of them.
- **The 200+ template library is FETCHED from the CDN, not bundled.** Source: `src\Admin\Builder\TemplatesCache.php:130` declares `'remote_source' => 'https://wpforms.com/templates/api/get/'`. Single template loaded via `src\Admin\Builder\TemplateSingleCache.php:127` → `https://wpforms.com/templates/api/get/{id}`. The cache is keyed and stored locally; templates are JSON. **Thumbnails are loaded from the same API.** If videos want to show real templates, hit that endpoint live or cache it once.
- Template card markup classes: `#wpforms-setup-templates-list .wpforms-template`, with sub-elements `.wpforms-template-thumbnail`, `.wpforms-template-name-wrap`, `.wpforms-template-name`, `.wpforms-badge`. Generate-with-AI card uses ID `#wpforms-template-generate` and the purple AI accent. (Selectors live in `assets\css\admin\admin-form-templates.min.css`.)

### Real field types (free build)

PHP defines available in `includes\fields\`. Each renders via the `field_display()` method on `WPForms_Field` base (`includes\fields\class-base.php:416`). Free types:
- `class-text.php` (Single Line Text)
- `class-textarea.php` (Paragraph)
- `class-number.php`, `class-number-slider.php`
- `class-email.php`
- `class-name.php`
- `class-select.php`, `class-checkbox.php`, `class-radio.php`
- `class-gdpr-checkbox.php`
- `class-internal-information.php`

Pro field type *PHP class file paths* (definition lives in `src\Pro\Forms\Fields\<Name>\` even when the field PHP isn't included on Lite — useful for snapshot reference): Address, Camera, Checkbox (extended), Content, CreditCard, CustomCaptcha, DateTime, Divider, Email (extended), EntryPreview, FileUpload, Hidden, Html, Layout, Name (extended), Pagebreak, Password, PaymentSingle, PaymentTotal, Phone, Radio (extended), Rating, Repeater, Richtext, Select (extended), Url. **There is no live HTML to read for these in this checkout** — to puppet them in video, capture from a Pro site or copy snapshot HTML.

The frontend wrapper class hierarchy on rendered forms is `.wpforms-container > form.wpforms-form > .wpforms-field-container > .wpforms-field.wpforms-field-{type}`. CSS is `assets\css\frontend\classic\wpforms-full.min.css` (also a "modern" variant under `frontend\modern\`).

### Real settings / builder panels

In the builder, each panel is `#wpforms-panel-<slug>` with `.wpforms-panel-sidebar` (left) + `.wpforms-panel-content-wrap > .wpforms-panel-content` (right). Slugs visible from CSS: `setup`, `fields`, `revisions`, `settings`, `providers`, `payments`, `marketing`, `notifications`, `confirmations`, `ai-form`. Notifications/confirmations are tabs *inside* the `settings` panel. Anti-spam settings page: `src\Forms\AntiSpam\` + templates under `templates\builder\antispam\`. Email notifications builder template: `templates\builder\notifications\email-template-modal.php`.

---

## Top 5 things the video repo should adopt RIGHT NOW

1. **Replace the guessed Sullie SVG.** Drop `assets\images\splash\sullie.svg` (or `admin-flyout-menu\sullie-active.svg` for the round-frame version) into the video repo's asset folder, replacing `assets/sullie - svg.svg`. The plugin file uses the canonical brown-orange-teal palette and is the master.
2. **Swap `--wpf-purple` (or whatever variable maps the brand color in the repo) to `#E27730`, with `#CD6622` as hover.** Purple is reserved for the AI feature only — use `#7A30E2`/`#5C24A9` strictly when illustrating AI generation, never as the brand primary.
3. **Replace generic 3-dot loading spinners with the AI chat spinner SVG above** (verbatim, including the embedded `<style>`/`@keyframes spinner_MGfb`). Pair with the orange Sullie circle from `ai-answer-icon.svg` to read as the real WPForms AI thinking state.
4. **For full-screen "WPForms is loading" beats, use the layered overlay**: `loading-avatar.svg` (Sullie head, 80x80, white circle background) underneath `loading-spinner.svg` (100x100 ring, orange `#E27730` arc on grey track), with the spinner on `wpforms-spinner-rotation 0.8s linear infinite`. Background gradient: `radial-gradient(50% 50% at 50% 50%, #f6f7f7 37.5%, #e8e9e9 100%)`. This is *exactly* what real users see for ~1s every time the builder reloads.
5. **Use the real "Use This Form" button label and visual.** Class chain `.wpforms-btn-orange.wpforms-ai-chat-answer-action` with the `insert.svg` icon as `::before` pseudo, label literally `Use This Form`. Background `#E27730`, hover `#CD6622`, white text, `border-radius:4px`, `padding:6px 10px`, font-size 14, font-weight 500. Don't invent a CTA — this is the one users press.

---

## Things the video repo currently FAKES that have a real answer in the plugin

| What videos fake | Real source | Cost to swap |
| --- | --- | --- |
| Purple as primary brand color | `#E27730` declared in `assets\css\admin.min.css` (.wpforms-btn-orange) and `assets\images\icon-wpforms.svg` fill | trivial — replace one CSS var; purple only for AI feature surface |
| Fake / generic 3-dot spinner | `assets\js\integrations\ai\chat-element\wpforms-ai-chat-element.min.js` line 33 `getSpinnerSvg()` (inlined above) | low — copy SVG verbatim |
| Fake mosaic "template cards" | Real templates: live JSON from `https://wpforms.com/templates/api/get/`, route declared in `src\Admin\Builder\TemplatesCache.php:130`. Card markup classes documented above. | medium — fetch once, cache locally; reuse the real `.wpforms-template` markup + the real thumbnails returned by the API |
| Generic checkmark / send / refresh icons | `assets\images\integrations\ai\insert.svg`, `icon-send.svg`, `thumbs-down.svg`, `thumbs-up.svg`, `back.svg` | trivial — copy SVGs |
| Generic loading spinner ring | `assets\images\spinner.svg` (orange 80x80) and `assets\images\builder\loading-spinner.svg` (orange 100x100 with grey track) | trivial — drop in |
| Sullie illustration approximated | `assets\images\splash\sullie.svg` (master vector) | trivial |
| AI feature represented with brand orange | Real AI accent is `#7A30E2`; sparkle icon in `ai-feature-icon.svg` | trivial — use purple deliberately for AI-only beats |
| Generic loading bubble in chat | `.wpforms-chat-item-answer-waiting` with `:before` Sullie icon + `.wpforms-chat-item-spinner` (50x82, `#F6F7F7` bg, `border-radius:0 24px 24px 24px`) | low — copy CSS rules from `chat-element.min.css` |
| AI welcome screen description | Real strings at `src\Integrations\AI\Admin\Builder\Forms.php:267-291` — "Describe the form you would like to create..." plus 9 rotating footer congratulations | trivial — copy strings |
| Hardcoded generic font | System stack from admin.min.css: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif` | trivial — there is no "Inter" or custom face; matching is one CSS line |

---

## What does NOT exist in the plugin source (that you might expect)

- **No SCSS variables file.** Colors are inlined per-component. There's no single source of truth file you can read; the table above *is* that source.
- **No bundled template thumbnails for >1 form.** Only the simple-contact-form has a local JPG. All other thumbnails come from the WPForms.com CDN at runtime.
- **No Pro field PHP in this checkout** (`pro/includes/fields/` doesn't exist; only `pro/includes/class-conditional-logic-*.php` etc are present). Pro field markup must be captured from a live Pro site, not read from this repo.
- **No Lottie / JSON animations.** All motion is CSS keyframes. No Bodymovin payloads. Anything Lottie-shaped you might be guessing at is invented.
- **No fontawesome custom icons** beyond stock FontAwesome class names referenced in builder UI.
- **No "iconography style guide" file.** Style is implicit: rounded corners 4px on buttons / 24px on chat bubbles, line-style icons for navigation (back arrow, send arrow, thumbs), filled illustrations for mascot/feature icons. SVG strokes are not used heavily — most icons are filled paths.
