# Sharp Economy static mirror in Next.js

The original WordPress static export lives in `public/` (HTML, CSS, JS, and media). The rewrite logic in `proxy.ts` is meant to keep extensionless URLs working by rewriting them to the corresponding `index.html` file, so the UI renders exactly as before without the WordPress backend.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000/index.html (or any `.html` path under `public/`) to see the mirrored site. All assets load from `public/`, and `public/` is lint-ignored because it contains third-party/vendor code.

## Maintenance

To download and localize any offsite `sharpeconomy.org` assets referenced by HTML files under `public/`:

```bash
node scripts/mirror-se.mjs
```

To minify JS/CSS under a specific folder, run the minifier from that folder (it uses `process.cwd()` as the root):

```bash
cd public
node ../scripts/minify.mjs

cd ..
cd app
node ../scripts/minify.mjs
```

## Notes

- Requests to `/wp-json` stay untouched (other than rewriting the root to `/wp-json/index.html`) so extensionless JSON assets still respond.
- To build for production, run `npm run build` followed by `npm start`.
