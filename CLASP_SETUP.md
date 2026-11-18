# One-time clasp setup (Driver's Log backend)

This repo is now wired for [clasp](https://github.com/google/clasp), Google's
Apps Script CLI, plus a GitHub Action that auto-deploys `Code.gs` whenever
you push to `main` — no more copy-pasting into the Apps Script editor and
clicking "New version → Deploy".

You only need to do this once. It has to be done by you (not Claude),
because it needs your Google login.

## 1. Install clasp on your own computer

```
npm install -g @google/clasp
clasp login
```

This opens a browser, asks you to sign in with the Google account that owns
the Apps Script project (the one tied to `iggifernandes@gmail.com`), and
saves a credentials file at `~/.clasprc.json`.

## 2. Find your Script ID and Deployment ID

In the Apps Script editor for this project:

- **Script ID**: Project Settings (gear icon) → "Script ID" → copy it.
- **Deployment ID**: Deploy → Manage deployments → click the active Web App
  deployment → copy the "Deployment ID" shown there (not the URL).

## 3. Point this repo at your script

Open `.clasp.json` in this repo and replace the placeholder with your real
Script ID:

```json
{
  "scriptId": "YOUR_REAL_SCRIPT_ID",
  "rootDir": "."
}
```

Commit and push that one change.

## 4. Push by hand once, to prove it works

```
npm install
npm run push
```

This should upload `Code.gs` and `appsscript.json` only — `.claspignore` is
already set up so the GitHub Pages frontend (`index.html`, `induction/`,
icons, etc.) is never touched.

## 5. Turn on auto-deploy from GitHub

In the GitHub repo: **Settings → Secrets and variables → Actions**

- Add a **secret** named `CLASP_CREDENTIALS` with the full contents of your
  `~/.clasprc.json` file (run `cat ~/.clasprc.json` and paste all of it).
- Add a **variable** (not a secret) named `CLASP_DEPLOYMENT_ID` with the
  Deployment ID from step 2.

From then on, every push to `main` that touches `Code.gs` or
`appsscript.json` runs `.github/workflows/clasp-deploy.yml` automatically:
it pushes the code and creates a new version on your existing Web App
deployment, so the live URL never changes and you never have to redeploy by
hand again.

You can also trigger it manually any time from the GitHub repo's "Actions"
tab → "Deploy Code.gs to Apps Script" → "Run workflow".

## Day to day after this is set up

- Claude keeps committing and pushing `Code.gs` to GitHub as before.
- GitHub Actions takes it from there — no "Action needed: redeploy" step
  anymore, and no file sent to you to paste in either.
- If something ever needs a manual push: `npm run deploy` from this repo
  locally does the same thing the Action does.
