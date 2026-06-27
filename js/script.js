/**
 * OLTag Weathera - Premium Weather Web Application
 * Core JS File: State, Fetching, UI rendering, Interactive Leaflet maps, SVG Arc computations.
 */

// Default OpenWeatherMap API Key placeholder
const DEFAULT_API_KEY = "YOUR_API_KEY";

// App Core State
const state = {
  apiKey: localStorage.getItem("oltag_weathera_api_key") || DEFAULT_API_KEY,
  demoMode: localStorage.getItem("oltag_weathera_demo_mode") === "true" || true, // default to true if key is default
  unit: localStorage.getItem("oltag_weathera_unit") || "C", // "C" or "F"
  theme: localStorage.getItem("oltag_weathera_theme") || "dark", // "dark" or "light"
  activeCity: localStorage.getItem("oltag_weathera_last_city") || "Paris",
  favorites: JSON.parse(localStorage.getItem("oltag_weathera_favorites")) || ["London", "Tokyo", "New York"],
  recents: JSON.parse(localStorage.getItem("oltag_weathera_recents")) || ["Paris", "Sydney", "Rome"],
  activeWeatherData: null,
  activeForecastData: null,
  activeAqiData: null,
  leafletMap: null,
  leafletMarker: null,
  weatherLayer: null
};

// Popular global cities list for search suggestions
const POPULAR_CITIES = [
  "Amsterdam", "Athens", "Bangkok", "Beijing", "Berlin", "Cairo", "Cape Town",
  "Dubai", "Dublin", "Istanbul", "London", "Madrid", "Melbourne", "Moscow",
  "Mumbai", "New York", "Paris", "Rio de Janeiro", "Rome", "Seoul", "Singapore",
  "Sydney", "Tokyo", "Toronto", "Vancouver", "Vienna"
];

// Document Elements
const elements = {
  pageLoader: document.getElementById("page-loader"),
  toastContainer: document.getElementById("toast-container"),
  searchInput: document.getElementById("search-input"),
  searchBtn: document.getElementById("search-btn"),
  clearSearchBtn: document.getElementById("clear-search-btn"),
  autocompleteDropdown: document.getElementById("autocomplete-dropdown"),
  locationBtn: document.getElementById("location-btn"),
  themeToggle: document.getElementById("theme-toggle"),
  unitToggle: document.getElementById("unit-toggle"),
  settingsModalBtn: document.getElementById("settings-modal-btn"),

  // Dashboard sections
  dashboardSkeleton: document.getElementById("dashboard-skeleton"),
  dashboardResults: document.getElementById("dashboard-results"),
  weatherDashboardView: document.getElementById("weather-dashboard-view"),
  errorCard: document.getElementById("error-card"),
  errorIcon: document.getElementById("error-icon"),
  errorTitle: document.getElementById("error-title"),
  errorDesc: document.getElementById("error-desc"),

  // Hero components
  cityName: document.getElementById("city-name"),
  currentDatetime: document.getElementById("current-datetime"),
  favoriteBtn: document.getElementById("favorite-btn"),
  tempValue: document.getElementById("temp-value"),
  tempUnitLabel: document.getElementById("temp-unit-label"),
  weatherIconImg: document.getElementById("weather-icon-img"),
  weatherConditionTxt: document.getElementById("weather-condition-txt"),
  weatherDescTxt: document.getElementById("weather-desc-txt"),
  feelsLikeVal: document.getElementById("feels-like-val"),
  localTimeVal: document.getElementById("local-time-val"),
  weatherAlertBadge: document.getElementById("weather-alert-badge"),

  // Sunrise/Sunset SVG elements
  sunPathActive: document.getElementById("sun-path-active"),
  sunPointer: document.getElementById("sun-pointer"),
  sunriseTimeVal: document.getElementById("sunrise-time-val"),
  sunsetTimeVal: document.getElementById("sunset-time-val"),
  sunRemaining: document.getElementById("sun-remaining"),

  // List containers
  favoritesList: document.getElementById("favorites-list"),
  recentsList: document.getElementById("recents-list"),
  hourlyScrollContainer: document.getElementById("hourly-scroll-container"),
  forecastList: document.getElementById("forecast-list"),

  // Details elements
  aqiLabelVal: document.getElementById("aqi-label-val"),
  aqiBarFill: document.getElementById("aqi-bar-fill"),
  aqiPm25: document.getElementById("aqi-pm25"),
  aqiPm10: document.getElementById("aqi-pm10"),
  aqiCo: document.getElementById("aqi-co"),
  aqiNo2: document.getElementById("aqi-no2"),

  uvGaugeFill: document.getElementById("uv-gauge-fill"),
  uvValue: document.getElementById("uv-value"),
  uvLevelTxt: document.getElementById("uv-level-txt"),

  compassNeedle: document.getElementById("compass-needle"),
  windSpeedVal: document.getElementById("wind-speed-val"),
  windDirVal: document.getElementById("wind-dir-val"),
  windGustVal: document.getElementById("wind-gust-val"),

  humidityValue: document.getElementById("humidity-value"),
  humidityDropletFill: document.getElementById("humidity-droplet-fill"),
  dewPointVal: document.getElementById("dew-point-val"),

  pressureValue: document.getElementById("pressure-value"),
  pressureFooter: document.getElementById("pressure-footer"),

  visibilityValue: document.getElementById("visibility-value"),
  visibilityFooter: document.getElementById("visibility-footer"),

  // Settings Modal elements
  settingsModal: document.getElementById("settings-modal"),
  closeModalBtn: document.getElementById("close-modal-btn"),
  apiKeyInput: document.getElementById("api-key-input"),
  demoModeCheckbox: document.getElementById("demo-mode-checkbox"),
  mockConditionGroup: document.getElementById("mock-condition-group"),
  mockConditionSelect: document.getElementById("mock-condition-select"),
  resetSettingsBtn: document.getElementById("reset-settings-btn"),
  saveSettingsBtn: document.getElementById("save-settings-btn"),

  // Float Actions
  copyReportBtn: document.getElementById("copy-report-btn"),
  shareWeatherBtn: document.getElementById("share-weather-btn")
};

// Initialize Application
window.addEventListener("DOMContentLoaded", () => {
  setupAppTheme();
  setupSettingsModalState();
  initLeafletMap();
  renderFavoritesSidebar();
  renderRecentsSidebar();

  // Bind UI Events
  bindEvents();

  // Trigger initial fetch
  fetchWeatherDashboard(state.activeCity);

  // Detect online status changes
  window.addEventListener("online", () => showToast("Connection restored. OLTag Weathera is back online!", "success"));
  window.addEventListener("offline", () => showToast("Internet connection lost. Running in local cache mode.", "warning"));
});

