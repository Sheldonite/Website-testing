from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from datetime import date, datetime, timedelta

try:
    import pandas as pd
except ImportError:
    pd = None


def _require_pandas():
    if pd is None:
        raise ValueError(
            "Invoice import features require pandas. Run '.\\.venv\\Scripts\\python.exe -m pip install -r requirements.txt' and try again."
        )
    return pd

def _norm_header(s: str) -> str:
    return "".join(ch.lower() for ch in s.strip() if ch.isalnum())


def _parse_date(raw: str) -> date:
    raw = raw.strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            pass
    raise ValueError(f"Unrecognized date: {raw!r}")


@dataclass(frozen=True)
class AttendanceRow:
    attended_on: date
    full_name: str
    email: str | None
    status: str


@dataclass(frozen=True)
class RosterRow:
    external_id: str | None
    full_name: str
    email: str | None
    phone: str | None
    roster_status: str | None


@dataclass(frozen=True)
class InvoiceRow:
    external_timesheet_id: str
    pay_type: str
    employee_name: str | None
    company_name: str | None
    pay_rate: Decimal | None
    bill_rate: Decimal | None
    quantity: Decimal | None
    total_amount: Decimal | None
    invoice_number: str | None = None
    week_ended_on: date | None = None


@dataclass(frozen=True)
class PpeDeductionRow:
    external_timesheet_id: str
    employee_name: str | None
    deduction_amount: Decimal


def parse_attendance_csv(content: bytes) -> list[AttendanceRow]:
    """
    Expected (case-insensitive) headers:
      - date  (or attended_on, attendedon)
      - name  (or full_name, fullname)
      - email (optional)
      - status (optional; default 'present')
    """
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("CSV has no headers.")

    header_map: dict[str, str] = {_norm_header(h): h for h in reader.fieldnames if h}

    def pick(*candidates: str) -> str | None:
        for c in candidates:
            key = _norm_header(c)
            if key in header_map:
                return header_map[key]
        return None

    date_col = pick("date", "attended_on", "attendedon")
    name_col = pick("name", "full_name", "fullname")
    email_col = pick("email", "emailaddress")
    status_col = pick("status", "attendance", "present")

    if not date_col or not name_col:
        raise ValueError("CSV must include headers for Date and Name (case-insensitive).")

    rows: list[AttendanceRow] = []
    for i, r in enumerate(reader, start=2):
        raw_date = (r.get(date_col) or "").strip()
        raw_name = (r.get(name_col) or "").strip()
        raw_email = (r.get(email_col) or "").strip() if email_col else ""
        raw_status = (r.get(status_col) or "").strip() if status_col else ""

        if not raw_date or not raw_name:
            continue

        try:
            attended_on = _parse_date(raw_date)
        except ValueError as e:
            raise ValueError(f"Row {i}: {e}") from e

        email = raw_email or None
        status = (raw_status or "present").lower()
        rows.append(AttendanceRow(attended_on=attended_on, full_name=raw_name, email=email, status=status))

    return rows


