# Project: ATS

Small-team attendance tracking web app that imports daily attendance logs from a Google Sheet **CSV export**.

## What it does

- Upload a daily attendance CSV
- Creates/updates a **roster** of people (simple profiles)
- Records one attendance row per person per day (deduped by **person + date**)
- Browse People list, click into a person for attendance history
- View import history (created / updated / skipped)

## Setup (Windows)

### Prerequisite

Install **Python 3.11+** and ensure `python` works in PowerShell:

- Download from `https://www.python.org/downloads/windows/`
- During install, check **“Add python.exe to PATH”**

Then restart PowerShell.

Open PowerShell in this folder (`d:\Projects\attendance-tracker-web`) and run:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r .\requirements.txt
uvicorn app.main:app --reload
```

Then open `http://127.0.0.1:8000`.

## Security and live deployment

- The app now requires a login before the main site can be used.
- On first run, open `http://127.0.0.1:8000/setup` to create the first admin account.
- SSN, DOB, and direct deposit data are encrypted before being stored in `app/attendance.sqlite3`.
- A local secrets file is created at `.ats-secrets.json`. Keep it safe and do not lose it, or encrypted data will become unreadable.

Recommended production environment variables:

```powershell
$env:ATS_ENV="production"
$env:ATS_ALLOWED_HOSTS="yourdomain.com,www.yourdomain.com"
$env:ATS_SECURE_COOKIES="1"
$env:ATS_FORCE_HTTPS="1"
```

Optional key management:

- `ATS_SESSION_SECRET` overrides the generated session secret.
- `ATS_ENCRYPTION_KEYS` can hold one or more comma-separated Fernet keys for key rotation. Put the newest key first.

## Easier way to open (recommended)

After Python is installed, you can start the app with **one double-click**:

- **Double-click** `start.bat`
  - It will create `.venv` if needed, install requirements, start the server, and open your browser.

Optional convenience:

- **Bookmark/shortcut**: `Project ATS.url` opens the site (but the server still must be running).

## CSV format

Export your Google Sheet as **CSV** (File → Download → Comma-separated values).

The importer expects headers (case-insensitive):

- **Required**
  - `Date` (accepted formats: `YYYY-MM-DD`, `MM/DD/YYYY`, `MM/DD/YY`)
  - `Name`
- **Optional**
  - `Email`
  - `Status` (defaults to `present` if missing)

Example CSV:

```csv
Date,Name,Email,Status
2026-03-27,Alex Johnson,alex@example.com,present
2026-03-27,Sam Lee,sam@example.com,absent
```

## Where data is stored

SQLite database file is created at `app/attendance.sqlite3`.

## One-time roster import

On the home page, use **“One-time roster import (CSV)”** to upload your roster export (like your employee list).
It recognizes headers such as:

- `Full Name` (or `First` + `Last`)
- `Email Address`
- `Phone Number`
- `Status`
- `Avionte ID` (stored as an external ID)

## Invoice Crossreferencing

Use the **Invoice Crossreferencing** menu item to compare:

1. **Paid/Billed file** (your BO invoice export)
2. **MIM file** (their payroll/invoice report)

Matching key:

- `External Timesheet ID (VMS ID)`
- `Pay Type`

Compared values:

- `Pay Rate`
- `Bill Rate`
- `Extended` / `Total Amount Billed`

Supported import formats:

- `.xls`
- `.xlsx`

Notes:

- Header matching is case-insensitive and flexible (e.g., `VMS ID`, `External Timesheet ID`, etc.).
- Use **Export XLSX** on the Invoice Crossreferencing page to download the final comparison workbook.