// --- Theme & Configuration Setup ---
function setupAppTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  const darkIcon = elements.themeToggle.querySelector(".theme-icon-dark");

  if (state.theme === "light") {
    darkIcon.setAttribute("data-lucide", "sun");
  } else {
    darkIcon.setAttribute("data-lucide", "moon");
  }
  lucide.createIcons();
}

function setupSettingsModalState() {
  // Sync checkbox and key input from state variables
  elements.apiKeyInput.value = state.apiKey === DEFAULT_API_KEY ? "" : state.apiKey;

  // If key is default, demoMode must be true
  if (state.apiKey === DEFAULT_API_KEY) {
    state.demoMode = true;
    localStorage.setItem("oltag_weathera_demo_mode", "true");
  }

  elements.demoModeCheckbox.checked = state.demoMode;
  elements.mockConditionGroup.style.display = state.demoMode ? "flex" : "none";
}

// --- Map Initialization ---
function initLeafletMap() {
  // Setup Leaflet map container and tiles
  const zoom = 11;
  const initLat = 48.8566; // Paris coordinates
  const initLon = 2.3522;

  state.leafletMap = L.map("weather-map", {
    zoomControl: true,
    scrollWheelZoom: false
  }).setView([initLat, initLon], zoom);

  // Apply visual theme corresponding map tiles
  updateMapTiles();
}

function updateMapTiles() {
  if (!state.leafletMap) return;

  // Clean existing layers
  state.leafletMap.eachLayer((layer) => {
    state.leafletMap.removeLayer(layer);
  });

  // CartoDB styles match the app visuals perfectly
  const tileUrl = state.theme === "dark"
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  L.tileLayer(tileUrl, {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(state.leafletMap);

  // Re-add marker if active data exists
  if (state.activeWeatherData) {
    const lat = state.activeWeatherData.coord.lat;
    const lon = state.activeWeatherData.coord.lon;
    addMapMarker(lat, lon, state.activeWeatherData.name);
    addWeatherLayers(lat, lon);
  }
}

function addMapMarker(lat, lon, cityName) {
  if (!state.leafletMap) return;

  if (state.leafletMarker) {
    state.leafletMarker.setLatLng([lat, lon]);
  } else {
    // Beautiful custom pulsing marker pin
    const customIcon = L.divIcon({
      className: 'custom-pulsing-marker',
      html: `<div style="
        width: 16px; 
        height: 16px; 
        background: var(--accent-color); 
        border: 3px solid #ffffff; 
        border-radius: 50%;
        box-shadow: 0 0 10px var(--accent-glow);
        position: relative;
      "><div style="
        position: absolute;
        width: 32px;
        height: 32px;
        background: var(--accent-glow);
        border-radius: 50%;
        top: -11px;
        left: -11px;
        z-index: -1;
        animation: pulse 2s infinite ease-in-out;
      "></div></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    state.leafletMarker = L.marker([lat, lon], { icon: customIcon }).addTo(state.leafletMap);
  }

  state.leafletMarker.bindPopup(`<b>${cityName}</b><br>Active Coordinates`).openPopup();
  state.leafletMap.panTo([lat, lon]);
}

function addWeatherLayers(lat, lon) {
  if (!state.leafletMap) return;
  if (state.weatherLayer) {
    state.leafletMap.removeLayer(state.weatherLayer);
  }

  // If not in demo mode, add weather layer from OpenWeatherMap (e.g. precipitation or clouds)
  if (!state.demoMode && state.apiKey !== DEFAULT_API_KEY) {
    const layerType = "precipitation_new";
    const tileUrl = `https://tile.openweathermap.org/map/${layerType}/{z}/{x}/{y}.png?appid=${state.apiKey}`;

    state.weatherLayer = L.tileLayer(tileUrl, {
      maxZoom: 18,
      opacity: 0.5,
      attribution: 'Weather data &copy; <a href="https://openweathermap.org">OpenWeatherMap</a>'
    }).addTo(state.leafletMap);
  }
}

// --- Event Binding ---
function bindEvents() {
  // Search button and Enter key triggers
  elements.searchBtn.addEventListener("click", () => triggerSearch());
  elements.searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") triggerSearch();
  });

  // Clear search field
  elements.searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    elements.clearSearchBtn.style.display = query.length > 0 ? "block" : "none";
    handleAutocomplete(query);
  });

  elements.clearSearchBtn.addEventListener("click", () => {
    elements.searchInput.value = "";
    elements.clearSearchBtn.style.display = "none";
    elements.autocompleteDropdown.classList.remove("active");
    elements.searchInput.focus();
  });

  // Click outside suggestions collapses it
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-container")) {
      elements.autocompleteDropdown.classList.remove("active");
    }
  });

  // Current Location click
  elements.locationBtn.addEventListener("click", () => requestGeolocationWeather());

  // Unit and Theme togglers
  elements.themeToggle.addEventListener("click", () => toggleTheme());
  elements.unitToggle.addEventListener("click", () => toggleUnit());

  // Sidebar item list listeners
  elements.favoritesList.addEventListener("click", (e) => handleSidebarClick(e, "favorites"));
  elements.recentsList.addEventListener("click", (e) => handleSidebarClick(e, "recents"));

  // Bookmark button
  elements.favoriteBtn.addEventListener("click", () => toggleFavoriteActiveCity());

  // Modals & Settings events
  elements.settingsModalBtn.addEventListener("click", () => openSettingsModal());
  elements.closeModalBtn.addEventListener("click", () => closeSettingsModal());
  elements.settingsModal.addEventListener("click", (e) => {
    if (e.target === elements.settingsModal) closeSettingsModal();
  });

  elements.demoModeCheckbox.addEventListener("change", (e) => {
    elements.mockConditionGroup.style.display = e.target.checked ? "flex" : "none";
  });

  elements.saveSettingsBtn.addEventListener("click", () => saveSettings());
  elements.resetSettingsBtn.addEventListener("click", () => resetSettings());

  // Quick Actions (Copy & Share)
  elements.copyReportBtn.addEventListener("click", () => copyWeatherReport());
  elements.shareWeatherBtn.addEventListener("click", () => shareWeatherDetails());
}

