const CONFIG = {
    API_KEY: "YyIrJx6NWOFZeMPm6iglnzlwKKdjUfycPwq9MY9j",
    BASE_URL: "https://api.nasa.gov/planetary/apod",
    MIN_DATE: "1995-06-16",
    GALLERY_COUNT: 10,
    DEBOUNCE_DELAY: 400
};

const state = {
    currentView: "explore",
    galleryData: [],
    filteredData: [],
    favorites: [],
    isLoading: false,
    isHD: false,
    currentApod: null,
    galleryPage: 0,
    theme: "dark"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const APOD_CACHE_KEY = "nasa-explorer-apod-cache-v1";

const FALLBACK_APODS = [
    {
        date: "2025-12-18",
        title: "Spiral Galaxy in Deep Space",
        explanation: "Fallback content shown because NASA APOD is temporarily unavailable. This image keeps the app usable while the API recovers.",
        media_type: "image",
        url: "https://images-assets.nasa.gov/image/PIA12348/PIA12348~orig.jpg",
        hdurl: "https://images-assets.nasa.gov/image/PIA12348/PIA12348~orig.jpg",
        copyright: "NASA/JPL"
    },
    {
        date: "2025-11-07",
        title: "Pillars of Creation",
        explanation: "Fallback content shown because NASA APOD is temporarily unavailable. This keeps Explore and Gallery available during API outages.",
        media_type: "image",
        url: "https://images-assets.nasa.gov/image/PIA24575/PIA24575~orig.jpg",
        hdurl: "https://images-assets.nasa.gov/image/PIA24575/PIA24575~orig.jpg",
        copyright: "NASA, ESA, CSA, STScI"
    },
    {
        date: "2025-10-22",
        title: "Jupiter and the Great Red Spot",
        explanation: "Fallback content shown because NASA APOD is temporarily unavailable. Rate limits and temporary server issues are handled automatically.",
        media_type: "image",
        url: "https://images-assets.nasa.gov/image/PIA02873/PIA02873~orig.jpg",
        hdurl: "https://images-assets.nasa.gov/image/PIA02873/PIA02873~orig.jpg",
        copyright: "NASA/JPL/University of Arizona"
    },
    {
        date: "2025-09-01",
        title: "The Eagle Nebula",
        explanation: "Fallback content shown because NASA APOD is temporarily unavailable. The app now fails gracefully instead of showing only an error state.",
        media_type: "image",
        url: "https://images-assets.nasa.gov/image/PIA01322/PIA01322~orig.jpg",
        hdurl: "https://images-assets.nasa.gov/image/PIA01322/PIA01322~orig.jpg",
        copyright: "NASA/ESA"
    },
    {
        date: "2025-08-12",
        title: "Saturn with Rings",
        explanation: "Fallback content shown because NASA APOD is temporarily unavailable. Your favorites and gallery features continue to work with fallback entries.",
        media_type: "image",
        url: "https://images-assets.nasa.gov/image/PIA17172/PIA17172~orig.jpg",
        hdurl: "https://images-assets.nasa.gov/image/PIA17172/PIA17172~orig.jpg",
        copyright: "NASA/JPL-Caltech/SSI"
    },
    {
        date: "2025-07-04",
        title: "Earth from Apollo",
        explanation: "Fallback content shown because NASA APOD is temporarily unavailable. This improves reliability during intermittent API failures.",
        media_type: "image",
        url: "https://images-assets.nasa.gov/image/as11-44-6552/as11-44-6552~orig.jpg",
        hdurl: "https://images-assets.nasa.gov/image/as11-44-6552/as11-44-6552~orig.jpg",
        copyright: "NASA"
    }
];

function getApiKeys() {
    return [...new Set([CONFIG.API_KEY, ...(CONFIG.API_KEYS || []), "DEMO_KEY", ""].filter((key) => key !== undefined && key !== null))];
}

function normalizeErrorStatus(error) {
    const raw = error?.status;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return null;
}

function isRetryableApiError(error) {
    const status = normalizeErrorStatus(error);
    const code = typeof error?.status === "string" ? error.status.toUpperCase() : "";
    return status === 429 || status === 500 || (status !== null && status >= 502) || code.includes("OVER_RATE_LIMIT");
}

function getCachedApod(date) {
    try {
        const cache = JSON.parse(localStorage.getItem(APOD_CACHE_KEY) || "{}");
        return cache[date] || null;
    } catch {
        return null;
    }
}

function setCachedApod(date, data) {
    try {
        const cache = JSON.parse(localStorage.getItem(APOD_CACHE_KEY) || "{}");
        cache[date] = data;
        localStorage.setItem(APOD_CACHE_KEY, JSON.stringify(cache));
    } catch {
        // Ignore cache failures (e.g., private mode storage limits).
    }
}

function buildApodUrl(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.set(key, String(value));
        }
    });
    return `${CONFIG.BASE_URL}?${query.toString()}`;
}

