
const searchForm = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const searchButton = document.querySelector("#search-button");
const statusMessage = document.querySelector("#status-message");
const weatherContent = document.querySelector("#weather-content");
const unitSelect = document.querySelector("#temperature-unit");
const gpsButton = document.querySelector("#gps-button");
const temperatureChart = document.querySelector("#temperature-chart");

let lastGpsCoordinates = null;

const weatherTab = document.querySelector("#weather-tab");
const favoritesTab = document.querySelector("#favorites-tab");
const weatherView = document.querySelector("#weather-view");
const favoritesView = document.querySelector("#favorites-view");

const favoritesList = document.querySelector("#favorites-list");
const addFavoriteForm = document.querySelector("#add-favorite-form");
const favoriteCityInput = document.querySelector("#favorite-city-input");
const favoritesStatus = document.querySelector("#favorites-status");

const FAVORITES_KEY = "weather-app-favorites";

let lastSearchedCity = "";

// --------------------
// Status messages
// --------------------

function showStatus(message) {
    statusMessage.textContent = message;
}

function showFavoritesStatus(message) {
    favoritesStatus.textContent = message;
}

// --------------------
// Navigation
// --------------------

function showView(viewName) {
    const showWeather = viewName === "weather";

    weatherView.hidden = !showWeather;
    favoritesView.hidden = showWeather;

    weatherTab.classList.toggle("active", showWeather);
    favoritesTab.classList.toggle("active", !showWeather);

    weatherTab.setAttribute("aria-pressed", String(showWeather));
    favoritesTab.setAttribute("aria-pressed", String(!showWeather));
}

weatherTab.addEventListener("click", () => {
    showView("weather");
});

favoritesTab.addEventListener("click", () => {
    renderFavorites();
    showView("favorites");
});

// --------------------
// Formatting helpers
// --------------------

function formatDate(dateString) {
    return new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long"
    }).format(new Date(dateString));
}

function formatHour(dateString) {
    return dateString.slice(11, 16);
}

function getTemperatureUnit() {
    return unitSelect.value === "fahrenheit" ? "°F" : "°C";
}

// --------------------
// Current weather
// --------------------

function displayCurrentWeather(city, data) {
    const current = data.current;

    const weather = WeatherService.getWeatherInfo(
        current.weather_code,
        current.is_day
    );

    document.querySelector("#city-name").textContent =
        `${city.name}, ${city.country}`;

    document.querySelector("#current-date").textContent =
        formatDate(current.time.slice(0, 10));

    document.querySelector("#current-icon").textContent =
        weather.icon;

    document.querySelector("#current-temperature").textContent =
        `${Math.round(current.temperature_2m)}${getTemperatureUnit()}`;

    document.querySelector("#current-description").textContent =
        weather.description;

    document.querySelector("#feels-like").textContent =
        `Feels like ${Math.round(current.apparent_temperature)}${getTemperatureUnit()}`;

    document.querySelector("#wind-speed").textContent =
        `${Math.round(current.wind_speed_10m)} km/h`;

    document.querySelector("#humidity").textContent =
        `${current.relative_humidity_2m}%`;

    document.querySelector("#precipitation").textContent =
        `${current.precipitation ?? 0} mm`;

    document.body.classList.toggle(
        "night-mode",
        current.is_day === 0
    );
}

// --------------------
// Hourly forecast
// --------------------

function displayHourlyForecast(data) {
    const container = document.querySelector("#hourly-forecast");
    const hourly = data.hourly;

    container.replaceChildren();

    if (!hourly || !hourly.time || hourly.time.length === 0) {
        container.textContent = "Hourly forecast is unavailable.";
        return;
    }

    const currentTime = new Date(data.current.time);
    currentTime.setMinutes(0, 0, 0);

    const startIndex = hourly.time.findIndex(time => {
        return new Date(time).getTime() >= currentTime.getTime();
    });

    if (startIndex === -1) {
        container.textContent = "Hourly forecast is unavailable.";
        return;
    }

    const endIndex = Math.min(
        startIndex + 24,
        hourly.time.length
    );

    for (let i = startIndex; i < endIndex; i++) {
        const weather = WeatherService.getWeatherInfo(
            hourly.weather_code[i]
        );

        const card = document.createElement("article");
        card.className = "hourly-item";

        const time = document.createElement("div");
        time.className = "hourly-time";
        time.textContent = i === startIndex
            ? "Now"
            : formatHour(hourly.time[i]);

        const icon = document.createElement("div");
        icon.className = "hourly-icon";
        icon.textContent = weather.icon;
        icon.title = weather.description;
        icon.setAttribute("aria-hidden", "true");

        const temperature = document.createElement("div");
        temperature.className = "hourly-temperature";
        temperature.textContent =
            `${Math.round(hourly.temperature_2m[i])}${getTemperatureUnit()}`;

        const rain = document.createElement("div");
        rain.className = "hourly-rain";
        rain.textContent =
            `Rain: ${hourly.precipitation_probability?.[i] ?? 0}%`;

        card.append(time, icon, temperature, rain);
        container.appendChild(card);
    }
}