// --- Autocomplete Handling ---
function handleAutocomplete(query) {
  if (query.length < 2) {
    elements.autocompleteDropdown.classList.remove("active");
    return;
  }

  // Filter popular cities and search history
  const combinedList = Array.from(new Set([...state.recents, ...POPULAR_CITIES]));
  const matched = combinedList.filter(city =>
    city.toLowerCase().startsWith(query.toLowerCase())
  ).slice(0, 5); // limit 5 suggestions

  if (matched.length === 0) {
    elements.autocompleteDropdown.classList.remove("active");
    return;
  }

  elements.autocompleteDropdown.innerHTML = matched.map(city => `
    <div class="autocomplete-item" role="option" data-city="${city}">
      <i data-lucide="map-pin" style="width: 14px; height: 14px;"></i>
      <span>${city}</span>
    </div>
  `).join("");

  lucide.createIcons();
  elements.autocompleteDropdown.classList.add("active");

  // Add listeners to elements
  document.querySelectorAll(".autocomplete-item").forEach(item => {
    item.addEventListener("click", () => {
      const selected = item.getAttribute("data-city");
      elements.searchInput.value = selected;
      elements.autocompleteDropdown.classList.remove("active");
      triggerSearch();
    });
  });
}

// --- Search Trigger ---
function triggerSearch() {
  const cityQuery = elements.searchInput.value.trim();
  if (cityQuery === "") {
    showToast("Please enter a city name to search.", "warning");
    return;
  }

  elements.autocompleteDropdown.classList.remove("active");
  fetchWeatherDashboard(cityQuery);
}

// --- Geolocation Request ---
function requestGeolocationWeather() {
  if (!navigator.geolocation) {
    showToast("Geolocation is not supported by your browser.", "error");
    return;
  }

  showLoader(true);
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        if (state.demoMode) {
          // In demo mode, load customized coords but keep names simulated
          showToast(`Resolved Geolocation: Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}. Simulating local weather.`, "info");
          const localMockData = generateSimulatedWeatherData("My Location", lat, lon);
          updateStateAndRender(localMockData.weather, localMockData.forecast, localMockData.aqi);
        } else {
          // Live API resolver
          const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${state.apiKey}`);
          if (!response.ok) throw new Error("Location coordinates unresolved by OpenWeatherMap.");
          const weatherData = await response.json();
          await fetchWeatherDashboard(weatherData.name);
        }
      } catch (err) {
        showToast(err.message, "error");
        showLoader(false);
      }
    },
    (error) => {
      showLoader(false);
      let errMsg = "Access to device location denied.";
      if (error.code === error.POSITION_UNAVAILABLE) errMsg = "Location information is unavailable.";
      if (error.code === error.TIMEOUT) errMsg = "Location request timed out.";
      showToast(errMsg, "error");
    }
  );
}

// --- API / Fetch Weather Core Orchestrator ---
async function fetchWeatherDashboard(cityName) {
  showLoader(true);
  hideErrorState();

  // Save search city in state
  state.activeCity = cityName;
  localStorage.setItem("oltag_weathera_last_city", cityName);

  // Toggle layout loaders
  toggleSkeletonLoader(true);

  try {
    if (state.demoMode) {
      // Load realistic mockup data after slight delay to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockData = generateSimulatedWeatherData(cityName);
      updateStateAndRender(mockData.weather, mockData.forecast, mockData.aqi);

      // Add to Recents
      addToRecents(cityName);
      showLoader(false);
      showToast(`Loaded ${cityName} weather details in Demo Mode.`, "info");
    } else {
      // Check online status
      if (!navigator.onLine) {
        throw new Error("offline");
      }

      if (state.apiKey === DEFAULT_API_KEY || state.apiKey.trim() === "") {
        throw new Error("invalid_key");
      }

      // Fetch Live APIs
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&appid=${state.apiKey}`;
      const weatherRes = await fetch(weatherUrl);

      if (weatherRes.status === 401) throw new Error("invalid_key");
      if (weatherRes.status === 404) throw new Error("city_not_found");
      if (!weatherRes.ok) throw new Error("generic_api_error");

      const weatherData = await weatherRes.json();
      const { lat, lon } = weatherData.coord;

      // Concurrent fetching for Forecast and AQI
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&units=metric&appid=${state.apiKey}`;
      const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${state.apiKey}`;

      const [forecastRes, aqiRes] = await Promise.all([
        fetch(forecastUrl),
        fetch(aqiUrl)
      ]);

      const forecastData = forecastRes.ok ? await forecastRes.json() : null;
      const aqiData = aqiRes.ok ? await aqiRes.json() : null;

      updateStateAndRender(weatherData, forecastData, aqiData);
      addToRecents(cityName);
      showLoader(false);
    }
  } catch (err) {
    showLoader(false);
    toggleSkeletonLoader(false);

    if (err.message === "offline") {
      showErrorState(
        "cloud-off",
        "Connection Offline",
        "It seems you are not connected to the internet. Enable internet connection or toggle Demo Mode in settings to continue."
      );
    } else if (err.message === "invalid_key") {
      showErrorState(
        "key-round",
        "Invalid API Key",
        "The OpenWeatherMap API key provided is missing or invalid. Please add a valid key in settings or toggle Demo Mode."
      );
      openSettingsModal();
    } else if (err.message === "city_not_found") {
      showErrorState(
        "search-slash",
        "City Not Found",
        `We couldn't locate "${cityName}". Check the spelling or search for a larger nearby city.`
      );
    } else {
      showErrorState(
        "alert-circle",
        "Server Request Failed",
        "An unexpected error occurred while communicating with the weather services. Please check back later."
      );
    }
  }
}

// Update App State & Trigger Visual Re-renders
function updateStateAndRender(weather, forecast, aqi) {
  state.activeWeatherData = weather;
  state.activeForecastData = forecast;
  state.activeAqiData = aqi;

  // Render views
  toggleSkeletonLoader(false);
  renderWeatherHeroCard();
  renderSunriseSunsetArc();
  renderHourlyForecast();
  renderFiveDayForecast();
  renderDetailsGrid();

  // Update map visual
  if (state.leafletMap) {
    addMapMarker(weather.coord.lat, weather.coord.lon, weather.name);
    addWeatherLayers(weather.coord.lat, weather.coord.lon);
  }

  // Sync favorites button
  updateFavoriteBtnState();
}

// --- UI Skeleton & Loader Toggles ---
function showLoader(visible) {
  if (visible) {
    elements.pageLoader.classList.add("active");
    elements.pageLoader.setAttribute("aria-hidden", "false");
  } else {
    elements.pageLoader.classList.remove("active");
    elements.pageLoader.setAttribute("aria-hidden", "true");
  }
}