def parse_roster_csv(content: bytes) -> list[RosterRow]:
    """
    Accepts the "Employee List" roster export you shared.

    Recognized headers (case-insensitive):
      - Full Name OR (First + Last) OR Name
      - Email Address OR Email
      - Phone Number OR Phone
      - Status (e.g. Active/Termed/On Leave)
      - Avionte ID (optional; stored as external_id)
    """
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise ValueError("CSV has no headers.")

    header_map: dict[str, str] = {_norm_header(h): h for h in reader.fieldnames if h}

    def pick(*candidates: str) -> str | None:
        for c in candidates:
            key = _norm_header(c)
            if key in header_map:
                return header_map[key]
        return None

    full_name_col = pick("full name", "fullname", "name")
    first_col = pick("first", "firstname", "givenname")
    last_col = pick("last", "lastname", "surname", "familyname")
    email_col = pick("email address", "emailaddress", "email")
    phone_col = pick("phone number", "phonenumber", "phone")
    status_col = pick("status", "employee status")
    external_id_col = pick("avionte id", "avionteid", "employee id", "employeeid", "id")

    if not full_name_col and not (first_col and last_col):
        raise ValueError("Roster CSV must include Full Name, or both First and Last.")

    rows: list[RosterRow] = []
    for r in reader:
        full_name = (r.get(full_name_col) or "").strip() if full_name_col else ""
        if not full_name:
            first = (r.get(first_col) or "").strip() if first_col else ""
            last = (r.get(last_col) or "").strip() if last_col else ""
            full_name = " ".join(p for p in (first, last) if p).strip()

        if not full_name:
            continue

        email = ((r.get(email_col) or "").strip() if email_col else "") or None
        phone = ((r.get(phone_col) or "").strip() if phone_col else "") or None
        roster_status = ((r.get(status_col) or "").strip() if status_col else "") or None
        external_id = ((r.get(external_id_col) or "").strip() if external_id_col else "") or None

        rows.append(
            RosterRow(
                external_id=external_id,
                full_name=full_name,
                email=email,
                phone=phone,
                roster_status=roster_status,
            )
        )

    return rows


def _norm_cell(v: object) -> str:
    if v is None:
        return ""
    if pd is not None and isinstance(v, float) and pd.isna(v):
        return ""
    s = str(v).strip()
    if s.lower() in {"nan", "none", "null"}:
        return ""
    return s


def _norm_timesheet_id_cell(v: object) -> str:
    """
    Badge / VMS ID as shown in exports. Some workbooks store the numeric badge in a
    date-formatted cell; Excel then reads it as datetime — convert back to the Excel
    serial day integer (the real badge id).
    """
    if v is None:
        return ""
    if pd is not None and isinstance(v, float) and pd.isna(v):
        return ""
    if pd is not None and isinstance(v, pd.Timestamp):
        v = v.to_pydatetime()
    if isinstance(v, datetime):
        epoch = datetime(1899, 12, 30)
        delta = v - epoch
        serial = delta.days + delta.seconds / 86400.0
        return str(int(round(serial)))
    return _norm_cell(v)


def _parse_invoice_week_cell(v: object) -> date | None:
    """Week ending / week worked from invoice exports (Excel date, timestamp, or string)."""
    if v is None:
        return None
    if pd is not None and isinstance(v, float) and pd.isna(v):
        return None
    if isinstance(v, date) and not isinstance(v, datetime):
        return v
    if pd is not None and isinstance(v, pd.Timestamp):
        return v.date()
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        try:
            epoch = datetime(1899, 12, 30)
            return (epoch + timedelta(days=float(v))).date()
        except (ValueError, OverflowError, OSError):
            pass
    s = _norm_cell(v)
    if not s:
        return None
    for fmt in (
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m/%d/%y",
        # CSV exports often include time, e.g. "3/15/2026 12:00:00 AM" (strptime date-only fails)
        "%m/%d/%Y %I:%M:%S %p",
        "%m/%d/%Y %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
    ):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    # "3/15/2026 12:00:00 AM" — take date token before space if full parse failed
    head = s.split()[0] if " " in s else ""
    if head and head != s:
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
            try:
                return datetime.strptime(head, fmt).date()
            except ValueError:
                pass
    return None


def _to_decimal(v: object) -> Decimal | None:
    s = _norm_cell(v)
    if not s:
        return None
    s = s.replace("$", "").replace(",", "").replace("(", "-").replace(")", "")
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


# 16.63% bill markup: bill rate = pay rate × 1.1663 (rounded to cents);
# extended = bill rate × Qty (rounded to cents).
# Used for the entire PTO Payout sheet, and on Payroll for pay types PTO, NWO, BRV.
MARKUP_1663_MULTIPLIER = Decimal("1.1663")
_MARKUP_PAY_TYPES_MAIN = frozenset({"PTO", "NWO", "BRV"})


