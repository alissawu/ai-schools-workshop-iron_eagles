# School District Explorer

Explore US school districts with enrollment stats, demographics, and Niche ratings.

Built with React, TypeScript, Vite, and a Python companion server for live Niche data.

## Quick Start

```bash
make setup   # install dependencies
make start   # run app
```

Then open http://localhost:5173

## Commands

| Command | Description |
|---------|-------------|
| `make setup` | Install npm + Python dependencies |
| `make start` | Run frontend + Niche companion server |
| `make test` | Run test suite (86 tests, 99% coverage) |

## Data Sources

- **NCES CCD** - Districts, schools, enrollment, demographics (bundled)
- **Niche.com** - Grades, reviews, rankings (fetched live)