function toggleSkeletonLoader(show) {
  if (show) {
    elements.dashboardSkeleton.style.display = "block";
    elements.weatherDashboardView.style.display = "none";
  } else {
    elements.dashboardSkeleton.style.display = "none";
    elements.weatherDashboardView.style.display = "block";
  }
}

function showErrorState(iconName, title, desc) {
  elements.weatherDashboardView.style.display = "none";
  elements.errorCard.style.display = "flex";
  elements.errorIcon.innerHTML = `<i data-lucide="${iconName}" style="width: 50px; height: 50px;"></i>`;
  elements.errorTitle.textContent = title;
  elements.errorDesc.textContent = desc;

  lucide.createIcons();
}

function hideErrorState() {
  elements.errorCard.style.display = "none";
}

// --- Settings Dialog management ---
function openSettingsModal() {
  setupSettingsModalState();
  elements.settingsModal.classList.add("active");
  elements.settingsModal.setAttribute("aria-hidden", "false");
}

function closeSettingsModal() {
  elements.settingsModal.classList.remove("active");
  elements.settingsModal.setAttribute("aria-hidden", "true");
}

function saveSettings() {
  const enteredKey = elements.apiKeyInput.value.trim();
  const demoModeChecked = elements.demoModeCheckbox.checked;

  if (!demoModeChecked && enteredKey === "") {
    showToast("API Key is required to disable Demo Mode.", "warning");
    return;
  }

  state.apiKey = enteredKey === "" ? DEFAULT_API_KEY : enteredKey;
  state.demoMode = demoModeChecked;

  localStorage.setItem("oltag_weathera_api_key", state.apiKey);
  localStorage.setItem("oltag_weathera_demo_mode", state.demoMode ? "true" : "false");

  closeSettingsModal();
  showToast("Settings saved successfully.", "success");

  // Refetch data based on new settings
  fetchWeatherDashboard(state.activeCity);
}

function resetSettings() {
  localStorage.removeItem("oltag_weathera_api_key");
  localStorage.setItem("oltag_weathera_demo_mode", "true");
  localStorage.removeItem("oltag_weathera_favorites");
  localStorage.removeItem("oltag_weathera_recents");
  localStorage.removeItem("oltag_weathera_last_city");

  state.apiKey = DEFAULT_API_KEY;
  state.demoMode = true;
  state.favorites = ["London", "Tokyo", "New York"];
  state.recents = ["Paris", "Sydney", "Rome"];
  state.activeCity = "Paris";

  closeSettingsModal();
  showToast("Application cache reset to defaults.", "info");

  // Reinitialize lists and refetch
  renderFavoritesSidebar();
  renderRecentsSidebar();
  setupSettingsModalState();
  fetchWeatherDashboard("Paris");
}

// --- Unit & Theme Toggles ---
function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("oltag_weathera_theme", state.theme);
  setupAppTheme();
  updateMapTiles();
  showToast(`Switched to ${state.theme} mode.`, "info");
}

function toggleUnit() {
  state.unit = state.unit === "C" ? "F" : "C";
  localStorage.setItem("oltag_weathera_unit", state.unit);
  elements.unitToggle.textContent = `°${state.unit}`;

  // Re-render weather outputs affected by units
  renderWeatherHeroCard();
  renderHourlyForecast();
  renderFiveDayForecast();
  renderDetailsGrid();

  showToast(`Switched units to °${state.unit}.`, "info");
}

// Temperature conversions helper
function formatTemp(tempC) {
  if (state.unit === "F") {
    return Math.round((tempC * 9 / 5) + 32);
  }
  return Math.round(tempC);
}

