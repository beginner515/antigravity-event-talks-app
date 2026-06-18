# BigQuery Release Notes Radar 🛰️

A elegant, modern web dashboard built with Python Flask, HTML5, Vanilla CSS3, and JavaScript. It aggregates the Google Cloud BigQuery Release Notes RSS/Atom feed, structures the updates into categories (Features, Announcements, Issues, Deprecations), enables fast search/filtering, and features a custom draft tweet composer with live previews to share updates directly to X (Twitter).

## Features

- **Automated Fetching & Parsing:** Connects directly to Google's BigQuery feed and parsed with BeautifulSoup.
- **Smart In-Memory Caching:** Automatically caches XML results for 5 minutes to optimize network requests and latency.
- **Elegant Category Sorting:** Filters and styles updates by Type (*Features*, *Announcements*, *Issues*, *Changes*, *Deprecations*).
- **Instant Client-Side Filtering:** Interactive text searching across dates, category names, and descriptions.
- **Modern Glassmorphic Dark UI:** Responsive design with smooth animations, custom gradients, and glowing indicator lights.
- **Twitter/X Integration:**
  - Auto-generated tweet drafts.
  - Character counter (warns when exceeding X limit of 280 characters).
  - High-fidelity visual tweet mockup to preview before posting.
  - Opens X web intent on approval to compose directly.

## Getting Started

### Prerequisites

You need Python 3 installed.

### Setup and Running

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the Flask Server:**
   ```bash
   python app.py
   ```
   or on Windows using the Python Launcher:
   ```bash
   py app.py
   ```

3. **Open the Application:**
   Open your browser and navigate to `http://127.0.0.1:5000`.

## Directory Structure

```text
agy-cli-projects/
├── app.py                  # Flask backend & Feed parser
├── requirements.txt        # Python dependency list
├── README.md               # Documentation
├── templates/
│   └── index.html          # HTML5 layout structure
└── static/
    ├── css/
    │   └── style.css       # Custom glassmorphic styling
    └── js/
        └── app.js          # Client-side search, filtering, and tweeting logic
```