async function getJsonOrThrow(url) {
    const response = await fetch(url);
    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok || (payload && payload.error)) {
        const message = payload?.error?.message || payload?.msg || `API Error: ${response.status}`;
        const error = new Error(message);
        error.status = payload?.error?.code || response.status;
        throw error;
    }

    return payload;
}

async function fetchApodWithFallback(params) {
    const keys = getApiKeys();
    let lastError = new Error("Failed to fetch data from NASA.");

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        try {
            const url = buildApodUrl({ ...params, api_key: key });
            return await getJsonOrThrow(url);
        } catch (error) {
            lastError = error;
            if (isRetryableApiError(error) && i < keys.length - 1) {
                continue;
            }
        }
    }

    throw lastError;
}

function cloneFallbackApod(entry, dateOverride) {
    return {
        ...entry,
        date: dateOverride || entry.date,
        title: `${entry.title} (Fallback)`
    };
}

function getFallbackApodForDate(date) {
    if (FALLBACK_APODS.length === 0) return null;
    const dayIndex = new Date(`${date}T00:00:00`).getDate() - 1;
    const selected = FALLBACK_APODS[Math.abs(dayIndex) % FALLBACK_APODS.length];
    return cloneFallbackApod(selected, date);
}

function getFallbackGalleryEntries(count) {
    const total = Math.max(count, FALLBACK_APODS.length);
    return Array.from({ length: total }, (_, index) => {
        const base = FALLBACK_APODS[index % FALLBACK_APODS.length];
        const d = new Date();
        d.setDate(d.getDate() - index);
        const date = d.toISOString().split("T")[0];
        return cloneFallbackApod(base, date);
    });
}

function formatApiError(error) {
    const status = normalizeErrorStatus(error);
    const code = typeof error?.status === "string" ? error.status.toUpperCase() : "";
    if (status === 429 || code.includes("OVER_RATE_LIMIT")) {
        return "NASA API rate limit reached. Please wait a minute and try again.";
    }
    if (status === 500 || (status !== null && status >= 502)) {
        return "NASA API is temporarily unavailable. Showing fallback content.";
    }
    return error?.message || "Failed to fetch data from NASA. Please try again.";
}

async function getApodByDate(date) {
    const cached = getCachedApod(date);
    if (cached) return cached;

    try {
        const data = await fetchApodWithFallback({ date });
        setCachedApod(date, data);
        return data;
    } catch {
        const fallback = getFallbackApodForDate(date);
        if (fallback) {
            setCachedApod(date, fallback);
            return fallback;
        }
        throw new Error("NASA API and fallback content are unavailable.");
    }
}

function init() {
    loadTheme();
    loadFavorites();
    createStars();
    setupEventListeners();
    setDateConstraints();
    fetchToday();
}