// --- Custom Toast System ---
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let iconName = "info";
  if (type === "success") iconName = "check-circle";
  if (type === "warning") iconName = "alert-triangle";
  if (type === "error") iconName = "alert-circle";

  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width: 18px; height: 18px;"></i>
    <span class="toast-message">${message}</span>
  `;

  elements.toastContainer.appendChild(toast);
  lucide.createIcons();

  // Force browser layout repaint
  toast.offsetHeight;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- Render Main Weather Hero Card ---
function renderWeatherHeroCard() {
  const w = state.activeWeatherData;
  if (!w) return;

  elements.cityName.textContent = `${w.name}, ${w.sys.country}`;

  // Get date in target timezone or localized format
  const dateOptions = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
  elements.currentDatetime.textContent = new Date().toLocaleDateString('en-US', dateOptions);

  // Values
  elements.tempValue.textContent = formatTemp(w.main.temp);
  elements.tempUnitLabel.textContent = `°${state.unit}`;
  elements.weatherConditionTxt.textContent = w.weather[0].main;
  elements.weatherDescTxt.textContent = w.weather[0].description;

  elements.feelsLikeVal.textContent = `${formatTemp(w.main.feels_like)}°${state.unit}`;

  // Local Time Calculation
  const localTime = getLocalTime(w.timezone);
  elements.localTimeVal.textContent = localTime;

  // Dynamic Background Updates
  updateDynamicBackground(w.weather[0].main, w.sys.sunrise, w.sys.sunset, w.timezone);

  // Icons loader
  // Standard OpenWeatherMap icons have flat styling, let's load them, but support fallback visual colors.
  const iconCode = w.weather[0].icon;
  elements.weatherIconImg.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  elements.weatherIconImg.alt = w.weather[0].description;

  // Alert Status
  // Standard free weather API doesn't support alerts, but we can simulate alert status for extreme elements (wind > 50km/h, temp > 40C, etc.)
  if (w.wind.speed > 13.8 || w.main.temp > 40 || w.main.temp < -10) {
    elements.weatherAlertBadge.style.display = "flex";
  } else {
    elements.weatherAlertBadge.style.display = "none";
  }
}

// Local Time Helper using timezone offset
function getLocalTime(timezoneOffsetSeconds) {
  const localDate = new Date();
  const utcTime = localDate.getTime() + (localDate.getTimezoneOffset() * 60000);
  const targetDate = new Date(utcTime + (timezoneOffsetSeconds * 1000));

  return targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- Sunrise/Sunset Arc Visualization Renderer ---
function renderSunriseSunsetArc() {
  const w = state.activeWeatherData;
  if (!w) return;

  const sunrise = w.sys.sunrise;
  const sunset = w.sys.sunset;
  const now = Math.floor(Date.now() / 1000) + w.timezone - (new Date().getTimezoneOffset() * 60); // approximate local epoch

  // Format visual times
  const formatTime = (epoch, offset) => {
    const utcDate = new Date((epoch) * 1000);
    return utcDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  elements.sunriseTimeVal.textContent = formatTime(sunrise, w.timezone);
  elements.sunsetTimeVal.textContent = formatTime(sunset, w.timezone);

  const totalDaylightSeconds = sunset - sunrise;
  const currentElapsedSeconds = now - sunrise;

  let percentage = 0; // Sun position
  let pathActiveDash = 0;
  const pathTotalLength = 350; // Approximated path arc length

  if (now > sunset) {
    percentage = 1;
    elements.sunRemaining.textContent = "Sunset occurred. Day is over.";
    pathActiveDash = pathTotalLength;
  } else if (now < sunrise) {
    percentage = 0;
    elements.sunRemaining.textContent = "Before sunrise.";
    pathActiveDash = 0;
  } else {
    percentage = currentElapsedSeconds / totalDaylightSeconds;
    const hoursLeft = Math.max(0, ((sunset - now) / 3600).toFixed(1));
    elements.sunRemaining.textContent = `${hoursLeft} hours of daylight remaining`;
    pathActiveDash = Math.round(percentage * pathTotalLength);
  }

  // Set dash array to represent progress color on the SVG
  elements.sunPathActive.style.strokeDasharray = `${pathActiveDash} ${pathTotalLength}`;

  // Calculate X and Y coordinates along the elliptical arc for the sun pointer placement
  // Path bounding is: Width = 220, Height = 80, Margin = 10 (horizontal span from X=10 to X=230)
  // Arc center: X = 120, Y = 90
  const angleRad = Math.PI - (percentage * Math.PI); // goes from PI down to 0
  const sunX = 120 + 110 * Math.cos(angleRad);
  const sunY = 90 - 80 * Math.sin(angleRad);

  // Shift pointer
  elements.sunPointer.setAttribute("transform", `translate(${sunX}, ${sunY})`);
}

// --- Hourly Forecast Renderer ---
function renderHourlyForecast() {
  const container = elements.hourlyScrollContainer;
  container.innerHTML = "";

  const f = state.activeForecastData;
  if (!f) {
    container.innerHTML = `<div class="empty-list-msg">No hourly data available.</div>`;
    return;
  }

  // Limit to first 8 predictions (24 hours)
  const hourlyData = f.list.slice(0, 8);

  hourlyData.forEach(item => {
    const time = new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const temp = formatTemp(item.main.temp);
    const windSpeed = Math.round(item.wind.speed * 3.6); // m/s to km/h
    const windDeg = item.wind.deg;
    const icon = item.weather[0].icon;

    const card = document.createElement("div");
    card.className = "hourly-card";
    card.innerHTML = `
      <span class="hourly-time">${time}</span>
      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${item.weather[0].main}" class="hourly-icon">
      <span class="hourly-temp">${temp}°</span>
      <div class="hourly-wind">
        <span class="hourly-wind-arrow" style="transform: rotate(${windDeg}deg);">↓</span>
        <span>${windSpeed} km/h</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// --- 5-Day Forecast Renderer ---
function renderFiveDayForecast() {
  const container = elements.forecastList;
  container.innerHTML = "";

  const f = state.activeForecastData;
  if (!f) {
    container.innerHTML = `<div class="empty-list-msg">No forecast data available.</div>`;
    return;
  }

  // Group forecast by day name (excluding today if possible)
  const daysForecast = {};

  f.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

    if (!daysForecast[dayName]) {
      daysForecast[dayName] = {
        temps: [],
        conditions: [],
        icons: [],
        descriptions: []
      };
    }

    daysForecast[dayName].temps.push(item.main.temp);
    daysForecast[dayName].conditions.push(item.weather[0].main);
    daysForecast[dayName].icons.push(item.weather[0].icon);
    daysForecast[dayName].descriptions.push(item.weather[0].description);
  });

  // Pick the most common elements or first one for prediction
  const dayKeys = Object.keys(daysForecast).slice(0, 5); // next 5 days

  dayKeys.forEach(day => {
    const data = daysForecast[day];
    const maxTemp = formatTemp(Math.max(...data.temps));
    const minTemp = formatTemp(Math.min(...data.temps));

    // Fetch modal condition icon (replace 'n' with 'd' for daytime visual layout consistency)
    const icon = data.icons[0].replace('n', 'd');
    const condition = data.conditions[0];

    // Approximate progress bar parameters (assuming scale from 0 to 40 C)
    const minScale = -10;
    const maxScale = 45;
    const range = maxScale - minScale;

    const minVal = Math.min(...data.temps);
    const maxVal = Math.max(...data.temps);
    const fillLeft = ((minVal - minScale) / range) * 100;
    const fillWidth = ((maxVal - minVal) / range) * 100;

    const forecastItem = document.createElement("div");
    forecastItem.className = "forecast-item";
    forecastItem.innerHTML = `
      <span class="forecast-day">${day}</span>
      <div class="forecast-condition-wrapper">
        <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}.png" alt="${condition}">
        <span class="forecast-condition-text">${condition}</span>
      </div>
      <div class="forecast-temps">
        <span class="forecast-min">${minTemp}°</span>
        <span class="forecast-max">${maxTemp}°</span>
      </div>
      <div class="forecast-bar-container">
        <div class="forecast-bar-fill" style="margin-left: ${fillLeft}%; width: ${fillWidth}%;"></div>
      </div>
    `;
    container.appendChild(forecastItem);
  });
}