function displayTemperatureChart(data) {
    const hourly = data.hourly;
    temperatureChart.replaceChildren();

    if (!hourly || !hourly.time || !hourly.temperature_2m) {
        temperatureChart.textContent =
            "Temperature forecast is unavailable.";
        return;
    }

    const currentTime = new Date(data.current.time);
    currentTime.setMinutes(0, 0, 0);

    const startIndex = hourly.time.findIndex(time =>
        new Date(time).getTime() >= currentTime.getTime()
    );

    if (startIndex === -1) {
        temperatureChart.textContent =
            "Temperature forecast is unavailable.";
        return;
    }

    const endIndex = Math.min(
        startIndex + 24,
        hourly.time.length
    );

    const times = hourly.time.slice(startIndex, endIndex);
    const temperatures = hourly.temperature_2m.slice(
        startIndex,
        endIndex
    );

    if (temperatures.length < 2) {
        temperatureChart.textContent =
            "Not enough data to draw the chart.";
        return;
    }

    const width = 700;
    const height = 260;
    const left = 45;
    const right = 20;
    const top = 35;
    const bottom = 45;

    const minTemp = Math.min(...temperatures);
    const maxTemp = Math.max(...temperatures);

    // Avoid dividing by zero when all temperatures are equal.
    const range = Math.max(maxTemp - minTemp, 2);
    const paddedMin = minTemp - range * 0.15;
    const paddedMax = maxTemp + range * 0.15;

    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;

    const x = index =>
        left + index * chartWidth / (temperatures.length - 1);

    const y = temperature =>
        top + (paddedMax - temperature) /
        (paddedMax - paddedMin) * chartHeight;

    const svgNS = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute(
        "aria-label",
        "Temperature forecast for the next 24 hours"
    );

    function addSvgElement(tag, attributes, textContent) {
        const element = document.createElementNS(svgNS, tag);

        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });

        if (textContent !== undefined) {
            element.textContent = textContent;
        }

        svg.appendChild(element);
        return element;
    }

    // Draw horizontal grid lines and temperature labels.
    for (let i = 0; i <= 4; i++) {
        const fraction = i / 4;
        const gridY = top + fraction * chartHeight;
        const value = paddedMax -
            fraction * (paddedMax - paddedMin);

        addSvgElement("line", {
            x1: left,
            y1: gridY,
            x2: width - right,
            y2: gridY,
            class: "chart-grid"
        });

        addSvgElement("text", {
            x: left - 8,
            y: gridY + 4,
            "text-anchor": "end",
            class: "chart-label"
        }, `${Math.round(value)}°`);
    }

    // Draw the temperature line.
    const points = temperatures.map((temperature, index) =>
        `${x(index)},${y(temperature)}`
    ).join(" ");

    addSvgElement("polyline", {
        points
    });

    // Draw points and show the temperature every four hours.
    temperatures.forEach((temperature, index) => {
        addSvgElement("circle", {
            cx: x(index),
            cy: y(temperature),
            r: 3,
            class: "chart-point"
        });

        if (index % 4 === 0 || index === temperatures.length - 1) {
            addSvgElement("text", {
                x: x(index),
                y: y(temperature) - 10,
                class: "chart-temperature"
            }, `${Math.round(temperature)}°`);

            addSvgElement("text", {
                x: x(index),
                y: height - 18,
                "text-anchor": "middle",
                class: "chart-label"
            }, times[index].slice(11, 16));
        }
    });

    temperatureChart.appendChild(svg);
}