function createStars() {
    const container = $("#stars-container");
    const fragment = document.createDocumentFragment();
    Array.from({ length: 150 }, () => {
        const star = document.createElement("div");
        star.className = "star";
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.width = `${Math.random() * 3 + 1}px`;
        star.style.height = star.style.width;
        star.style.setProperty("--duration", `${Math.random() * 3 + 2}s`);
        star.style.animationDelay = `${Math.random() * 5}s`;
        fragment.appendChild(star);
        return star;
    });
    container.appendChild(fragment);
}

function setupEventListeners() {
    $$(".nav-btn").forEach((btn) => {
        btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    $("#mobile-menu-toggle").addEventListener("click", () => {
        $("#main-nav").classList.toggle("open");
    });

    $("#theme-toggle").addEventListener("click", toggleTheme);

    $("#date-picker").addEventListener("change", (e) => {
        if (e.target.value) fetchAPOD(e.target.value);
    });

    $("#today-btn").addEventListener("click", fetchToday);
    $("#random-btn").addEventListener("click", fetchRandom);
    $("#retry-btn").addEventListener("click", fetchToday);

    $("#fullscreen-btn").addEventListener("click", openModal);
    $("#hd-toggle").addEventListener("click", toggleHD);
    $("#favorite-btn").addEventListener("click", () => {
        if (state.currentApod) toggleFavorite(state.currentApod);
    });

    $("#modal-close").addEventListener("click", closeModal);
    $("#modal-overlay").addEventListener("click", (e) => {
        if (e.target === $("#modal-overlay")) closeModal();
    });

    $("#apod-image").addEventListener("click", openModal);

    let searchTimeout;
    $("#search-input").addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => applyGalleryFilters(), CONFIG.DEBOUNCE_DELAY);
    });

    $("#media-filter").addEventListener("change", applyGalleryFilters);
    $("#sort-select").addEventListener("change", applyGalleryFilters);
    $("#date-from").addEventListener("change", applyGalleryFilters);
    $("#date-to").addEventListener("change", applyGalleryFilters);
    $("#favorites-sort").addEventListener("change", renderFavorites);

    $("#load-more-btn").addEventListener("click", loadMoreGallery);

    $(".empty-state .btn").addEventListener("click", () => switchView("explore"));

    $("#birthday-btn").addEventListener("click", exploreBirthday);

    $("#clear-favorites-btn").addEventListener("click", clearAllFavorites);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });
}

function setDateConstraints() {
    const today = new Date().toISOString().split("T")[0];
    $("#date-picker").max = today;
    $("#date-picker").min = CONFIG.MIN_DATE;
    $("#date-from").max = today;
    $("#date-from").min = CONFIG.MIN_DATE;
    $("#date-to").max = today;
    $("#date-to").min = CONFIG.MIN_DATE;
    $("#birthday-picker").max = today;
    $("#birthday-picker").min = CONFIG.MIN_DATE;
}

function switchView(view) {
    state.currentView = view;
    $$(".view").forEach((v) => v.classList.add("hidden"));
    $(`#${view}-view`).classList.remove("hidden");

    $$(".nav-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.view === view);
    });

    $("#main-nav").classList.remove("open");

    if (view === "gallery" && state.galleryData.length === 0) {
        loadGalleryData();
    }

    if (view === "favorites") {
        renderFavorites();
    }
}

function showLoading() {
    state.isLoading = true;
    $("#loading-skeleton").classList.remove("hidden");
    $("#apod-content").classList.add("hidden");
    $("#error-display").classList.add("hidden");
}

function hideLoading() {
    state.isLoading = false;
    $("#loading-skeleton").classList.add("hidden");
}

function showError(message) {
    hideLoading();
    $("#error-display").classList.remove("hidden");
    $("#apod-content").classList.add("hidden");
    $("#error-message").textContent = message;
}