// --- Details Grid Widgets Renderers ---
function renderDetailsGrid() {
  const w = state.activeWeatherData;
  const aqi = state.activeAqiData;
  if (!w) return;

  // 1. Air Quality Index Card
  if (aqi && aqi.list && aqi.list.length > 0) {
    const aqiVal = aqi.list[0].main.aqi; // Scale 1 to 5
    const pm25 = Math.round(aqi.list[0].components.pm2_5);
    const pm10 = Math.round(aqi.list[0].components.pm10);
    const co = Math.round(aqi.list[0].components.co);
    const no2 = Math.round(aqi.list[0].components.no2);

    const aqiTexts = {
      1: { label: "1 - Excellent", color: "var(--success-color)", fillWidth: "20%" },
      2: { label: "2 - Fair", color: "#84cc16", fillWidth: "40%" },
      3: { label: "3 - Moderate", color: "var(--warning-color)", fillWidth: "60%" },
      4: { label: "4 - Poor", color: "#f97316", fillWidth: "80%" },
      5: { label: "5 - Very Poor", color: "var(--danger-color)", fillWidth: "100%" }
    };

    const matchedAqi = aqiTexts[aqiVal] || { label: "Unknown", color: "var(--text-muted)", fillWidth: "0%" };
    elements.aqiLabelVal.textContent = matchedAqi.label;
    elements.aqiLabelVal.style.color = matchedAqi.color;
    elements.aqiBarFill.style.width = matchedAqi.fillWidth;
    elements.aqiBarFill.style.backgroundColor = matchedAqi.color;

    elements.aqiPm25.textContent = pm25;
    elements.aqiPm10.textContent = pm10;
    elements.aqiCo.textContent = co;
    elements.aqiNo2.textContent = no2;
  } else {
    elements.aqiLabelVal.textContent = "N/A";
    elements.aqiBarFill.style.width = "0%";
  }

  // 2. UV Index Widget (Simulated or mock-derived since OWM current weather does not have it, OneCall does)
  // We compute index value based on sunshine conditions and lat coordinates
  let uvVal = 0;
  if (state.demoMode) {
    const hours = new Date().getHours();
    if (hours > 6 && hours < 18) {
      const mockCondition = elements.mockConditionSelect.value;
      const baseUv = mockCondition === "Clear" ? 8 : (mockCondition === "Clouds" ? 3 : 1);
      uvVal = Math.round(baseUv * Math.sin((hours - 6) / 12 * Math.PI));
    }
  } else {
    // Generate approximate UV index for live cities based on latitude and current hour
    const latAbs = Math.abs(w.coord.lat);
    const hour = new Date().getHours();
    if (hour > 5 && hour < 19) {
      const sunElevation = Math.sin((hour - 5) / 13 * Math.PI);
      const isCloudy = w.clouds.all > 50;
      const base = latAbs < 20 ? 11 : (latAbs < 40 ? 8 : 4);
      uvVal = Math.max(0, Math.round(base * sunElevation * (isCloudy ? 0.4 : 1.0)));
    }
  }

  elements.uvValue.textContent = uvVal;

  // SVGs fill calculation. Path length is 126 (diameter arc)
  // Max scale is 12 (extreme)
  const maxUv = 12;
  const dashOffset = 126 - ((Math.min(uvVal, maxUv) / maxUv) * 126);
  elements.uvGaugeFill.style.strokeDashoffset = dashOffset;

  let uvLvl = "Low";
  let uvColor = "var(--success-color)";
  if (uvVal >= 3 && uvVal <= 5) { uvLvl = "Moderate"; uvColor = "var(--warning-color)"; }
  else if (uvVal >= 6 && uvVal <= 7) { uvLvl = "High"; uvColor = "#f97316"; }
  else if (uvVal >= 8 && uvVal <= 10) { uvLvl = "Very High"; uvColor = "var(--danger-color)"; }
  else if (uvVal >= 11) { uvLvl = "Extreme Exposure"; uvColor = "#a855f7"; }

  elements.uvGaugeFill.style.stroke = uvColor;
  elements.uvLevelTxt.textContent = uvLvl;
  elements.uvLevelTxt.style.color = uvColor;

  // 3. Wind speed & direction
  const speedKmh = Math.round(w.wind.speed * 3.6);
  elements.windSpeedVal.textContent = `${speedKmh} km/h`;
  elements.compassNeedle.style.transform = `rotate(${w.wind.deg}deg)`;

  const windDirText = getWindDirectionText(w.wind.deg);
  elements.windDirVal.textContent = `${windDirText} (${w.wind.deg}°)`;

  if (w.wind.gust) {
    elements.windGustVal.textContent = `Gusts up to ${Math.round(w.wind.gust * 3.6)} km/h`;
  } else {
    elements.windGustVal.textContent = `Calm breeze, no active gusts`;
  }

  // 4. Humidity widget
  elements.humidityValue.textContent = `${w.main.humidity}%`;
  elements.humidityDropletFill.style.height = `${w.main.humidity}%`;

  // Calculate simple dew point approximation: Td = T - ((100 - RH)/5)
  const tempC = w.main.temp;
  const dewPointC = Math.round(tempC - ((100 - w.main.humidity) / 5));
  elements.dewPointVal.textContent = `Dew point is ${formatTemp(dewPointC)}°${state.unit} right now`;

  // 5. Atmospheric Pressure
  elements.pressureValue.textContent = `${w.main.pressure} hPa`;
  if (w.main.pressure > 1013) {
    elements.pressureFooter.textContent = "High pressure area (Stable)";
  } else if (w.main.pressure < 1013) {
    elements.pressureFooter.textContent = "Low pressure area (Unstable)";
  } else {
    elements.pressureFooter.textContent = "Normal sea-level pressure";
  }

  // 6. Visibility
  const visKm = (w.visibility / 1000).toFixed(1);
  elements.visibilityValue.textContent = `${visKm} km`;
  if (visKm >= 10) {
    elements.visibilityFooter.textContent = "Excellent clear visibility";
  } else if (visKm >= 5) {
    elements.visibilityFooter.textContent = "Light haze or cloud cover";
  } else {
    elements.visibilityFooter.textContent = "Foggy, reduced visibility";
  }
}

// Translate degree to compass letters
function getWindDirectionText(degree) {
  const sectors = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
  const index = Math.round(((degree % 360) / 45)) % 8;
  return sectors[index];
}

// --- Dynamic Background Gradient Updates ---
function updateDynamicBackground(condition, sunrise, sunset, timezone) {
  // Clear all weather-related classes from body
  document.body.classList.remove(
    "weather-sunny", "weather-rain", "weather-thunderstorm",
    "weather-snow", "weather-cloudy", "weather-night", "weather-mist"
  );

  const now = Math.floor(Date.now() / 1000) + timezone - (new Date().getTimezoneOffset() * 60);
  const isNight = now > sunset || now < sunrise;

  let targetClass = "weather-sunny"; // default fallback

  switch (condition.toLowerCase()) {
    case "clear":
      targetClass = isNight ? "weather-night" : "weather-sunny";
      break;
    case "clouds":
      targetClass = isNight ? "weather-night" : "weather-cloudy";
      break;
    case "rain":
    case "drizzle":
      targetClass = "weather-rain";
      break;
    case "thunderstorm":
      targetClass = "weather-thunderstorm";
      break;
    case "snow":
      targetClass = "weather-snow";
      break;
    case "mist":
    case "fog":
    case "haze":
    case "smoke":
    case "dust":
    case "sand":
    case "ash":
    case "squall":
    case "tornado":
      targetClass = "weather-mist";
      break;
    default:
      targetClass = isNight ? "weather-night" : "weather-sunny";
      break;
  }

  document.body.classList.add(targetClass);
}

