# School District Explorer

Interactive map-based explorer for US school districts. Built with React + TypeScript + Vite.

## Getting Started

### Frontend

```bash
npm install
npm run dev
```

### Companion Server (Niche Data)

The companion server is a local Python proxy that fetches school/district data from Niche.com using a headless browser. It runs on your machine so requests come from a residential IP (Niche blocks datacenter IPs with PerimeterX).

```bash
cd companion
pip install -r requirements.txt
patchright install chromium
python server.py
```

The server starts on `http://localhost:8080`. The frontend calls it to enrich districts/schools with Niche grades, reviews, and rankings.

#### Endpoints

**`GET /niche/district`** - Fetch district grades and stats from Niche.

| Param | Required | Description |
|-------|----------|-------------|
| `name` | yes | District name (from NCES data) |
| `state` | yes | Two-letter state abbreviation |
| `leaid` | no | NCES LEA ID, used to validate the match |

**`GET /niche/school`** - Fetch school data from Niche.

| Param | Required | Description |
|-------|----------|-------------|
| `name` | yes | School name |
| `city` | yes | City name |
| `state` | yes | Two-letter state abbreviation |
| `ncessch` | no | NCES school ID, used to validate the match |

**`GET /health`** - Server health check.

#### Example Response

```json
{
  "overall_grade": "B+",
  "grades": {
    "academics": "B-",
    "teachers": "B+",
    "diversity": "A+",
    "college_prep": "A-",
    "clubs_and_activities": "B",
    "administration": "B",
    "sports": "B-",
    "food": "C",
    "resources_and_facilities": "B"
  },
  "enrollment": 30124,
  "student_teacher_ratio": 15.2,
  "reviews": {
    "average": 3.41,
    "count": 127
  },
  "rankings": [
    {"display": "Best School Districts in NC", "ordinal": 42, "total": 115}
  ],
  "niche_url": "https://www.niche.com/k12/d/durham-public-schools-nc/",
  "nces_id": "3701200"
}
```

#### How URL Resolution Works

Niche doesn't have a public API, so the server constructs URL slugs from the district/school name and tries to fetch the page. NCES names don't always match Niche's naming (e.g. "Broward County School District" in NCES vs "Broward County Public Schools" on Niche), so the server tries multiple slug variants automatically:

- `durham-public-schools-nc` (exact)
- `durham-school-district-nc` (swap suffix)

If a `leaid` or `ncessch` is provided, the server validates the match against the NCES ID embedded in Niche's page data.

Results are cached in memory for 1 hour to avoid re-fetching.

## Data Sources

- **NCES** - District boundaries, enrollment, teacher counts, school counts (static JSON in `public/data/districts/`)
- **Niche** - Grades, reviews, rankings, proficiency stats (fetched live via companion server)
