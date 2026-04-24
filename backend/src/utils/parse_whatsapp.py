#!/usr/bin/env python3
import json
import re
import sys
from datetime import datetime


DATE_LABEL_RE = re.compile(r"^(?:date|dt|work\s*date|day)\s*[:\-]\s*(.+)$", re.IGNORECASE)
SITE_LABEL_RE = re.compile(r"^(?:site|location|project|area)\s*[:\-]\s*(.+)$", re.IGNORECASE)
TIME_RANGE_RE = re.compile(
    r"(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|–|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)",
    re.IGNORECASE,
)
NUMERIC_HOURS_RE = re.compile(r"\b(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)?\b", re.IGNORECASE)
BREAK_RE = re.compile(
    r"(?:lunch|break)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?",
    re.IGNORECASE,
)
INLINE_BREAK_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\s*(?:lunch|break)",
    re.IGNORECASE,
)
MONTH_FORMATS = (
    "%b %d %Y",
    "%B %d %Y",
    "%d %b %Y",
    "%d %B %Y",
    "%b %d, %Y",
    "%B %d, %Y",
    "%d %b, %Y",
    "%d %B, %Y",
)
SKIP_LABELS = {"date", "dt", "day", "site", "location", "project", "area"}
SITE_TAIL_RE = re.compile(r"\b(?:site|location|project|area)\b[:\-]?", re.IGNORECASE)
LEADING_SITE_RE = re.compile(
    r"^(?P<site>[A-Za-z0-9&()./' -]{1,60}?)\s+(?:site|location|project|area)\b[:\-]?\s*",
    re.IGNORECASE,
)
COMPACT_ENTRY_RE = re.compile(
    r"(?P<name>[A-Z][A-Za-z'()./&-]*(?:\s+[A-Z][A-Za-z'()./&-]*){0,3})\s+"
    r"(?P<value>"
    r"(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|–|to)\s*(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?)"
    r"(?:\s+(?:lunch|break)\s+\d+(?:\.\d+)?\s*(?:m|min|mins|minute|minutes|h|hr|hrs|hour|hours)?)?"
    r"|"
    r"\d+(?:\.\d+)?\s*(?:h|hr|hrs|hour|hours)?"
    r")",
    re.IGNORECASE,
)


def clean_line(line):
    line = line.strip()
    line = re.sub(r"^\s*(?:[-*•]+|\d+[.)])\s*", "", line)
    return line.strip()


def to_iso_date(raw_value):
    if not raw_value:
        return None

    value = raw_value.strip()

    match = re.search(r"\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b", value)
    if match:
        year, month, day = map(int, match.groups())
        try:
            return datetime(year, month, day).strftime("%Y-%m-%d")
        except ValueError:
            return None

    match = re.search(r"\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b", value)
    if match:
        first, second, year = map(int, match.groups())
        if first > 12:
            day, month = first, second
        elif second > 12:
            month, day = first, second
        else:
            month, day = first, second
        try:
            return datetime(year, month, day).strftime("%Y-%m-%d")
        except ValueError:
            return None

    normalized = re.sub(r"\s+", " ", value.replace("-", " ").replace("/", " ").replace(",", ", ")).strip()
    normalized = re.sub(r"\s+,", ",", normalized)
    for date_format in MONTH_FORMATS:
        try:
            return datetime.strptime(normalized, date_format).strftime("%Y-%m-%d")
        except ValueError:
            continue

    return None


def parse_clock(raw_value):
    match = re.fullmatch(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", raw_value.strip(), re.IGNORECASE)
    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2) or "00")
    meridiem = (match.group(3) or "").lower()

    if minute < 0 or minute > 59:
        return None

    if meridiem:
        if hour < 1 or hour > 12:
            return None
        if meridiem == "am":
            hour = 0 if hour == 12 else hour
        else:
            hour = 12 if hour == 12 else hour + 12
    elif hour < 0 or hour > 23:
        return None

    return (hour * 60) + minute


def break_minutes_from_match(match):
    if not match:
        return 0

    amount = float(match.group(1))
    unit = (match.group(2) or "minutes").lower()
    if unit.startswith("h"):
        return int(round(amount * 60))
    return int(round(amount))


def extract_break_minutes(value):
    return break_minutes_from_match(BREAK_RE.search(value)) or break_minutes_from_match(INLINE_BREAK_RE.search(value))