function formatDate(dateString) {
    return new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

async function fetchAPOD(date) {
    showLoading();

    try {
        const data = await getApodByDate(date);

        state.currentApod = data;
        state.isHD = false;
        renderAPOD(data);
    } catch (error) {
        showError(formatApiError(error));
        throw error;
    }
}

async function fetchToday() {
    const today = new Date().toISOString().split("T")[0];
    $("#date-picker").value = today;

    try {
        await fetchAPOD(today);
    } catch {
        try {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
            $("#date-picker").value = yesterday;
            await fetchAPOD(yesterday);
        } catch (error) {
            showError(formatApiError(error));
        }
    }
}

function fetchRandom() {
    const start = new Date(CONFIG.MIN_DATE).getTime();
    const end = new Date().getTime();
    const randomDate = new Date(start + Math.random() * (end - start));
    const dateStr = randomDate.toISOString().split("T")[0];
    $("#date-picker").value = dateStr;
    fetchAPOD(dateStr);
}

function exploreBirthday() {
    const birthday = $("#birthday-picker").value;
    if (!birthday) return;
    const birthdayDate = new Date(birthday);
    const minDate = new Date(CONFIG.MIN_DATE);
    if (birthdayDate < minDate) {
        const adjustedYear = minDate.getFullYear() + 1;
        const adjusted = `${adjustedYear}-${birthday.slice(5)}`;
        $("#date-picker").value = adjusted;
        fetchAPOD(adjusted);
    } else {
        $("#date-picker").value = birthday;
        fetchAPOD(birthday);
    }
}

function renderAPOD(data) {
    hideLoading();
    $("#apod-content").classList.remove("hidden");

    const isVideo = data.media_type === "video";
    const image = $("#apod-image");
    const video = $("#apod-video");

    if (isVideo) {
        image.classList.add("hidden");
        video.classList.remove("hidden");
        video.src = data.url;
        $("#fullscreen-btn").classList.add("hidden");
        $("#hd-toggle").classList.add("hidden");
    } else {
        image.classList.remove("hidden");
        video.classList.add("hidden");
        image.src = data.url;
        image.alt = data.title;
        $("#fullscreen-btn").classList.remove("hidden");
        $("#hd-toggle").classList.remove("hidden");
    }

    $("#apod-date").textContent = formatDate(data.date);
    $("#apod-title").textContent = data.title;
    $("#apod-explanation").textContent = data.explanation;

    if (data.copyright) {
        $("#apod-copyright").textContent = `© ${data.copyright}`;
        $("#apod-copyright").classList.remove("hidden");
    } else {
        $("#apod-copyright").classList.add("hidden");
    }

    updateFavoriteButton(data);
}

function toggleHD() {
    if (!state.currentApod || state.currentApod.media_type === "video") return;

    state.isHD = !state.isHD;
    const image = $("#apod-image");
    const hdBtn = $("#hd-toggle");

    if (state.isHD && state.currentApod.hdurl) {
        image.src = state.currentApod.hdurl;
        hdBtn.classList.add("active");
    } else {
        image.src = state.currentApod.url;
        hdBtn.classList.remove("active");
        state.isHD = false;
    }
}

function openModal() {
    if (!state.currentApod || state.currentApod.media_type === "video") return;

    const modalImg = $("#modal-image");
    modalImg.src = state.isHD && state.currentApod.hdurl ? state.currentApod.hdurl : state.currentApod.url;
    modalImg.alt = state.currentApod.title;
    $("#modal-title").textContent = state.currentApod.title;
    $("#modal-date").textContent = formatDate(state.currentApod.date);
    $("#modal-overlay").classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeModal() {
    $("#modal-overlay").classList.add("hidden");
    document.body.style.overflow = "";
}

async function loadGalleryData() {
    $("#gallery-loading").classList.remove("hidden");

    try {
        const range = generateRandomDateRange(CONFIG.GALLERY_COUNT);
        const results = await fetchApodWithFallback({
            start_date: range.start,
            end_date: range.end
        });
        const entries = Array.isArray(results) ? results : [results];
        const validResults = entries.filter((item) => item && !item.error);
        const byDate = new Map(state.galleryData.map((item) => [item.date, item]));
        validResults.forEach((item) => byDate.set(item.date, item));

        state.galleryData = Array.from(byDate.values());
        state.galleryPage++;
        applyGalleryFilters();
    } catch (error) {
        const fallbackEntries = getFallbackGalleryEntries(CONFIG.GALLERY_COUNT);
        const byDate = new Map(state.galleryData.map((item) => [item.date, item]));
        fallbackEntries.forEach((item) => byDate.set(item.date, item));
        state.galleryData = Array.from(byDate.values());
        state.galleryPage++;
        applyGalleryFilters();
        $("#results-info").textContent = `${formatApiError(error)} Using fallback gallery content.`;
    } finally {
        $("#gallery-loading").classList.add("hidden");
    }
}

function loadMoreGallery() {
    loadGalleryData();
}

function generateRandomDates(count) {
    const start = new Date(CONFIG.MIN_DATE).getTime();
    const end = new Date().getTime();
    return Array.from({ length: count }, () => {
        const date = new Date(start + Math.random() * (end - start));
        return date.toISOString().split("T")[0];
    });
}

function generateRandomDateRange(count) {
    const min = new Date(CONFIG.MIN_DATE);
    const max = new Date();
    const maxStart = new Date(max);
    maxStart.setDate(maxStart.getDate() - Math.max(count - 1, 0));
    const startTime = Math.max(min.getTime(), min.getTime() + Math.random() * (maxStart.getTime() - min.getTime()));

    const startDate = new Date(startTime);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.max(count - 1, 0));
    if (endDate > max) endDate.setTime(max.getTime());

    return {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0]
    };
}

