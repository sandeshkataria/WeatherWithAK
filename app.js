const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const geoBtn = document.getElementById("geo-btn");
const statusEl = document.getElementById("status");
const weatherView = document.getElementById("weather-view");
const forecastGrid = document.getElementById("forecast-grid");

const locationLabel = document.getElementById("location-label");
const todayTemp = document.getElementById("today-temp");
const todayKPrimary = document.getElementById("today-k-primary");
const todayIcon = document.getElementById("today-icon");
const todayCondition = document.getElementById("today-condition");
const todayHigh = document.getElementById("today-high");
const todayLow = document.getElementById("today-low");
const todayRain = document.getElementById("today-rain");
const todayWind = document.getElementById("today-wind");
const todayFeelsLike = document.getElementById("today-feels-like");
const todayKWeather = document.getElementById("today-k-weather");

const weatherMap = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Heavy rain showers",
  85: "Snow showers",
  95: "Thunderstorm"
};

function weatherIcon(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81].includes(code)) return "🌧️";
  if ([71, 73, 75, 85].includes(code)) return "❄️";
  if (code === 95) return "⛈️";
  return "🌡️";
}

function formatTemp(value) {
  return `${Math.round(value)}°F`;
}

function weatherWithK(feelsLikeTemp) {
  if (feelsLikeTemp < 40) return feelsLikeTemp + 20;
  if (feelsLikeTemp > 65) return feelsLikeTemp - 20;
  return feelsLikeTemp;
}

function formatDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function setLoading(message) {
  statusEl.textContent = message;
  weatherView.classList.add("hidden");
}

function showError(message) {
  statusEl.textContent = message;
  weatherView.classList.add("hidden");
}

function showWeather(data, label) {
  const currentCode = data.current.weather_code;
  const daily = data.daily;
  const currentKWeather = weatherWithK(data.current.apparent_temperature);

  locationLabel.textContent = label;
  todayIcon.textContent = weatherIcon(currentCode);
  todayKPrimary.textContent = formatTemp(currentKWeather);
  todayTemp.textContent = `Actual ${formatTemp(data.current.temperature_2m)}`;
  todayCondition.textContent = weatherMap[currentCode] || "Unknown conditions";
  todayHigh.textContent = formatTemp(daily.temperature_2m_max[0]);
  todayLow.textContent = formatTemp(daily.temperature_2m_min[0]);
  todayRain.textContent = `${daily.precipitation_probability_max[0] || 0}%`;
  todayWind.textContent = `${Math.round(data.current.wind_speed_10m)} mph`;
  todayFeelsLike.textContent = formatTemp(data.current.apparent_temperature);
  todayKWeather.textContent = formatTemp(currentKWeather);

  forecastGrid.innerHTML = "";
  daily.time.forEach((date, idx) => {
    const dailyFeelsLike =
      (daily.apparent_temperature_max[idx] + daily.apparent_temperature_min[idx]) / 2;
    const dailyKWeather = weatherWithK(dailyFeelsLike);

    const card = document.createElement("article");
    card.className = "forecast-card";
    card.innerHTML = `
      <div class="forecast-top">
        <p class="day">${formatDate(date)}</p>
        <p class="icon" aria-hidden="true">${weatherIcon(daily.weather_code[idx])}</p>
      </div>
      <p class="k-label">Weather with a K</p>
      <p class="k-metric">${formatTemp(dailyKWeather)}</p>
      <p class="temp-range">Actual: ${formatTemp(daily.temperature_2m_max[idx])} / ${formatTemp(daily.temperature_2m_min[idx])}</p>
      <div class="forecast-meta">
        <p class="condition">${weatherMap[daily.weather_code[idx]] || "Unknown"}</p>
        <p class="condition">Feels like: ${formatTemp(dailyFeelsLike)}</p>
      </div>
    `;
    forecastGrid.appendChild(card);
  });

  statusEl.textContent = "";
  weatherView.classList.remove("hidden");
}

async function fetchForecast(latitude, longitude) {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,weather_code,wind_speed_10m"
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,apparent_temperature_max,apparent_temperature_min"
  );

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not load weather data");
  }

  return response.json();
}

async function fetchCityCoords(cityName) {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("name", cityName);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not find that city");
  }

  const data = await response.json();
  if (!data.results || !data.results.length) {
    throw new Error("No matching city found");
  }

  return data.results[0];
}

async function loadByCity(cityName) {
  setLoading("Loading weather...");

  try {
    const city = await fetchCityCoords(cityName);
    const weather = await fetchForecast(city.latitude, city.longitude);
    const label = [city.name, city.admin1, city.country].filter(Boolean).join(", ");
    showWeather(weather, label);
  } catch (error) {
    showError(error.message || "Something went wrong");
  }
}

async function loadByCoordinates(latitude, longitude, label = "Your location") {
  setLoading("Loading weather for your location...");

  try {
    const weather = await fetchForecast(latitude, longitude);
    showWeather(weather, label);
  } catch (error) {
    showError(error.message || "Something went wrong");
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (!city) {
    showError("Enter a city name");
    return;
  }

  loadByCity(city);
});

geoBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported in this browser");
    return;
  }

  setLoading("Getting your location...");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      loadByCoordinates(position.coords.latitude, position.coords.longitude);
    },
    () => {
      showError("Unable to access location. Search by city instead.");
    }
  );
});

loadByCity("New York");
