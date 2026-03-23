# 🚀 NASA Mission Explorer

A stunning web application that lets you explore the cosmos through NASA's **Astronomy Picture of the Day (APOD)** API. Discover breathtaking images and videos of the universe, pick any date to see what the cosmos looked like, and build your personal collection of cosmic favorites.

![NASA Mission Explorer](https://api.nasa.gov/assets/img/favicons/favicon-192.png)

## 🌌 Project Overview

NASA Mission Explorer provides an immersive space-themed experience where users can:
- View today's Astronomy Picture of the Day
- Travel through time by picking any date since June 16, 1995
- Discover what the universe looked like on their birthday 🎂
- Browse a gallery of random cosmic wonders
- Search, filter, and sort astronomical content
- Save favorites for later viewing
- Toggle between dark (space) and light themes

## 🔗 API Used

**NASA APOD API** — [https://api.nasa.gov/](https://api.nasa.gov/)

The Astronomy Picture of the Day API provides access to NASA's curated collection of astronomical images and their descriptions, contributed by professional astronomers worldwide.

**Endpoints used:**
- `GET /planetary/apod?date={date}` — Fetch APOD for a specific date
- Parameters: `api_key`, `date`

## ✨ Features

### Core Features
| Feature | Description | Implementation |
|---------|-------------|----------------|
| 🔍 **Search** | Find images by title or description | `Array.filter()` with debouncing |
| 🎛️ **Filter** | Filter by media type and date range | `Array.filter()` HOF |
| 📊 **Sort** | Sort by date or title (asc/desc) | `Array.sort()` HOF |
| 🎂 **Birthday Explorer** | See the cosmos on your birthday | Date picker + APOD fetch |
| 📅 **Date Picker** | Select any date for historical APOD | HTML5 date input + fetch |
| 🖼️ **Full-Screen Modal** | Immersive image viewing | CSS modal with backdrop |
| 🔲 **HD Toggle** | Switch standard/high-definition | APOD `hdurl` field toggle |
| ⭐ **Favorites** | Save and manage favorite APODs | `localStorage` persistence |
| 🌓 **Dark/Light Mode** | Theme toggle | CSS variables + `localStorage` |

### Bonus Features
| Feature | Description |
|---------|-------------|
| ⏱️ **Debouncing** | 400ms delay on search input to optimize API calls |
| 💀 **Loading Indicators** | Skeleton screens and spinners during data fetches |
| 💾 **Local Storage** | Favorites and theme preferences persist across sessions |
| 📄 **Pagination** | Load more content in gallery view |
| 🎲 **Random Date** | Discover random cosmic moments with one click |
| 📱 **Responsive Design** | Fully optimized for mobile, tablet, and desktop |
| 🧹 **Clear Favorites** | Bulk clear all saved favorites |

### Array Higher-Order Functions Used
All data operations use Array HOFs exclusively — **no `for` or `while` loops**:
- `Array.filter()` — Search filtering, media type filtering, date range filtering
- `Array.sort()` — Sorting by date, sorting by title
- `Array.from()` — Generating random dates, creating star elements
- `Array.forEach()` — Rendering cards, attaching event listeners
- `Array.find()` — Checking favorite status
- `Array.findIndex()` — Locating items in favorites
- `Array.map()` — Transforming API calls to promises
- `Promise.all()` — Parallel API fetching for gallery
- Spread operator `[...array]` — Immutable array operations

## 🛠️ Technologies

- **HTML5** — Semantic markup, meta tags, accessibility attributes
- **CSS3** — Custom properties, Grid, Flexbox, animations, glassmorphism, media queries
- **JavaScript (ES6+)** — Fetch API, async/await, Array HOFs, localStorage, DOM manipulation
- **Google Fonts** — Orbitron (display), Inter (body), Space Mono (mono)
- **NASA APOD API** — Real-time astronomical data

## 📦 Setup & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/Lakshya-2440/WAP_PRO.git
   ```
2. Navigate to the project:
   ```bash
   cd WAP_PRO
   ```
3. Open `index.html` in your browser:
   ```bash
   open index.html
   ```

No build tools, frameworks, or dependencies required — it's a pure HTML/CSS/JS application.

> **Note:** The app uses NASA's `DEMO_KEY` which has rate limits (30 requests/hour, 50 requests/day per IP). For higher limits, register for a free API key at [https://api.nasa.gov/](https://api.nasa.gov/) and update the `API_KEY` in `app.js`.

## 📁 Project Structure

```
WAP_PRO/
├── index.html    # Main HTML structure with three views (Explore, Gallery, Favorites)
├── style.css     # Complete styling with dark/light themes and responsive design
├── app.js        # Application logic, API integration, and all interactive features
└── README.md     # Project documentation
```

## 🎨 Design Highlights

- **Space-themed dark mode** with animated twinkling star background
- **Gradient accents** (purple → cyan) with glowing borders
- **Glassmorphism** effects on header and interactive controls
- **Smooth micro-animations** on hover, scroll, and transitions
- **Skeleton loading screens** for seamless content loading
- **Responsive layout** adapting to mobile, tablet, and desktop breakpoints
- **Custom scrollbar** styling matching the space theme
- **Orbitron font** for headings creating a futuristic space feel

## 🚀 Milestones

| Milestone | Description | Status |
|-----------|-------------|--------|
| M1 | Project Setup and Basic Structure | ✅ Complete |
| M2 | API Integration and Responsive Design | ✅ Complete |
| M3 | Core Interactive Features | ✅ Complete |
| M4 | Documentation, Deployment, and Final Submission | ✅ Complete |

## 👤 Author

**Lakshya Gupta**

## 📄 License

This project is for educational purposes.
