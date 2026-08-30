# Third-party software

This inventory covers direct dependencies detected on 2026-08-29. The
lockfiles remain the authoritative source for exact resolved versions and
transitive packages.

## Backend runtime

| Package | Version | Detected license |
|---|---:|---|
| FastAPI | 0.115.6 | MIT |
| Uvicorn | 0.34.0 | BSD |
| Pydantic | 2.10.4 | MIT |
| NumPy | 2.2.1 | BSD |

## Frontend runtime

| Package | Resolved version | Detected license |
|---|---:|---|
| React | 18.3.1 | MIT |
| React DOM | 18.3.1 | MIT |
| Three.js | 0.169.0 | MIT |
| React Three Fiber | 8.18.0 | MIT |
| Drei | 9.122.0 | MIT |
| React Three Postprocessing | 2.16.3 | MIT |
| postprocessing | 6.36.4 | zlib |
| Zustand | 5.0.14 | MIT |

## Development and browser testing

| Package | Resolved version | Detected license |
|---|---:|---|
| Vite | 5.4.21 | MIT |
| TypeScript | 5.9.3 | Apache 2.0 |
| Vite React plugin | 4.7.0 | MIT |
| React/Three type packages | resolved in `package-lock.json` | MIT |
| HTTPX | 0.28.1 | BSD-3-Clause |
| pytest | 8.3.4 | MIT |
| pytest-cov | 6.0.0 | MIT |
| Ruff | 0.9.2 | MIT |
| Puppeteer | 25.3.0 | Apache 2.0 |

## Distribution note

This list is informational and is not a substitute for the license files of
the exact packages and transitive dependencies. If compiled or packaged
artifacts are distributed, produce a full dependency notice bundle from the
corresponding lockfiles and retain all notices required by MIT, BSD, Apache
2.0, zlib, and other applicable licenses.