// --------------------
// Daily forecast
// --------------------

function displayDailyForecast(data) {
    const container = document.querySelector("#daily-forecast");
    const daily = data.daily;

    container.replaceChildren();

    if (!daily || !daily.time || daily.time.length === 0) {
        container.textContent = "Daily forecast is unavailable.";
        return;
    }

    for (let i = 0; i < daily.time.length; i++) {
        const weather = WeatherService.getWeatherInfo(
            daily.weather_code[i],
            1
        );

        const card = document.createElement("article");
        card.className = "daily-item";

        const date = document.createElement("div");
        date.className = "daily-date";
        date.textContent = i === 0
            ? "Today"
            : new Intl.DateTimeFormat("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                timeZone: "UTC"
            }).format(new Date(`${daily.time[i]}T12:00:00Z`));

        const icon = document.createElement("div");
        icon.className = "daily-icon";
        icon.textContent = weather.icon;
        icon.title = weather.description;
        icon.setAttribute("aria-hidden", "true");

        const description = document.createElement("div");
        description.className = "daily-description";
        description.textContent = weather.description;

        const temperatures = document.createElement("div");
        temperatures.className = "daily-temperatures";

        const maxTemperature = document.createElement("span");
        maxTemperature.className = "daily-max";
        maxTemperature.textContent =
            `${Math.round(daily.temperature_2m_max[i])}${getTemperatureUnit()}`;

        const minTemperature = document.createElement("span");
        minTemperature.className = "daily-min";
        minTemperature.textContent =
            `${Math.round(daily.temperature_2m_min[i])}${getTemperatureUnit()}`;

        temperatures.append(maxTemperature, minTemperature);
        card.append(date, icon, description, temperatures);
        container.appendChild(card);
    }
}

// --------------------
// Load weather
// --------------------

async function loadWeather(cityName) {
    searchButton.disabled = true;
    weatherContent.hidden = true;
    showStatus("Loading weather data...");

    try {
        const city = await WeatherService.searchCity(cityName);

        const data = await WeatherService.getForecast(
            city.latitude,
            city.longitude,
            unitSelect.value
        );

        // Keep the search term so changing units can reload the same city.
        lastSearchedCity = cityName;

        displayCurrentWeather(city, data);
        displayHourlyForecast(data);
        displayDailyForecast(data);
        displayTemperatureChart(data);

        weatherContent.hidden = false;
        showStatus(`Weather loaded for ${city.name}.`);
    } catch (error) {
        console.error("Unable to load weather:", error);
        showStatus(error.message || "Something went wrong. Please try again.");
    } finally {
        searchButton.disabled = false;
    }
}

searchForm.addEventListener("submit", event => {
    event.preventDefault();

    const cityName = cityInput.value.trim();

    if (!cityName) {
        showStatus("Please enter a city name.");
        return;
    }

    showView("weather");
    loadWeather(cityName);
    lastGpsCoordinates = null;
});

unitSelect.addEventListener("change", () => {
    if (lastGpsCoordinates) {
        loadGpsWeather(
            lastGpsCoordinates.latitude,
            lastGpsCoordinates.longitude
        );

    } else if (lastSearchedCity) {
        loadWeather(lastSearchedCity);
    }
});

// --------------------
// Favorites storage
// --------------------

function getFavorites() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(FAVORITES_KEY) || "[]"
        );

        return Array.isArray(saved)
            ? saved.filter(city => typeof city === "string")
            : [];
    } catch (error) {
        console.error("Unable to read favorites:", error);
        return [];
    }
}

function saveFavorites(favorites) {
    localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(favorites)
    );
}

// --------------------
// Display favorites
// --------------------

