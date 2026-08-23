# telepractice.in landing page

A single self-contained HTML file for BigRock's cPanel hosting: no build step,
no framework, no external requests. That plan is a PHP stack with no Node
runtime, and this page is designed to work there with nothing installed.

## Upload

1. cPanel → **File Manager** → `public_html`
2. Upload `index.html` (replace any existing `index.html` / `default.php`)
3. Visit `https://telepractice.in`

## Point the button at the app

Open `index.html` and edit one line near the bottom:

```js
var APP_URL = "https://app.telepractice.in";
```

Both buttons derive from it — `/sign-in` and `/try`.

## Why a subdomain rather than a vercel.app link

Prefer `app.telepractice.in` over the platform's own address. Visitors stay on
telepractice.in the whole way through, which matters for a product handling
patient information: a button that jumps to `something.vercel.app` reads as a
different, less trustworthy site to the clinicians and parents being asked to
sign in.

To set it up: add the custom domain `app.telepractice.in` in the hosting
platform, then in **BigRock → Manage telepractice.in → DNS management** add the
CNAME it gives you.

```
CNAME   app   <target the platform provides>
```

Leave the root `A` record pointing at BigRock so this page keeps serving, and
leave the **MX** records alone or the cPanel mailboxes stop working.
