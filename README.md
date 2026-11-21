# TLNAH staff portal (GitHub Pages)

The static website for The LEGO Ninjago Animation Hub: staff applications and agreement,
the staff dashboard, the admin panel, and the Minecraft server application.

All data and logic live in the **TLNAH bot** (its built-in portal API). This repo only
holds HTML/CSS/JS, so it can be hosted for free on GitHub Pages.

| Page | URL |
| --- | --- |
| Staff application / login | `/` |
| Minecraft application | `/minecraft` |
| Staff dashboard | `/dashboard` |
| Admin panel | `/admin` |

## Configure

Edit **`config.js`**: set `apiBase` to the HTTPS address of the bot's API, e.g.
`https://api.tlnah.space`. The API must be a subdomain of the site's domain so the
login cookies work in every browser (Safari blocks cross-site cookies).

Edit **`CNAME`** to contain your domain (currently `tlnah.space`).

## Publish on GitHub Pages

1. Create a GitHub repo (e.g. `tlnah-site`) and push this folder to its `main` branch.
2. Repo → **Settings → Pages** → *Build and deployment* → Source: **Deploy from a branch**,
   Branch: **main**, folder **/ (root)** → Save.
3. Settings → Pages → **Custom domain**: enter your domain → Save. Once the DNS check passes,
   tick **Enforce HTTPS**.
4. At your domain registrar / DNS provider add:

   | Type | Name | Value |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `<your-github-username>.github.io` |
   | CNAME (or tunnel) | `api` | wherever the bot is hosted (see the bot's README) |

   If your DNS is on Cloudflare, set the GitHub Pages records to **DNS only** (grey cloud)
   until GitHub has issued the HTTPS certificate.

Every push to `main` redeploys the site within a minute or two.

## Local testing

Open the folder with any static server on `localhost` (for example
`npx serve .` or VS Code Live Server). On `localhost`, the pages call
`http://localhost:8787` automatically; run the bot locally with
`PORTAL_ALLOWED_ORIGINS=http://localhost:3000` (use the port your static server prints).
