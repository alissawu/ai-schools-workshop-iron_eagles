"""
Niche companion server.

Runs on localhost:8080, fetches Niche district/school pages via a headless
browser (patchright), extracts the embedded __PRELOADED_STATE__ JSON, and
returns clean structured data to the frontend.

Usage:
    pip install -r requirements.txt
    patchright install chromium
    python server.py
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import re
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Use patchright (stealth patches) - make sure it's not shadowed by playwright
try:
    import patchright
    from patchright.async_api import async_playwright, Browser, Playwright
    _BROWSER_LIB = "patchright"
except ImportError:
    # Fallback to regular playwright (will likely get blocked)
    from playwright.async_api import async_playwright, Browser, Playwright
    _BROWSER_LIB = "playwright (fallback - may get blocked)"

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PORT = 8080
CACHE_TTL = 3600  # 1 hour
MAX_SLUG_ATTEMPTS = 6
PAGE_TIMEOUT = 20_000  # ms

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("niche")

# ---------------------------------------------------------------------------
# Globals (managed by lifespan)
# ---------------------------------------------------------------------------

_pw: Playwright | None = None
_browser: Browser | None = None
_cache: dict[str, tuple[float, dict]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pw, _browser
    _pw = await async_playwright().start()
    _browser = await _pw.chromium.launch(
        headless=False,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--start-minimized",
        ],
    )
    log.info(f"Browser launched using {_BROWSER_LIB}")
    yield
    if _browser:
        await _browser.close()
    if _pw:
        await _pw.stop()
    log.info("Browser closed")


app = FastAPI(title="Niche Companion", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Grade conversion
# ---------------------------------------------------------------------------

# Niche uses a numeric scale that maps to letter grades.
# Observed: 4.33=A+, 4.0=A, 3.66=A-, 3.33=B+, 3.0=B, 2.66=B-, ...
GRADE_THRESHOLDS = [
    (4.17, "A+"),
    (3.83, "A"),
    (3.50, "A-"),
    (3.17, "B+"),
    (2.83, "B"),
    (2.50, "B-"),
    (2.17, "C+"),
    (1.83, "C"),
    (1.50, "C-"),
    (1.17, "D+"),
    (0.83, "D"),
    (0.50, "D-"),
    (0.0, "F"),
]


def numeric_to_letter(val: float | None) -> str | None:
    if val is None:
        return None
    for threshold, letter in GRADE_THRESHOLDS:
        if val >= threshold:
            return letter
    return "F"


# ---------------------------------------------------------------------------
# Slug generation
# ---------------------------------------------------------------------------

def slugify(text: str) -> str:
    """Convert a name to a Niche-style URL slug."""
    s = text.lower()
    s = s.replace(".", "")       # P.S. 41 -> ps 41
    s = s.replace("&", "and")
    s = s.replace("'", "")
    s = s.replace("'", "")
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s.strip())
    s = re.sub(r"-{2,}", "-", s)
    return s


def district_slug_variants(name: str, state: str) -> list[str]:
    """
    Generate candidate slugs for a district.
    Niche district URLs: /k12/d/{slug}/
    Slug format: {name-slugified}-{state_abbrev_lower}
    """
    st = state.lower().strip()
    base = slugify(name)

    variants = []

    # Suffix-based replacements - try these FIRST since Niche often uses different naming than NCES
    suffix_swaps = [
        ("public-school-district", ["public-schools"]),
        ("city-school-district", ["public-school-district", "public-schools"]),
        ("county-school-district", ["county-public-schools"]),
        ("county-schools", ["county-public-schools"]),
        ("independent-school-district", ["isd"]),
        ("unified-school-district", ["unified"]),
        ("school-district", ["public-school-district", "public-schools"]),
        ("public-schools", ["public-school-district", "school-district"]),
        ("isd", ["independent-school-district"]),
        ("unified", ["unified-school-district"]),
    ]

    # Strip trailing number qualifiers for matching (e.g. "-299")
    trailing_num = ""
    num_match = re.search(r"(-\d+)$", base)
    if num_match:
        trailing_num = num_match.group(1)

    base_no_num = base[: -len(trailing_num)] if trailing_num else base

    for suffix, replacements_list in suffix_swaps:
        if base_no_num.endswith(suffix):
            prefix = base_no_num[: -len(suffix)]
            for rep in replacements_list:
                variants.append(prefix + rep)  # try replacements first
            break
    
    # Then try base name as fallback
    variants.append(base)

    # Try stripping trailing qualifiers like "district 299"
    stripped = re.sub(r"-(?:district|dist)-?\d+$", "", base)
    if stripped != base:
        variants.append(stripped)

    # Deduplicate while preserving order, then append state
    seen = set()
    result = []
    for v in variants:
        v = v.strip("-")
        key = f"{v}-{st}"
        if key not in seen:
            seen.add(key)
            result.append(key)

    return result[:MAX_SLUG_ATTEMPTS]


def school_slug_variants(name: str, city: str, state: str) -> list[str]:
    """
    Generate candidate slugs for a school.
    Niche school URLs: /k12/{slug}/
    Slug format: {name-slugified}-{city}-{state_abbrev_lower}
    """
    st = state.lower().strip()
    ct = slugify(city)
    base = slugify(name)

    variants = [base]

    # Common school name variations
    replacements = [
        ("elementary-school", "elementary"),
        ("elementary", "elementary-school"),
        ("middle-school", "middle"),
        ("middle", "middle-school"),
        ("high-school", "high"),
        ("high", "high-school"),
    ]
    for old, new in replacements:
        if base.endswith(old):
            variants.append(base[: -len(old)] + new)

    seen = set()
    result = []
    for v in variants:
        v = v.strip("-")
        key = f"{v}-{ct}-{st}"
        if key not in seen:
            seen.add(key)
            result.append(key)

    return result[:MAX_SLUG_ATTEMPTS]


# ---------------------------------------------------------------------------
# Browser fetch + parse
# ---------------------------------------------------------------------------

def extract_preloaded_state(html: str) -> dict | None:
    """Extract __PRELOADED_STATE__ JSON from HTML, handling nested braces properly."""
    marker = "window.__PRELOADED_STATE__"
    idx = html.find(marker)
    if idx == -1:
        return None
    
    # Find the opening brace
    start = html.find("{", idx)
    if start == -1:
        return None
    
    # Count braces to find matching close
    depth = 0
    in_string = False
    escape = False
    
    for i, c in enumerate(html[start:], start):
        if escape:
            escape = False
            continue
        if c == '\\' and in_string:
            escape = True
            continue
        if c == '"' and not escape:
            in_string = not in_string
            continue
        if in_string:
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                # Found the matching brace
                json_str = html[start:i+1]
                # Fix JavaScript values that aren't valid JSON
                json_str = json_str.replace(':undefined', ':null')
                json_str = json_str.replace(': undefined', ': null')
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError as e:
                    log.error("JSON parse error: %s", e)
                    log.error("JSON preview (first 600 chars): %s", json_str[:600])
                    log.error("JSON around error (char 480-520): %s", json_str[480:520] if len(json_str) > 520 else json_str)
                    return None
    
    return None


async def fetch_niche_page(url: str) -> dict | None:
    """
    Fetch a Niche page and extract the __PRELOADED_STATE__ JSON.
    Returns the parsed dict, or None if the page is a 404 / captcha.
    """
    assert _browser is not None

    ctx = await _browser.new_context(
        user_agent=(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/131.0.0.0 Safari/537.36"
        ),
        viewport={"width": 1280, "height": 800},
        locale="en-US",
        timezone_id="America/New_York",
    )
    page = await ctx.new_page()

    try:
        # Navigate and wait for full load
        resp = await page.goto(url, wait_until="networkidle", timeout=PAGE_TIMEOUT)
        if resp and resp.status == 404:
            return None

        # Simulate human-like behavior
        await asyncio.sleep(random.uniform(1.5, 2.5))
        
        # Move mouse randomly
        await page.mouse.move(random.randint(100, 500), random.randint(100, 400))
        await asyncio.sleep(random.uniform(0.3, 0.7))
        
        html = await page.content()

        # Check for actual block (title-based, not HTML content - perimeterx scripts are on every page)
        title = await page.title()
        if "denied" in title.lower() or "access" in title.lower() and "blocked" in title.lower():
            log.warning("PerimeterX block detected for %s (title: %s)", url, title)
            try:
                await page.screenshot(path=f"/tmp/blocked_{int(time.time())}.png")
                log.info("Screenshot saved to /tmp/")
            except:
                pass
            return None
        
        # Try to find and parse the preloaded state
        state = extract_preloaded_state(html)
        if not state:
            log.warning("No __PRELOADED_STATE__ found in %s (might be blocked or wrong URL)", url)
            return None

        return state
    except Exception as e:
        log.error("Error fetching %s: %s", url, e)
        return None
    finally:
        await ctx.close()


# ---------------------------------------------------------------------------
# Data extraction helpers
# ---------------------------------------------------------------------------

def _walk_blocks(state: dict) -> list[dict]:
    """Pull all content blocks from the preloaded state."""
    items = []
    try:
        content = state.get("profile", {}).get("content", {})
        for block in content.get("blocks", []):
            items.append(block)
            # buckets can be a dict or list
            buckets = block.get("buckets", {})
            bucket_list = buckets.values() if isinstance(buckets, dict) else buckets
            for bucket in bucket_list:
                if not isinstance(bucket, dict):
                    continue
                # contents can also be a dict or list
                contents = bucket.get("contents", [])
                content_list = contents.values() if isinstance(contents, dict) else contents
                for item in content_list:
                    if isinstance(item, dict):
                        items.append(item)
    except (AttributeError, TypeError):
        pass
    return items


def _extract_grades(blocks: list[dict]) -> tuple[str | None, dict[str, str]]:
    """Extract overall grade and per-category grades."""
    overall = None
    grades: dict[str, str] = {}

    for b in blocks:
        # Check for type: "Grade" (Niche uses this) or template: "Grade"
        if b.get("type") != "Grade" and b.get("template") not in ("Grade", "OverallGrade"):
            continue
        label = (b.get("label") or "").strip()
        val = b.get("value")
        if val is None:
            continue
        letter = numeric_to_letter(float(val))
        if not label or label.lower() in ("overall niche grade", "overall grade"):
            overall = letter
        else:
            key = slugify(label).replace("-", "_")
            grades[key] = letter

    return overall, grades


def _extract_facts(blocks: list[dict]) -> dict[str, Any]:
    """Extract enrollment, student-teacher ratio, and other numeric facts."""
    facts: dict[str, Any] = {}
    for b in blocks:
        template = b.get("template", "")
        if template not in ("Fact", "Scalar", "Stat"):
            continue
        label = (b.get("label") or b.get("name") or "").strip().lower()
        val = b.get("value")
        if val is None:
            continue

        if "enrollment" in label or "students" in label:
            facts["enrollment"] = _to_number(val)
        elif "student" in label and "teacher" in label:
            facts["student_teacher_ratio"] = _to_number(val)
        elif "graduation" in label:
            facts["graduation_rate"] = _to_number(val)
        elif "proficien" in label and "math" in label:
            facts["math_proficiency"] = _to_number(val)
        elif "proficien" in label and "reading" in label:
            facts["reading_proficiency"] = _to_number(val)

    return facts


def _extract_reviews(state: dict) -> dict[str, Any] | None:
    """Extract review average and count."""
    try:
        # Check entity-level aggregateRating
        entity = state.get("profile", {}).get("content", {}).get("entity", {})
        ar = entity.get("aggregateRating", {})
        if ar.get("ratingValue") is not None:
            return {
                "average": float(ar["ratingValue"]),
                "count": int(ar.get("reviewCount", 0)),
            }
    except (AttributeError, TypeError, ValueError):
        pass

    # Fallback: look through blocks for review data
    blocks = _walk_blocks(state)
    for b in blocks:
        if b.get("template") in ("ReviewSummary", "Reviews"):
            avg = b.get("average") or b.get("reviewAverage", {}).get("average")
            cnt = b.get("count") or b.get("reviewAverage", {}).get("count")
            if avg is not None:
                return {"average": float(avg), "count": int(cnt or 0)}

    return None


def _extract_nces_id(state: dict) -> str | None:
    """Extract the NCES ID from the alternates field."""
    try:
        entity = state.get("profile", {}).get("content", {}).get("entity", {})
        return entity.get("alternates", {}).get("nces")
    except (AttributeError, TypeError):
        return None


def _extract_rankings(blocks: list[dict]) -> list[dict]:
    """Extract ranking badges."""
    rankings = []
    for b in blocks:
        if b.get("template") not in ("Ranking", "Badge", "RankingBadge"):
            continue
        display = b.get("display") or b.get("label")
        ordinal = b.get("ordinal")
        total = b.get("total")
        if display:
            entry: dict[str, Any] = {"display": display}
            if ordinal is not None:
                entry["ordinal"] = ordinal
            if total is not None:
                entry["total"] = total
            rankings.append(entry)
    return rankings


def _extract_schools(state: dict) -> list[dict]:
    """Extract the list of schools under a district."""
    schools = []
    try:
        tabs = state.get("profile", {}).get("content", {}).get("tabs", {})
        for tab_key, tab_data in tabs.items():
            entities = tab_data if isinstance(tab_data, list) else tab_data.get("entities", [])
            if not isinstance(entities, list):
                continue
            for ent in entities:
                if not isinstance(ent, dict):
                    continue
                content = ent.get("content", {})
                entity = content.get("entity", {})
                name = entity.get("name") or ent.get("name")
                if not name:
                    continue
                school: dict[str, Any] = {"name": name}
                # Grab NCES
                nces = entity.get("alternates", {}).get("nces")
                if nces:
                    school["ncessch"] = nces
                # Grab facts
                for fact in content.get("facts", []):
                    label = (fact.get("label") or "").lower()
                    val = fact.get("value")
                    if "student" in label and "teacher" not in label:
                        school["enrollment"] = _to_number(val)
                    elif "teacher" in label:
                        school["student_teacher_ratio"] = _to_number(val)
                # Grab overall grade
                for g in content.get("grades", []):
                    label = (g.get("label") or "").lower()
                    if "overall" in label:
                        school["overall_grade"] = numeric_to_letter(float(g.get("value", 0)))
                        break
                # Review average
                ra = content.get("reviewAverage", {})
                if ra.get("average"):
                    school["reviews"] = {
                        "average": float(ra["average"]),
                        "count": int(ra.get("count", 0)),
                    }
                schools.append(school)
    except (AttributeError, TypeError):
        pass
    return schools


def _to_number(val: Any) -> int | float | None:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return val
    try:
        s = str(val).replace(",", "").replace("%", "").strip()
        if "." in s:
            return float(s)
        return int(s)
    except (ValueError, TypeError):
        return None


def build_response(state: dict, url: str) -> dict:
    """Build a clean response from a parsed __PRELOADED_STATE__."""
    blocks = _walk_blocks(state)
    log.info("Found %d items from blocks", len(blocks))
    
    overall, grades = _extract_grades(blocks)
    log.info("Extracted overall=%s, grades=%s", overall, grades)
    facts = _extract_facts(blocks)
    reviews = _extract_reviews(state)
    rankings = _extract_rankings(blocks)
    nces_id = _extract_nces_id(state)
    schools = _extract_schools(state)

    result: dict[str, Any] = {
        "overall_grade": overall,
        "grades": grades,
        "niche_url": url,
    }

    if nces_id:
        result["nces_id"] = nces_id
    if facts.get("enrollment") is not None:
        result["enrollment"] = facts["enrollment"]
    if facts.get("student_teacher_ratio") is not None:
        result["student_teacher_ratio"] = facts["student_teacher_ratio"]
    if facts.get("graduation_rate") is not None:
        result["graduation_rate"] = facts["graduation_rate"]
    if facts.get("math_proficiency") is not None:
        result["math_proficiency"] = facts["math_proficiency"]
    if facts.get("reading_proficiency") is not None:
        result["reading_proficiency"] = facts["reading_proficiency"]
    if reviews:
        result["reviews"] = reviews
    if rankings:
        result["rankings"] = rankings
    if schools:
        result["schools"] = schools

    return result


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------

def cache_get(key: str) -> dict | None:
    entry = _cache.get(key)
    if entry is None:
        return None
    ts, data = entry
    if time.time() - ts > CACHE_TTL:
        del _cache[key]
        return None
    return data


def cache_set(key: str, data: dict) -> None:
    _cache[key] = (time.time(), data)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/niche/district")
async def get_district(
    name: str = Query(..., description="District name from NCES data"),
    state: str = Query(..., description="Two-letter state abbreviation"),
    leaid: str = Query("", description="NCES LEA ID for validation"),
):
    cache_key = f"district:{leaid or name}:{state}"
    cached = cache_get(cache_key)
    if cached:
        log.info("Cache hit: %s", cache_key)
        return cached

    slugs = district_slug_variants(name, state)
    log.info("Trying %d slug variants for district '%s, %s': %s", len(slugs), name, state, slugs)

    for slug in slugs:
        url = f"https://www.niche.com/k12/d/{slug}/"
        log.info("Attempting %s", url)
        state_data = await fetch_niche_page(url)
        if state_data is None:
            continue

        result = build_response(state_data, url)

        # Validate via NCES ID if we have one
        if leaid and result.get("nces_id"):
            if result["nces_id"] != leaid:
                log.warning(
                    "NCES mismatch: expected %s, got %s for slug %s",
                    leaid, result["nces_id"], slug,
                )
                continue

        cache_set(cache_key, result)
        return result

    raise HTTPException(
        status_code=404,
        detail=f"Could not find Niche page for district '{name}' in {state}. "
               f"Tried slugs: {slugs}",
    )


@app.get("/niche/school")
async def get_school(
    name: str = Query(..., description="School name"),
    city: str = Query(..., description="City name"),
    state: str = Query(..., description="Two-letter state abbreviation"),
    ncessch: str = Query("", description="NCES school ID for validation"),
):
    cache_key = f"school:{ncessch or name}:{city}:{state}"
    cached = cache_get(cache_key)
    if cached:
        log.info("Cache hit: %s", cache_key)
        return cached

    slugs = school_slug_variants(name, city, state)
    log.info("Trying %d slug variants for school '%s, %s, %s': %s", len(slugs), name, city, state, slugs)

    for slug in slugs:
        url = f"https://www.niche.com/k12/{slug}/"
        log.info("Attempting %s", url)
        state_data = await fetch_niche_page(url)
        if state_data is None:
            continue

        result = build_response(state_data, url)

        # Validate via NCES school ID if provided
        if ncessch and result.get("nces_id"):
            if result["nces_id"] != ncessch:
                log.warning(
                    "NCES mismatch: expected %s, got %s for slug %s",
                    ncessch, result["nces_id"], slug,
                )
                continue

        cache_set(cache_key, result)
        return result

    raise HTTPException(
        status_code=404,
        detail=f"Could not find Niche page for school '{name}' in {city}, {state}. "
               f"Tried slugs: {slugs}",
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "browser": _browser is not None and _browser.is_connected(),
        "cache_size": len(_cache),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")