function applyGalleryFilters() {
    const searchTerm = $("#search-input").value.toLowerCase().trim();
    const mediaFilter = $("#media-filter").value;
    const sortValue = $("#sort-select").value;
    const dateFrom = $("#date-from").value;
    const dateTo = $("#date-to").value;

    let filtered = state.galleryData.filter((item) => {
        const matchesSearch = searchTerm === "" ||
            item.title.toLowerCase().includes(searchTerm) ||
            item.explanation.toLowerCase().includes(searchTerm);

        const matchesMedia = mediaFilter === "all" || item.media_type === mediaFilter;

        const matchesDateFrom = !dateFrom || item.date >= dateFrom;
        const matchesDateTo = !dateTo || item.date <= dateTo;

        return matchesSearch && matchesMedia && matchesDateFrom && matchesDateTo;
    });

    const [field, direction] = sortValue.split("-");
    filtered = filtered.sort((a, b) => {
        let comparison = 0;
        if (field === "date") {
            comparison = a.date.localeCompare(b.date);
        } else if (field === "title") {
            comparison = a.title.localeCompare(b.title);
        }
        return direction === "desc" ? -comparison : comparison;
    });

    state.filteredData = filtered;
    renderGallery(filtered);

    const total = state.galleryData.length;
    const shown = filtered.length;
    $("#results-info").textContent = `Showing ${shown} of ${total} results`;

    const hasMore = state.galleryPage * CONFIG.GALLERY_COUNT < 100;
    if (hasMore) {
        $("#load-more-btn").classList.remove("hidden");
    } else {
        $("#load-more-btn").classList.add("hidden");
    }
}

function renderGallery(items) {
    const grid = $("#gallery-grid");
    grid.innerHTML = "";

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1">
                <span class="empty-icon">🔭</span>
                <h3>No Results Found</h3>
                <p>Try adjusting your search or filters</p>
            </div>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
        const card = createGalleryCard(item);
        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
}