def _bill_rate_and_extended_1663_markup(
    pay_rate: Decimal, quantity: Decimal | None
) -> tuple[Decimal, Decimal | None]:
    bill_rate = (pay_rate * MARKUP_1663_MULTIPLIER).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if quantity is None:
        return bill_rate, None
    extended = (bill_rate * quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return bill_rate, extended


def _should_apply_1663_markup(pay_type: str, default_empty_pay_type: str | None) -> bool:
    if default_empty_pay_type == "PTO Payout":
        return True
    return (pay_type or "").strip().upper() in _MARKUP_PAY_TYPES_MAIN


def pay_type_uses_1663_markup(pay_type: str | None) -> bool:
    """True for MIM rows that follow the 16.63% bill / extended rule (stored pay type text)."""
    pt = (pay_type or "").strip().upper()
    return pt in _MARKUP_PAY_TYPES_MAIN or pt == "PTO PAYOUT"


def markup_1663_expected_total(pay_rate: Decimal | None, quantity: Decimal | None) -> Decimal | None:
    """Extended amount from the 16.63% rule; None if pay rate or quantity is missing."""
    if pay_rate is None or quantity is None:
        return None
    _, ext = _bill_rate_and_extended_1663_markup(pay_rate, quantity)
    return ext


def _pick_col(df: pd.DataFrame, *candidates: str) -> str | None:
    norm_cols = {_norm_header(str(c)): str(c) for c in df.columns}
    for c in candidates:
        key = _norm_header(c)
        if key in norm_cols:
            return norm_cols[key]
    return None


# Back Office paid/billed grid: week worked is in Excel column J (10th column, 0-based index 9).
# CSV saves preserve column order; use this when no week header matches.
_PAID_BILLED_WEEK_COL_J_INDEX = 9


def _paid_billed_week_column(df: pd.DataFrame) -> str | None:
    """Header-based week column, else column J by position (same for .xlsx and .csv)."""
    week_col = _pick_col(
        df,
        "WeekWorked",
        "Week Worked",
        "Week Ending",
        "WeekEnding",
        "Week End Date",
        "WeekEndDate",
        "Pay Week",
        "PayWeek",
    )
    if week_col:
        return week_col
    cols = list(df.columns)
    if len(cols) > _PAID_BILLED_WEEK_COL_J_INDEX:
        return str(cols[_PAID_BILLED_WEEK_COL_J_INDEX])
    return None


def _parse_invoice_dataframe(
    df: pd.DataFrame | None,
    *,
    default_empty_pay_type: str | None = None,
) -> list[InvoiceRow]:
    """
    Parses one sheet of invoice-style tabular data. Skips sheets without required
    columns (returns [] instead of raising).
    """
    if df is None or df.empty:
        return []

    timesheet_col = _pick_col(
        df,
        "External Timesheet ID (VMS ID)",
        "External Timesheet ID",
        "VMS ID",
        "Timesheet ID",
        "External ID",
        "ExternalTimesheetID",
        "Badge ID",
        "BadgeID",
    )
    pay_type_col = _pick_col(df, "Pay Type", "PayType", "Pay Code", "PayCode", "Type", "Type of Hour")
    name_col = _pick_col(df, "Employee Name", "EmployeeName", "Associate Name", "Name", "Worker Name")
    company_col = _pick_col(df, "BillToName", "Bill To Name", "Agency Name", "Company", "Client")
    first_name_col = _pick_col(df, "First Name", "FirstName")
    last_name_col = _pick_col(df, "Last Name", "LastName")
    pay_rate_col = _pick_col(df, "Pay Rate", "PayRate", "Rate")
    bill_rate_col = _pick_col(df, "Bill Rate", "BillRate")
    qty_col = _pick_col(df, "Billed Hours", "BilledHours", "BillUnit", "Qty", "QTY", "Hours")
    total_col = _pick_col(
        df,
        "Extended",
        "Extended Amount",
        "Total Amount Billed",
        "Amount Billed",
        "ItemBill",
        "Item Bill",
        "Total",
        "Bill Amount",
    )
    invoice_col = _pick_col(
        df,
        "Invoice Number",
        "Invoice #",
        "Invoice No",
        "InvoiceNo",
        "Invoice ID",
        "Inv #",
    )
    week_col = _paid_billed_week_column(df)
    if not timesheet_col:
        return []
    if not pay_type_col and not default_empty_pay_type:
        return []

    rows: list[InvoiceRow] = []
    for _, row in df.iterrows():
        timesheet_id = _norm_timesheet_id_cell(row.get(timesheet_col))
        if pay_type_col:
            pay_type = _norm_cell(row.get(pay_type_col))
        else:
            pay_type = ""
        if not pay_type and default_empty_pay_type:
            pay_type = default_empty_pay_type
        if not pay_type:
            continue

        employee_name = _norm_cell(row.get(name_col)) if name_col else ""
        if not employee_name:
            first_name = _norm_cell(row.get(first_name_col)) if first_name_col else ""
            last_name = _norm_cell(row.get(last_name_col)) if last_name_col else ""
            employee_name = " ".join(x for x in (first_name, last_name) if x).strip()
        pay_rate = _to_decimal(row.get(pay_rate_col)) if pay_rate_col else None
        bill_rate = _to_decimal(row.get(bill_rate_col)) if bill_rate_col else None
        quantity = _to_decimal(row.get(qty_col)) if qty_col else None
        total_amount = _to_decimal(row.get(total_col)) if total_col else None

        # 16.63% rows: never overwrite values from the file; only fill blanks.
        if _should_apply_1663_markup(pay_type, default_empty_pay_type):
            comp_bill: Decimal | None = None
            if pay_rate is not None:
                comp_bill, _ = _bill_rate_and_extended_1663_markup(pay_rate, quantity)
            if bill_rate is None and comp_bill is not None:
                bill_rate = comp_bill
            if total_amount is None and bill_rate is not None and quantity is not None:
                total_amount = (bill_rate * quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        elif total_amount is None and quantity is not None and pay_rate is not None:
            total_amount = (quantity * pay_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        company_name = _norm_cell(row.get(company_col)) if company_col else ""
        invoice_number = _norm_cell(row.get(invoice_col)) if invoice_col else ""
        invoice_number = invoice_number or None
        week_ended_on = _parse_invoice_week_cell(row.get(week_col)) if week_col else None

        rows.append(
            InvoiceRow(
                external_timesheet_id=timesheet_id,
                pay_type=pay_type,
                employee_name=employee_name or None,
                company_name=company_name or None,
                pay_rate=pay_rate,
                bill_rate=bill_rate,
                quantity=quantity,
                total_amount=total_amount,
                invoice_number=invoice_number,
                week_ended_on=week_ended_on,
            )
        )

    return rows


def parse_invoice_workbook(content: bytes, filename: str | None = None) -> list[InvoiceRow]:
    """
    Parses .xls/.xlsx invoice exports using flexible header detection.
    Required key columns (per sheet):
      - External Timesheet ID / VMS ID
      - Pay Type (or the \"PTO Payout\" sheet, where blank Type of Hour is treated as PTO Payout)
    Optional:
      - Employee Name
      - Week worked: matched by header (WeekWorked, Week Worked, Week Ending, etc.), or if missing,
        the 10th column (Excel column J) for standard Back Office paid/billed layout — applies to CSV too
      - Pay Rate
      - Bill Rate
      - Extended / Total Amount Billed

    Excel: reads all sheets; merges rows from each sheet that looks like invoice data.
    The \"PTO Payout\" sheet is included (e.g. Shiftfillers payroll reports). On the
    Payroll sheet, rows with pay type PTO, NWO, or BRV use the same 16.63% rule. For those
    rows and for the entire PTO Payout sheet, bill rate and extended override file values:
    bill rate = pay rate × 1.1663 (nearest cent), extended = bill rate × Qty (nearest cent).
    """
    filename_lower = (filename or "").lower()
    pd_mod = _require_pandas()
    df: pd.DataFrame | None = None

    # CSV support for paid/billed exports downloaded as CSV.
    if filename_lower.endswith(".csv"):
        try:
            df = pd_mod.read_csv(io.BytesIO(content), dtype=object)
        except Exception as e:
            raise ValueError(f"Unable to read CSV: {e}") from e
        out = _parse_invoice_dataframe(df)
        if not out:
            raise ValueError(
                "File must include External Timesheet ID/VMS ID and Pay Type columns."
            )
        return out

    excel_error: Exception | None = None
    try:
        sheets = pd_mod.read_excel(io.BytesIO(content), sheet_name=None, dtype=object)
    except Exception as e:
        excel_error = e
        try:
            df = pd_mod.read_csv(io.BytesIO(content), dtype=object)
        except Exception:
            raise ValueError(f"Unable to read workbook: {excel_error}") from excel_error
        out = _parse_invoice_dataframe(df)
        if not out:
            raise ValueError(
                "File must include External Timesheet ID/VMS ID and Pay Type columns."
            )
        return out

    if not isinstance(sheets, dict):
        sheets = {"Sheet1": sheets}

    merged: list[InvoiceRow] = []
    for sheet_name, sdf in sheets.items():
        sn = (sheet_name or "").strip().lower()
        default_pt = "PTO Payout" if sn == "pto payout" else None
        merged.extend(_parse_invoice_dataframe(sdf, default_empty_pay_type=default_pt))

    if not merged:
        raise ValueError(
            "Workbook must include External Timesheet ID/VMS ID and Pay Type columns "
            "on at least one sheet (e.g. Payroll or PTO Payout)."
        )
    return merged


def _parse_shoals_hours_dataframe(df: pd.DataFrame) -> list[InvoiceRow]:
    """
    Shoals Paycom export: sheet such as \"Total Hours Summary\" with EECode, EarnCode, EarnHours,
    names, and Week Worked. No billing dollars — hours only for cross-reference.
    """
    if df is None or df.empty:
        return []

    ee_col = _pick_col(df, "EECode", "EE Code", "Employee Code")
    earn_code_col = _pick_col(df, "EarnCode", "Earn Code", "Pay Code", "Type of Hour")
    earn_hours_col = _pick_col(df, "EarnHours", "Earn Hours", "Hours")
    week_col = _pick_col(
        df,
        "Week Worked",
        "WeekWorked",
        "WeekEnding",
        "Week End Date",
        "WeekEndDate",
        "Pay Week",
    )
    first_col = _pick_col(df, "Firstname", "First Name", "FirstName", "Given Name")
    last_col = _pick_col(df, "Lastname", "Last Name", "LastName", "Surname")

    if not ee_col or not earn_code_col or not earn_hours_col:
        return []

    rows: list[InvoiceRow] = []
    for _, row in df.iterrows():
        timesheet_id = _norm_timesheet_id_cell(row.get(ee_col))
        pay_type = _norm_cell(row.get(earn_code_col))
        if not timesheet_id or not pay_type:
            continue
        quantity = _to_decimal(row.get(earn_hours_col))
        if quantity is None:
            continue
        week_ended_on = _parse_invoice_week_cell(row.get(week_col)) if week_col else None
        first_name = _norm_cell(row.get(first_col)) if first_col else ""
        last_name = _norm_cell(row.get(last_col)) if last_col else ""
        employee_name = " ".join(x for x in (first_name, last_name) if x).strip() or None

        rows.append(
            InvoiceRow(
                external_timesheet_id=timesheet_id,
                pay_type=pay_type,
                employee_name=employee_name,
                company_name=None,
                pay_rate=None,
                bill_rate=None,
                quantity=quantity,
                total_amount=None,
                invoice_number=None,
                week_ended_on=week_ended_on,
            )
        )

    return rows


def parse_shoals_timecard_workbook(content: bytes, filename: str | None = None) -> list[InvoiceRow]:
    """
    Parses Shoals CORE / weekend Paycom timecard workbooks. Uses the \"Total Hours Summary\"
    sheet when present; otherwise the first sheet that contains EECode, EarnCode, and EarnHours.
    """
    filename_lower = (filename or "").lower()
    pd_mod = _require_pandas()
    if filename_lower.endswith(".csv"):
        try:
            df = pd_mod.read_csv(io.BytesIO(content), dtype=object)
        except Exception as e:
            raise ValueError(f"Unable to read CSV: {e}") from e
        out = _parse_shoals_hours_dataframe(df)
        if not out:
            raise ValueError(
                "Shoals timecard CSV must include EECode, EarnCode, and EarnHours (or equivalent) columns."
            )
        return out

    try:
        sheets = pd_mod.read_excel(io.BytesIO(content), sheet_name=None, dtype=object)
    except Exception as e:
        raise ValueError(f"Unable to read Shoals timecard workbook: {e}") from e

    if not isinstance(sheets, dict):
        sheets = {"Sheet1": sheets}

    merged: list[InvoiceRow] = []
    preferred_substrings = ("total hours", "totalhour")

    for sheet_name, sdf in sheets.items():
        sn = (sheet_name or "").strip().lower()
        if any(p in sn for p in preferred_substrings):
            merged.extend(_parse_shoals_hours_dataframe(sdf))

    if not merged:
        for _sn, sdf in sheets.items():
            parsed = _parse_shoals_hours_dataframe(sdf)
            if parsed:
                merged.extend(parsed)
                break

    if not merged:
        raise ValueError(
            "Shoals timecard workbook must include a sheet (e.g. Total Hours Summary) with "
            "EECode, EarnCode, and EarnHours columns."
        )
    return merged


def parse_ppe_csv(content: bytes) -> list[PpeDeductionRow]:
    """
    Parses PPE payroll deduction CSV with preamble rows before header.
    Required headers:
      - Scan Badge Number
      - Deduction
    Optional:
      - Emp Name
    """
    text = content.decode("utf-8-sig", errors="replace")
    all_rows = list(csv.reader(io.StringIO(text)))
    if not all_rows:
        return []

    header_idx = -1
    for i, row in enumerate(all_rows):
        normalized = [_norm_header(c) for c in row]
        if "scanbadgenumber" in normalized and "deduction" in normalized:
            header_idx = i
            break
    if header_idx < 0:
        raise ValueError("PPE CSV must include headers for Scan Badge Number and Deduction.")

    headers = all_rows[header_idx]
    header_map = {_norm_header(h): idx for idx, h in enumerate(headers)}
    badge_idx = header_map.get("scanbadgenumber")
    deduction_idx = header_map.get("deduction")
    name_idx = header_map.get("empname")
    if badge_idx is None or deduction_idx is None:
        raise ValueError("PPE CSV must include headers for Scan Badge Number and Deduction.")

    rows: list[PpeDeductionRow] = []
    for row in all_rows[header_idx + 1 :]:
        if not row or all(not str(c).strip() for c in row):
            continue
        if badge_idx >= len(row) or deduction_idx >= len(row):
            continue
        badge = row[badge_idx].strip()
        amount = _to_decimal(row[deduction_idx])
        if not badge or amount is None:
            continue
        name = row[name_idx].strip() if name_idx is not None and name_idx < len(row) else ""
        rows.append(PpeDeductionRow(external_timesheet_id=badge, employee_name=name or None, deduction_amount=amount))
    return rows
