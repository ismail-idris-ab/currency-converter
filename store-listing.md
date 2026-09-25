# Play Store listing — All Currency Converter

Working document for the Play Console entry. Sections marked **DECISION** need
your answer before submission; everything else is ready to paste.

## App details

| Field | Value |
|---|---|
| Package | `com.ismailidris.allcurrencyconverter` |
| Default language | English (United States) |
| App or game | App |
| Category | Finance (alternative: Tools) |
| Contact email | ismailidris285@gmail.com |
| Privacy policy | https://ismail-idris-ab.github.io/currency-converter/ |
| Ads | Yes — contains ads |
| In-app purchases | No |

## Title (30 characters maximum)

**Recommended:** `All Currency Converter` — 22 characters.

**DECISION.** The title discussed earlier, `All Currency Converter & Naira
Rates`, is 36 characters and cannot be used: Play caps titles at 30. Beyond the
limit, "Naira Rates" tells a user they can look up what the naira is trading at,
which is not what this app does — it converts, and any naira figure it shows is
the official rate plus an amount set in Settings. If you want Nigeria in the
title within the limit, `Currency Converter & Naira` (26) is possible, but it
carries the same promise.

## Short description (80 characters maximum)

**Recommended:** `Offline currency converter with 150+ currencies and a built-in calculator`

That is 73 characters. Alternatives:

- `Convert 150+ currencies offline, with your own rates and a calculator` (69)
- `Fast offline converter for 150+ world currencies, works with no internet` (72)

## Full description (4000 characters maximum)

```
All Currency Converter turns an amount in one currency into another. That is
the whole job, and it does it quickly, offline, and without getting in your way.

MULTIPLE CURRENCIES AT ONCE
See up to ten currencies on one screen. Type an amount in any row and every
other row updates as you type. No switching back and forth to check a second
pair.

WORKS WITHOUT INTERNET
Rates are saved on your phone the first time they download. After that the app
converts with no connection at all — on a plane, in a basement, or with your
data turned off. When you are online again it picks up fresh rates, and it
always tells you how old the ones you are looking at are.

BUILT-IN CALCULATOR
Add, subtract, multiply, divide and take percentages right in the converter.
Work out a total and see it converted at the same time, without leaving for a
calculator app and copying numbers back.

YOUR OWN RATES
Know a rate the official feed does not carry — one you agreed with someone, or
one you were quoted? Enter it yourself and the app converts with your number
instead. Your rates are clearly marked so they are never confused with the
published ones.

150+ CURRENCIES
Every major world currency with its own flag, searchable by code, name or
country. The ones you use most rise to the top of the list on their own.

MADE TO STAY OUT OF THE WAY
- Dark and light themes that follow your phone
- Copy and paste amounts
- Thousand separators and correct decimal places per currency
- Vibration feedback you can switch off
- Small download, fast to open

Rates come from public sources (ExchangeRate-API, with Frankfurter as a
fallback) and are indicative. This app is a converter — it is not a currency
exchange, not a trading service, and no rate it shows is an offer to buy or
sell.
```

## Keywords to target

Play has no keyword field; these belong in the title, short description and
full description where they fit honestly.

**Safe to use:** currency converter, offline currency converter, exchange rate
calculator, money converter, currency calculator, convert currency, USD to NGN,
dollar to naira, 150 currencies, travel currency converter.

**DECISION — not recommended:** parallel market rate, black market rate, aboki
rate, naira exchange rate today, forex rates. Each promises price discovery the
app does not do. Using them draws installs from people looking for a rate
service, who then leave one-star reviews saying the rate is wrong — which is
also the fastest route to a Play policy complaint about a financial app.

## Data safety form

The app collects nothing itself; the AdMob SDK does. Answer the form as
follows.

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** (because of ads) |
| Is all user data encrypted in transit? | **Yes** |
| Do you provide a way for users to request data deletion? | **No** — nothing is stored off the device; uninstalling removes everything |

Data types to declare, all from Google AdMob and none from the app itself:

| Type | Collected | Shared | Purpose | Optional? |
|---|---|---|---|---|
| Device or other IDs (advertising ID) | Yes | Yes | Advertising or marketing | Required |
| Location — approximate | Yes | Yes | Advertising or marketing | Required |
| App activity — app interactions | Yes | Yes | Advertising or marketing | Required |
| Diagnostics — crash logs, performance | No | No | — | — |

Declare nothing under Personal info, Financial info, Messages, Photos, Contacts
or Files: the app asks for none of them. The currencies, settings and own rates
a user enters stay in a local database, are never transmitted, and are excluded
from Android backup (`allowBackup: false`), so they are not "collected" under
Play's definition.

Confirm the ad rows against Google's current guidance when you fill the form:
https://support.google.com/admob/answer/11871316

## Content rating questionnaire

- Category: Utility, Productivity, Communication or Other
- No violence, sexuality, profanity, drugs, gambling or user-generated content
- Does the app contain ads? **Yes**
- Does the app share the user's location? **No** (the app does not; AdMob's
  IP-derived approximate location is declared in the data safety form)

Expected outcome: rated for everyone / PEGI 3.

## Graphics still needed

| Asset | Requirement | Status |
|---|---|---|
| App icon | 512×512 PNG, 32-bit | `store/icon-512.png` |
| Feature graphic | 1024×500 PNG or JPEG | `store/feature-graphic.png` |
| Phone screenshots | 2–8, 16:9 or 9:16, min 320px | `store/screenshots/` — **drafts**, see below |
| Tablet screenshots | Optional | Skipping — phone-only app |

Both graphics come from `node scripts/generate-store-graphics.mjs`, which
draws the same vector mark as the launcher icon.

**DECISION — the screenshots are drafts, not final.** They were captured from
a development build, so the ad slot shows Google's "Test Ad" placeholder.
Uploading that looks unfinished and misrepresents the app. Retake them from a
production build once the real ad units are live, or crop the banner out.
They are otherwise correct: 1080×2340, covering the converter with a
conversion in progress, the searchable picker with usage sorting, own rates,
and settings.

## Release notes (500 characters maximum)

```
First release.

Convert between 150+ currencies, online or off. Multiple currencies on one
screen, a built-in calculator, and support for entering your own rates.
```