function createGalleryCard(item) {
    const card = document.createElement("div");
    card.className = "gallery-card";

    const isFav = state.favorites.find((f) => f.date === item.date);
    const isVideo = item.media_type === "video";
    const thumbnail = isVideo ? `https://img.youtube.com/vi/${extractYouTubeId(item.url)}/hqdefault.jpg` : item.url;

    card.innerHTML = `
        <div class="apod-media-wrapper">
            <img class="gallery-card-image" src="${thumbnail}" alt="${item.title}" loading="lazy"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 220%22%3E%3Crect fill=%22%231a1a3e%22 width=%22300%22 height=%22220%22/%3E%3Ctext fill=%22%236b6b99%22 font-family=%22sans-serif%22 font-size=%2214%22 x=%22150%22 y=%22110%22 text-anchor=%22middle%22%3ENo Preview%3C/text%3E%3C/svg%3E'">
        </div>
        <div class="gallery-card-info">
            <span class="gallery-card-date">${formatDate(item.date)}</span>
            <h4 class="gallery-card-title">${item.title}</h4>
            <div class="gallery-card-actions">
                <span class="card-type-badge">${item.media_type}</span>
                <button class="card-fav-btn" data-date="${item.date}">${isFav ? "★" : "☆"}</button>
            </div>
        </div>`;

    card.addEventListener("click", (e) => {
        if (e.target.closest(".card-fav-btn")) {
            e.stopPropagation();
            toggleFavorite(item);
            const btn = e.target.closest(".card-fav-btn");
            const nowFav = state.favorites.find((f) => f.date === item.date);
            btn.textContent = nowFav ? "★" : "☆";
            return;
        }

        state.currentApod = item;
        state.isHD = false;
        switchView("explore");
        renderAPOD(item);
        $("#date-picker").value = item.date;
    });

    return card;
}

function extractYouTubeId(url) {
    const match = url.match(/(?:embed\/|v=)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : "";
}

function toggleFavorite(item) {
    const index = state.favorites.findIndex((f) => f.date === item.date);
    if (index === -1) {
        state.favorites = [...state.favorites, item];
    } else {
        state.favorites = state.favorites.filter((f) => f.date !== item.date);
    }
    saveFavorites();
    updateFavoriteButton(item);
}

function updateFavoriteButton(item) {
    const isFav = state.favorites.find((f) => f.date === item.date);
    const favBtn = $("#favorite-btn");
    if (isFav) {
        favBtn.querySelector("span").textContent = "★";
        favBtn.classList.add("active");
    } else {
        favBtn.querySelector("span").textContent = "☆";
        favBtn.classList.remove("active");
    }
}

function saveFavorites() {
    localStorage.setItem("nasa-explorer-favorites", JSON.stringify(state.favorites));
}

function loadFavorites() {
    const saved = localStorage.getItem("nasa-explorer-favorites");
    if (saved) {
        state.favorites = JSON.parse(saved);
    }
}

function clearAllFavorites() {
    if (state.favorites.length === 0) return;
    state.favorites = [];
    saveFavorites();
    renderFavorites();
}

function renderFavorites() {
    const grid = $("#favorites-grid");
    const emptyState = $("#favorites-empty");

    if (state.favorites.length === 0) {
        emptyState.classList.remove("hidden");
        grid.innerHTML = "";
        return;
    }

    emptyState.classList.add("hidden");

    const sortValue = $("#favorites-sort").value;
    const [field, direction] = sortValue.split("-");

    const sorted = [...state.favorites].sort((a, b) => {
        let comparison = 0;
        if (field === "date") {
            comparison = a.date.localeCompare(b.date);
        } else if (field === "title") {
            comparison = a.title.localeCompare(b.title);
        }
        return direction === "desc" ? -comparison : comparison;
    });

    grid.innerHTML = "";
    const fragment = document.createDocumentFragment();
    sorted.forEach((item) => {
        const card = createGalleryCard(item);
        fragment.appendChild(card);
    });
    grid.appendChild(fragment);
}

function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.body.classList.toggle("light-mode", state.theme === "light");
    $(".theme-icon").textContent = state.theme === "dark" ? "☀️" : "🌙";
    localStorage.setItem("nasa-explorer-theme", state.theme);
}

function loadTheme() {
    const saved = localStorage.getItem("nasa-explorer-theme");
    if (saved) {
        state.theme = saved;
        document.body.classList.toggle("light-mode", state.theme === "light");
        $(".theme-icon").textContent = state.theme === "dark" ? "☀️" : "🌙";
    }
}

document.addEventListener("DOMContentLoaded", init);
