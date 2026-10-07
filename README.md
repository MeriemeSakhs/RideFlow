# RideFlow public legal/compliance site

Static pages used as RideFlow's Privacy Policy, Terms & Conditions, and driver SMS consent script,
including for Twilio A2P 10DLC campaign registration. Deployed via GitHub Pages from the `gh-pages`
branch to `https://meriemesakhs.github.io/RideFlow/`.

Pages:
- `index.html` — index of the pages below
- `privacy/` — Privacy Policy, including the required SMS data-sharing disclosures
- `terms/` — Terms & Conditions, including the driver SMS program terms
- `sms-consent-script/` — the exact verbal script managers use to obtain a driver's SMS consent

No build step — these are plain static HTML files, deployed as-is.

## Deploying

```
git subtree push --prefix website origin gh-pages
```
