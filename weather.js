
const WeatherService = (() => {
    const GEOCODING_URL =
        "https://geocoding-api.open-meteo.com/v1/search";

    const FORECAST_URL =
        "https://api.open-meteo.com/v1/forecast";

    /**
     * Search for a city by name.
     * Returns the first matching location.
     */
    async function searchCity(cityName) {
        const url = new URL(GEOCODING_URL);

        url.search = new URLSearchParams({
            name: cityName,
            count: "1",
            language: "en",
            format: "json"
        });

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                "Unable to search for the city. Please try again."
            );
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            throw new Error(
                "City not found. Please check the spelling and try again."
            );
        }

        const city = data.results[0];

        return {
            name: city.name,
            country: city.country || "Unknown country",
            latitude: city.latitude,
            longitude: city.longitude
        };
    }

    /**
     * Get current weather and hourly forecast for a location.
     */
    async function getForecast(latitude, longitude, unit = "celsius") {
        const url = new URL(FORECAST_URL);

        url.search = new URLSearchParams({
            latitude: latitude,
            longitude: longitude,

            current: [
                "temperature_2m",
                "relative_humidity_2m",
                "apparent_temperature",
                "is_day",
                "precipitation",
                "weather_code",
                "wind_speed_10m"
            ].join(","),

            hourly: [
                "temperature_2m",
                "precipitation_probability",
                "weather_code"
            ].join(","),

            daily: [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min"
            ].join(","),

            forecast_days: "7",
            timezone: "auto",
            temperature_unit: unit,
            wind_speed_unit: "kmh"
        });

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                "Unable to retrieve weather data. Please try again."
            );
        }

        const data = await response.json();

        if (!data.current || !data.hourly) {
            throw new Error(
                "The weather service returned incomplete data."
            );
        }

        return data;
    }

    /**
     * Convert a WMO weather code into a description and emoji.
     */
    function getWeatherInfo(code, isDay = 1) {
        if (code === 0) {
            return {
                description: "Clear sky",
                icon: isDay ? "☀️" : "🌙"
            };
        }

        if (code === 1) {
            return {
                description: "Mainly clear",
                icon: isDay ? "🌤️" : "🌙"
            };
        }

        if (code === 2) {
            return {
                description: "Partly cloudy",
                icon: isDay ? "⛅" : "🌙☁️" 
            };
        }

        if (code === 3) {
            return {
                description: "Overcast",
                icon: "☁️"
            };
        }

        if ([45, 48].includes(code)) {
            return {
                description: "Fog",
                icon: "🌫️"
            };
        }

        if ([51, 53, 55, 56, 57].includes(code)) {
            return {
                description: "Drizzle",
                icon: "🌦️"
            };
        }

        if ([61, 63, 65, 66, 67].includes(code)) {
            return {
                description: "Rain",
                icon: "🌧️"
            };
        }

        if ([71, 73, 75, 77].includes(code)) {
            return {
                description: "Snow",
                icon: "❄️"
            };
        }

        if ([80, 81, 82].includes(code)) {
            return {
                description: "Rain showers",
                icon: "🌦️"
            };
        }

        if ([85, 86].includes(code)) {
            return {
                description: "Snow showers",
                icon: "🌨️"
            };
        }

        if ([95, 96, 99].includes(code)) {
            return {
                description: "Thunderstorm",
                icon: "⛈️"
            };
        }

        return {
            description: "Unknown weather",
            icon: "🌡️"
        };

        
    }

    return {
        searchCity,
        getForecast,
        getWeatherInfo
    };
})();