// --- Favorites Management ---
function renderFavoritesSidebar() {
  const container = elements.favoritesList;
  container.innerHTML = "";

  if (state.favorites.length === 0) {
    container.innerHTML = `<li class="empty-list-msg">No saved locations</li>`;
    return;
  }

  state.favorites.forEach(city => {
    const li = document.createElement("li");
    li.className = "sidebar-item";
    li.setAttribute("data-name", city);
    li.innerHTML = `
      <span class="sidebar-item-name">${city}</span>
      <span class="sidebar-item-temp">--°</span>
      <button class="delete-item-btn" aria-label="Remove ${city} from favorites" data-delete="${city}">
        <i data-lucide="trash" style="width: 14px; height: 14px;"></i>
      </button>
    `;
    container.appendChild(li);

    // Asynchronously update sidebar temp if key exists
    updateSidebarItemTemp(city, li);
  });

  lucide.createIcons();
}

function updateFavoriteBtnState() {
  const isFav = state.favorites.some(city => city.toLowerCase() === state.activeCity.toLowerCase());
  if (isFav) {
    elements.favoriteBtn.classList.add("favorited");
    elements.favoriteBtn.setAttribute("aria-label", "Remove from bookmarks");
  } else {
    elements.favoriteBtn.classList.remove("favorited");
    elements.favoriteBtn.setAttribute("aria-label", "Bookmark this city");
  }
}

function toggleFavoriteActiveCity() {
  const index = state.favorites.findIndex(city => city.toLowerCase() === state.activeCity.toLowerCase());

  if (index >= 0) {
    // Already in favs, delete it
    state.favorites.splice(index, 1);
    showToast(`Removed "${state.activeCity}" from favorites.`, "info");
  } else {
    // Add to favorites
    state.favorites.push(state.activeCity);
    showToast(`Added "${state.activeCity}" to favorites.`, "success");
  }

  localStorage.setItem("oltag_weathera_favorites", JSON.stringify(state.favorites));
  renderFavoritesSidebar();
  updateFavoriteBtnState();
}

// Sidebar list click routers
function handleSidebarClick(e, type) {
  const deleteBtn = e.target.closest(".delete-item-btn");
  if (deleteBtn) {
    e.stopPropagation();
    const cityToDelete = deleteBtn.getAttribute("data-delete");
    if (type === "favorites") {
      state.favorites = state.favorites.filter(c => c !== cityToDelete);
      localStorage.setItem("oltag_weathera_favorites", JSON.stringify(state.favorites));
      renderFavoritesSidebar();
      updateFavoriteBtnState();
    } else {
      state.recents = state.recents.filter(c => c !== cityToDelete);
      localStorage.setItem("oltag_weathera_recents", JSON.stringify(state.recents));
      renderRecentsSidebar();
    }
    return;
  }

  const item = e.target.closest(".sidebar-item");
  if (item) {
    const cityName = item.getAttribute("data-name");
    elements.searchInput.value = cityName;
    fetchWeatherDashboard(cityName);
  }
}

// --- Recent Searches History Manager ---
function renderRecentsSidebar() {
  const container = elements.recentsList;
  container.innerHTML = "";

  if (state.recents.length === 0) {
    container.innerHTML = `<li class="empty-list-msg">Search history is empty</li>`;
    return;
  }

  state.recents.forEach(city => {
    const li = document.createElement("li");
    li.className = "sidebar-item";
    li.setAttribute("data-name", city);
    li.innerHTML = `
      <span class="sidebar-item-name">${city}</span>
      <span class="sidebar-item-temp">--°</span>
      <button class="delete-item-btn" aria-label="Delete ${city} from search history" data-delete="${city}">
        <i data-lucide="x" style="width: 14px; height: 14px;"></i>
      </button>
    `;
    container.appendChild(li);
    updateSidebarItemTemp(city, li);
  });

  lucide.createIcons();
}

function addToRecents(cityName) {
  // Prevent duplicate names
  state.recents = state.recents.filter(city => city.toLowerCase() !== cityName.toLowerCase());
  state.recents.unshift(cityName);

  // Cap at 6 recent searches
  if (state.recents.length > 6) {
    state.recents.pop();
  }

  localStorage.setItem("oltag_weathera_recents", JSON.stringify(state.recents));
  renderRecentsSidebar();
}

