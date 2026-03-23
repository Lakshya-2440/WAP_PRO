const CONFIG = {
    API_KEY: "DEMO_KEY",
    BASE_URL: "https://api.nasa.gov/planetary/apod",
    MIN_DATE: "1995-06-16",
    GALLERY_COUNT: 15,
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
        const response = await fetch(`${CONFIG.BASE_URL}?api_key=${CONFIG.API_KEY}&date=${date}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        state.currentApod = data;
        state.isHD = false;
        renderAPOD(data);
    } catch (error) {
        showError(error.message || "Failed to fetch data from NASA. Please try again.");
    }
}

async function fetchToday() {
    const today = new Date().toISOString().split("T")[0];
    $("#date-picker").value = today;
    showLoading();
    try {
        const response = await fetch(`${CONFIG.BASE_URL}?api_key=${CONFIG.API_KEY}&date=${today}`);
        if (!response.ok) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
            $("#date-picker").value = yesterday;
            hideLoading();
            return fetchAPOD(yesterday);
        }
        const data = await response.json();
        if (data.error) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
            $("#date-picker").value = yesterday;
            hideLoading();
            return fetchAPOD(yesterday);
        }
        state.currentApod = data;
        state.isHD = false;
        renderAPOD(data);
    } catch (error) {
        showError(error.message || "Failed to fetch data from NASA. Please try again.");
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
        const dates = generateRandomDates(CONFIG.GALLERY_COUNT);
        const promises = dates.map((date) =>
            fetch(`${CONFIG.BASE_URL}?api_key=${CONFIG.API_KEY}&date=${date}`)
                .then((res) => (res.ok ? res.json() : null))
                .catch(() => null)
        );

        const results = await Promise.all(promises);
        const validResults = results.filter((item) => item !== null && !item.error);

        state.galleryData = [...state.galleryData, ...validResults];
        state.galleryPage++;
        applyGalleryFilters();
    } catch (error) {
        console.error(error);
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
