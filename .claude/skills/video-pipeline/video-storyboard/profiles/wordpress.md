# Profile — WordPress

Loaded when the intake answer to "Is this for a specific product?" is WordPress, a WordPress
plugin, or a site that runs on WordPress. It tells the storyboard how WordPress screens are
organised, so `screens-needed.json` can name surfaces and a capture route without guessing. It
knows WordPress, not any particular plugin.

## Surfaces

| surface | what it is | how the storyboard uses it |
|---|---|---|
| `admin` | the dashboard (`/wp-admin/`): settings pages, list tables, post editors | a step the site owner performs; captured behind login |
| `builder` | a plugin's own full-screen editing UI inside the admin (a form builder, a page builder, a funnel editor), usually under `admin.php?page=<slug>` | the "work" scenes: fields, options, panels; captured behind login, often needs a state per panel |
| `frontend` | the published site as a visitor sees it: a page, a post, a form on a page | the payoff scenes ("the form is real"); captured without login unless the page is private |
| `editorial` | no WordPress screen; titles, statements, cards drawn by the film | not a capture |

A state that must be seen in the builder AND on the frontend (an option added) is two rows —
one per surface — with the same `state` name.

## Chrome to strip

- The admin bar (`#wpadminbar`) and admin notices (`.notice`, `.update-nag`) are chrome. The
  film never shows them; the capture strips them (`--preset wp-admin` in `html-snapshot`).
- A frontend capture is a shot of the form or the page content, not of the theme: header,
  navigation, sidebar and footer are stripped (`--preset wp-frontend`), unless a scene needs
  the page in context, in which case `visible` says so and the preset is not applied.
- The block editor and most builders use `position: fixed` panels; a `visible` line that names
  a panel should say whether the panel is open or closed at capture.

## Where things live

- A plugin's admin pages: `/wp-admin/admin.php?page=<plugin-slug>[-<subpage>]`.
- A plugin's builder: usually the same route with a `view=` or `form_id=` / `post=` query.
- The published page or form: a frontend URL the site owner chooses; the storyboard names the
  page ("the Register page") and leaves the URL to the capture step unless it is known.
- The site registry: a `sites.json` (or similar) listing local and staging sites. Look in the
  working directory first; a registry elsewhere on the machine may be used too — say which file
  was read (in `decisions.md`) and, when the session is not in an auto mode, ask before using one
  from another project. With no registry and no URL given, ask for the site URL; the login comes
  from environment variables, never the chat.

## Login

Login goes through `wp-login.php` with `#user_login`, `#user_pass` and `#wp-submit`; success
lands on `/wp-admin/`. Credentials are never written in the storyboard or the screens list —
the capture plan uses `${ENV:WP_USER}` / `${ENV:WP_PASS}` placeholders. Two-factor or SSO logins
are an open question, not a plan.

## Copy

"WordPress" is one word, capital W, capital P. Plugin names are written as the plugin writes
them in its own admin menu. Admin menu labels, tab names and button labels are copy: quote them
as they render.

## What this profile does not know

Any specific plugin's selectors, panel names or field types. Those come from the plugin's own
UI at capture time (the snapshot skill's source-code path) and from the topic's document.

## Machine hints (read by `screens.mjs`)

```json
{
  "product": "WordPress",
  "surfaces": {
    "admin":    { "capture": "path C — your own site behind login (freeze.mjs --login --preset wp-admin)", "login": "wp-login.php: #user_login / #user_pass / #wp-submit, then /wp-admin/", "strip": "#wpadminbar, .notice, .update-nag", "page_hint": "/wp-admin/admin.php?page=<plugin-slug>" },
    "builder":  { "capture": "path C — your own site behind login (freeze.mjs --login --preset wp-admin; one state fragment per open panel)", "login": "wp-login.php: #user_login / #user_pass / #wp-submit, then /wp-admin/", "strip": "#wpadminbar, .notice, .update-nag", "page_hint": "/wp-admin/admin.php?page=<plugin-slug>&view=builder" },
    "frontend": { "capture": "path A — public page (freeze.mjs --preset wp-frontend: a shot of the form or content, not the theme)", "login": "none unless the page is private", "strip": "theme header, nav, sidebar, footer", "page_hint": "the published page URL" },
    "editorial": { "capture": "none — drawn by the film" }
  },
  "default_surface_for_app": "admin",
  "name_style": "WordPress"
}
```