// Secondary helper to load temperatures for saved list items dynamically
async function updateSidebarItemTemp(cityName, listItemElement) {
  try {
    let tempVal = null;

    if (state.demoMode) {
      // Simulate static temps quickly
      const hash = cityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      tempVal = 10 + (hash % 20); // 10 to 30 C range
    } else if (state.apiKey !== DEFAULT_API_KEY && state.apiKey.trim() !== "") {
      // Background query to get temp
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&appid=${state.apiKey}`);
      if (res.ok) {
        const data = await res.json();
        tempVal = data.main.temp;
      }
    }

    if (tempVal !== null) {
      const label = listItemElement.querySelector(".sidebar-item-temp");
      if (label) label.textContent = `${formatTemp(tempVal)}°`;
    }
  } catch (err) {
    // Fail silently on background list items
  }
}

// --- Quick Actions: Copy and Share ---
function copyWeatherReport() {
  const w = state.activeWeatherData;
  const aqi = state.activeAqiData;
  if (!w) {
    showToast("No active weather report available to copy.", "warning");
    return;
  }

  const temp = formatTemp(w.main.temp);
  const feelsLike = formatTemp(w.main.feels_like);
  const humidity = w.main.humidity;
  const speed = Math.round(w.wind.speed * 3.6);
  const windDir = getWindDirectionText(w.wind.deg);

  let reportText = `🌤️ OLTag Weathera Weather Report: ${w.name}, ${w.sys.country}\n`;
  reportText += `• Temperature: ${temp}°${state.unit} (Feels like ${feelsLike}°${state.unit})\n`;
  reportText += `• Condition: ${w.weather[0].main} (${w.weather[0].description})\n`;
  reportText += `• Humidity: ${humidity}%\n`;
  reportText += `• Wind: ${speed} km/h ${windDir}\n`;
  reportText += `• Atmospheric Pressure: ${w.main.pressure} hPa\n`;

  if (aqi && aqi.list && aqi.list.length > 0) {
    const aqiLevel = aqi.list[0].main.aqi;
    const labels = ["Excellent", "Fair", "Moderate", "Poor", "Very Poor"];
    reportText += `• Air Quality Index: ${labels[aqiLevel - 1] || "Unknown"}\n`;
  }

  reportText += `• Coordinates: [${w.coord.lat}, ${w.coord.lon}]\n`;
  reportText += `Generated on OLTag Weathera 🚀`;

  navigator.clipboard.writeText(reportText)
    .then(() => showToast("Weather report copied to clipboard!", "success"))
    .catch(() => showToast("Failed to copy report to clipboard.", "error"));
}

function shareWeatherDetails() {
  const w = state.activeWeatherData;
  if (!w) {
    showToast("No active weather data to share.", "warning");
    return;
  }

  const reportSummary = `${w.name} Weather: ${formatTemp(w.main.temp)}°${state.unit}, ${w.weather[0].description}.`;

  if (navigator.share) {
    navigator.share({
      title: `OLTag Weathera Weather - ${w.name}`,
      text: reportSummary,
      url: window.location.href
    })
      .then(() => showToast("Weather report shared successfully!", "success"))
      .catch((err) => {
        if (err.name !== "AbortError") showToast("Error sharing content.", "error");
      });
  } else {
    // Fallback: Copy URL and show notification
    navigator.clipboard.writeText(`${reportSummary} Check more on OLTag Weathera!`)
      .then(() => showToast("Share info copied to clipboard (Web Share API not supported).", "info"))
      .catch(() => showToast("Failed to share weather data.", "error"));
  }
}

// --- Dynamic Simulated Mock Data generator (Demo Mode) ---
function generateSimulatedWeatherData(cityName, customLat, customLon) {
  // Derive seed from city name string value to keep it static/reproducible
  const seed = cityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Custom mock state override from settings
  const chosenCondition = elements.mockConditionSelect.value;

  // Set default coordinates if not provided
  const lat = customLat || (30 + (seed % 30));
  const lon = customLon || (20 + (seed % 100));

  // Generate realistic temperatures based on coordinates/seed
  const baseTempC = 5 + (seed % 28); // 5C to 33C range
  const mainTemp = baseTempC;
  const feelsLike = mainTemp + (chosenCondition === "Rain" ? -2 : 1);
  const humidity = chosenCondition === "Clear" ? 40 + (seed % 15) : (chosenCondition === "Rain" ? 85 + (seed % 10) : 65);
  const pressure = 1000 + (seed % 25);
  const visibility = chosenCondition === "Mist" ? 2000 : (chosenCondition === "Rain" ? 6000 : 10000);

  // Map standard category conditions to OpenWeatherMap icon codes
  const conditionsMap = {
    "Clear": { main: "Clear", desc: "sky is clear", icon: "01" },
    "Rain": { main: "Rain", desc: "moderate rain", icon: "10" },
    "Thunderstorm": { main: "Thunderstorm", desc: "thunderstorm with light rain", icon: "11" },
    "Snow": { main: "Snow", desc: "light snow", icon: "13" },
    "Clouds": { main: "Clouds", desc: "broken clouds", icon: "04" },
    "Mist": { main: "Mist", desc: "foggy mist", icon: "50" }
  };

  const activeCondition = conditionsMap[chosenCondition] || conditionsMap["Clear"];

  // Sunrise & Sunset: Standard daylight span
  const timezone = 3600 * (Math.round(lon / 15)); // timezone offset
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const sunrise = todayStart + (6 * 3600) + (seed % 1200);
  const sunset = todayStart + (18 * 3600) + (seed % 2400);

  const weather = {
    name: cityName,
    coord: { lat, lon },
    sys: { country: seed % 2 === 0 ? "US" : "FR", sunrise, sunset },
    main: {
      temp: mainTemp,
      feels_like: feelsLike,
      humidity,
      pressure,
      temp_min: mainTemp - 3,
      temp_max: mainTemp + 4
    },
    wind: {
      speed: 3 + (seed % 12),
      deg: (seed * 45) % 360,
      gust: 5 + (seed % 20)
    },
    weather: [{
      main: activeCondition.main,
      description: activeCondition.desc,
      icon: `${activeCondition.icon}d`
    }],
    visibility,
    timezone
  };

  // Generate 5-day / 3-hour forecast lists
  const forecastList = [];
  const startEpoch = Math.floor(Date.now() / 1000);

  for (let i = 0; i < 40; i++) {
    const predictionTime = startEpoch + (i * 3 * 3600);
    const dateObj = new Date(predictionTime * 1000);

    // Simulate diurnal temperature cycles
    const hour = dateObj.getHours();
    const isNight = hour < 6 || hour > 18;
    const cycleOffset = Math.sin((hour - 6) / 12 * Math.PI) * 4;
    const intervalTemp = mainTemp + cycleOffset + (i % 2 === 0 ? 1 : -1);

    // Forecast conditions can vary slightly from main condition
    let intervalCondition = activeCondition.main;
    let intervalIcon = activeCondition.icon;

    if (i > 8 && seed % 3 === 0) {
      // introduce variation
      intervalCondition = "Clouds";
      intervalIcon = "03";
    }

    forecastList.push({
      dt: predictionTime,
      main: {
        temp: intervalTemp,
        temp_min: intervalTemp - 2,
        temp_max: intervalTemp + 2,
        pressure: pressure + (i % 3 === 0 ? 1 : -1),
        humidity: humidity + (i % 4 === 0 ? 5 : -5)
      },
      weather: [{
        main: intervalCondition,
        description: "scattered variations",
        icon: `${intervalIcon}${isNight ? 'n' : 'd'}`
      }],
      wind: {
        speed: weather.wind.speed + (i % 2 === 0 ? 1 : -1),
        deg: (weather.wind.deg + (i * 10)) % 360
      }
    });
  }

  const forecast = { list: forecastList };

  // Simulated AQI
  const aqiVal = 1 + (seed % 5); // 1 to 5 index scale
  const aqi = {
    list: [{
      main: { aqi: aqiVal },
      components: {
        pm2_5: 5 + (seed % 35),
        pm10: 10 + (seed % 45),
        co: 200 + (seed % 400),
        no2: 8 + (seed % 25)
      }
    }]
  };

  return { weather, forecast, aqi };
}