def parse_hours(value):
    value = value.strip()
    if not value:
        return None

    break_minutes = extract_break_minutes(value)
    time_match = TIME_RANGE_RE.search(value)
    if time_match:
        start_minutes = parse_clock(time_match.group(1))
        end_minutes = parse_clock(time_match.group(2))
        if start_minutes is None or end_minutes is None or end_minutes < start_minutes:
            return None
        worked_minutes = end_minutes - start_minutes - break_minutes
        if worked_minutes < 0:
            return None
        return round(worked_minutes / 60, 2)

    number_match = NUMERIC_HOURS_RE.search(value)
    if not number_match:
        return None

    hours = float(number_match.group(1))
    if break_minutes:
        hours -= break_minutes / 60
    if hours < 0 or hours > 24:
        return None
    return round(hours, 2)


def parse_worker_line(line):
    line = clean_line(line)
    if not line:
        return None

    for splitter in (r"\s*:\s*", r"\s+-\s+", r"\s+=\s+"):
        parts = re.split(splitter, line, maxsplit=1)
        if len(parts) == 2:
            name, value = parts[0].strip(), parts[1].strip()
            if name.lower() in SKIP_LABELS:
                return None
            hours = parse_hours(value)
            if hours is not None:
                return {"name": name, "hours": hours}

    fallback_match = re.match(
        r"^(?P<name>[A-Za-z][A-Za-z0-9 .,'()/&-]{1,80}?)\s+(?P<value>\d+(?:\.\d+)?(?:\s*(?:h|hr|hrs|hour|hours))?)$",
        line,
        re.IGNORECASE,
    )
    if fallback_match:
        name = fallback_match.group("name").strip()
        hours = parse_hours(fallback_match.group("value"))
        if hours is not None:
            return {"name": name, "hours": hours}

    return None


def infer_site_from_prefix(prefix):
    cleaned = clean_line(prefix)
    if not cleaned:
        return None

    cleaned = SITE_TAIL_RE.sub("", cleaned).strip(" :-")
    if not cleaned:
        return None

    tokens = cleaned.split()
    if len(tokens) > 4:
        tokens = tokens[-4:]

    return " ".join(tokens).strip() or None


def parse_compact_message(message):
    compact = re.sub(r"\s+", " ", str(message or "")).strip()
    if not compact:
        return None

    workers = []
    site = None
    first_match_start = None

    leading_site_match = LEADING_SITE_RE.match(compact)
    if leading_site_match:
        site = clean_line(leading_site_match.group("site"))
        compact = compact[leading_site_match.end():].strip()

    for match in COMPACT_ENTRY_RE.finditer(compact):
        name = match.group("name").strip(" -:")
        hours = parse_hours(match.group("value"))
        if hours is None:
            continue

        if first_match_start is None:
            first_match_start = match.start()

        workers.append({
            "name": name,
            "hours": hours
        })

    if not workers:
        return None

    if first_match_start is not None and first_match_start > 0:
        site = infer_site_from_prefix(compact[:first_match_start])

    return {
        "date": "Unknown",
        "site": site or "Unknown",
        "workers": workers,
    }


def parse_message(message):
    lines = [clean_line(line) for line in str(message or "").splitlines()]
    lines = [line for line in lines if line]

    parsed_date = None
    parsed_site = None
    workers = []

    for line in lines:
        date_match = DATE_LABEL_RE.match(line)
        if date_match and not parsed_date:
            parsed_date = to_iso_date(date_match.group(1))
            continue

        site_match = SITE_LABEL_RE.match(line)
        if site_match and not parsed_site:
            parsed_site = site_match.group(1).strip()
            continue

        if not parsed_date:
            inline_date = to_iso_date(line)
            if inline_date:
                parsed_date = inline_date

        worker = parse_worker_line(line)
        if worker:
            workers.append(worker)

    if not workers:
        compact_result = parse_compact_message(message)
        if compact_result:
            if parsed_date and compact_result["date"] == "Unknown":
                compact_result["date"] = parsed_date
            if parsed_site and compact_result["site"] == "Unknown":
                compact_result["site"] = parsed_site
            return compact_result

    return {
        "date": parsed_date or "Unknown",
        "site": parsed_site or "Unknown",
        "workers": workers,
    }


def main():
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({"date": "Unknown", "site": "Unknown", "workers": []}))
        return

    result = parse_message(payload.get("message", ""))
    print(json.dumps(result))


if __name__ == "__main__":
    main()
