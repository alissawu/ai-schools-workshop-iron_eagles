# School District Explorer

A web app to help parents and educators evaluate K-12 school districts across the United States.

## Features

- **Search districts** by state - browse all public school districts in any US state
- **District details** including enrollment, number of schools, and student-teacher ratios
- **Niche ratings** - overall grades and category breakdowns (academics, teachers, diversity, etc.) pulled live from Niche.com
- **Data attribution** - district data from NCES Common Core of Data (2022-23)

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, TanStack Query v5, Vite
- **Data**: Bundled NCES district data (no external API calls for district info)
- **Ratings**: Niche.com companion server using Patchright (stealth browser automation)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+

### Installation

```bash
# Install frontend dependencies
npm install

# Set up the Niche companion server
cd companion
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
patchright install chromium
cd ..
```

### Running

```bash
# Start both frontend and companion server
npm start
```

Or run them separately:

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Companion server
cd companion
source .venv/bin/activate
python server.py
```

Then open http://localhost:5173

## Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── api.ts          # API functions and data fetching
│   └── App.tsx         # Main app component
├── public/
│   └── data/           # Bundled NCES district data by state FIPS code
├── companion/
│   ├── server.py       # FastAPI server for Niche data
│   └── requirements.txt
└── package.json
```

## Data Sources

- **District data**: [NCES Common Core of Data](https://nces.ed.gov/ccd/) via bundled JSON files
- **Ratings**: [Niche.com](https://www.niche.com) (fetched live via companion server)

## Notes

- The Niche companion server runs a headed browser to bypass bot detection. A Chrome window will briefly appear when fetching ratings for a new district.
- Ratings are cached for 1 hour to minimize browser popups.
- Built for the NYU Agile/DevOps Spring 2026 AI Tools Workshop.