function renderFavorites() {
    const favorites = getFavorites();
    favoritesList.replaceChildren();

    if (favorites.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent =
            "You have no favorite cities yet. Add one below.";
        favoritesList.appendChild(emptyMessage);
        return;
    }

    favorites.forEach((cityName, index) => {
        const item = document.createElement("article");
        item.className = "favorite-item";

        const cityButton = document.createElement("button");
        cityButton.type = "button";
        cityButton.className = "favorite-city-button";
        cityButton.textContent = cityName;
        cityButton.title = `Show weather for ${cityName}`;

        cityButton.addEventListener("click", () => {
            cityInput.value = cityName;
            showView("weather");
            loadWeather(cityName);
        });

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "favorite-edit-button";
        editButton.textContent = "Edit";
        editButton.setAttribute(
            "aria-label",
            `Edit ${cityName}`
        );

        editButton.addEventListener("click", () => {
            const newName = prompt(
                "Enter the new city name:",
                cityName
            );

            if (newName === null) {
                return;
            }

            const trimmedName = newName.trim();

            if (!trimmedName) {
                showFavoritesStatus("City name cannot be empty.");
                return;
            }

            const duplicate = getFavorites().some(
                (name, otherIndex) =>
                    otherIndex !== index &&
                    name.toLowerCase() === trimmedName.toLowerCase()
            );

            if (duplicate) {
                showFavoritesStatus(
                    "That city is already in your favorites."
                );
                return;
            }

            const updatedFavorites = getFavorites();
            updatedFavorites[index] = trimmedName;

            saveFavorites(updatedFavorites);
            renderFavorites();
            showFavoritesStatus("Favorite city updated.");
        });

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "favorite-remove-button";
        removeButton.textContent = "Remove";
        removeButton.setAttribute(
            "aria-label",
            `Remove ${cityName} from favorites`
        );

        removeButton.addEventListener("click", () => {
            const confirmed = confirm(
                `Remove ${cityName} from your favorites?`
            );

            if (!confirmed) {
                return;
            }

            const updatedFavorites = getFavorites().filter(
                (_, otherIndex) => otherIndex !== index
            );

            saveFavorites(updatedFavorites);
            renderFavorites();
            showFavoritesStatus(`${cityName} removed from favorites.`);
        });

        item.append(cityButton, editButton, removeButton);
        favoritesList.appendChild(item);
    });
}

// --------------------
// Add a favorite
// --------------------

addFavoriteForm.addEventListener("submit", event => {
    event.preventDefault();

    const cityName = favoriteCityInput.value.trim();

    if (!cityName) {
        showFavoritesStatus("Please enter a city name.");
        return;
    }

    const favorites = getFavorites();

    const alreadyExists = favorites.some(
        name => name.toLowerCase() === cityName.toLowerCase()
    );

    if (alreadyExists) {
        showFavoritesStatus("That city is already in your favorites.");
        return;
    }

    favorites.push(cityName);
    saveFavorites(favorites);

    favoriteCityInput.value = "";
    renderFavorites();
    showFavoritesStatus(`${cityName} added to favorites.`);
});


// --------------------
// GPS
// --------------------

async function loadGpsWeather(latitude, longitude) {
    gpsButton.disabled = true;
    weatherContent.hidden = true;
    showStatus("Loading weather for your location...");

    try {
        const data = await WeatherService.getForecast(
            latitude,
            longitude,
            unitSelect.value
        );

        lastGpsCoordinates = { latitude, longitude };
        lastSearchedCity = "";

        const city = {
            name: "Your location",
            country: "GPS"
        };

        displayCurrentWeather(city, data);
        displayHourlyForecast(data);
        displayTemperatureChart(data);
        displayDailyForecast(data);

        weatherContent.hidden = false;
        showStatus("Weather loaded for your current location.");
    } catch (error) {
        console.error("Unable to load GPS weather:", error);
        showStatus(
            error.message ||
            "Unable to load weather for your location."
        );
    } finally {
        gpsButton.disabled = false;
    }
}

gpsButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
        showStatus("Geolocation is not supported by your browser.");
        return;
    }

    gpsButton.disabled = true;
    showStatus("Getting your location...");

    navigator.geolocation.getCurrentPosition(
        position => {
            loadGpsWeather(
                position.coords.latitude,
                position.coords.longitude
            );
        },
        error => {
            gpsButton.disabled = false;

            if (error.code === error.PERMISSION_DENIED) {
                showStatus(
                    "Location permission was denied. Allow location access in your browser settings."
                );
            } else if (error.code === error.TIMEOUT) {
                showStatus(
                    "Getting your location timed out. Please try again."
                );
            } else {
                showStatus(
                    "Unable to determine your location. Please try again."
                );
            }
        },
        {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 300000
        }
    );
});


// Show the initial view and saved favorites.
showView("weather");
renderFavorites();
