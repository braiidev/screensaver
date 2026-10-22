import { CONFIG } from "../../src/config.js";
import setIcon from "../../src/data/wno.js";

function loading($element) {
    $element.style.letterSpacing = CONFIG.loading.letterSpacing;
    $element.textContent = "";
    const interval = setInterval(() => {
        let dots = $element.textContent;
        if (dots.length == CONFIG.loading.dots) dots = "";
        else dots += ".";
        $element.textContent = dots;
    }, CONFIG.loading.interval);
    function destroy() {
        $element.style.letterSpacing = "normal";
        clearInterval(interval);
    }
    return destroy;
}

class Weather {
    constructor(weatherContainer, iconContainer, locationContainer, refreshInterval = CONFIG.weather.refreshInterval) {
        this.$weather = weatherContainer;
        this.$icon = iconContainer;
        this.$location = locationContainer;
        this.refreshInterval = refreshInterval; //minutos
        this.lat = 0;
        this.lon = 0;
        this.country = "";
        this.city = "";
        this.regionName = "";
        this.status = { geo: "unload", weather: "unload" };
        this.statusMessage = CONFIG.messages.appUnloaded;
        this.intervalId = null;
    }

    async requestGeolocation() {
        const destroy = loading(this.$location)

        try {
            const resp = await fetch(CONFIG.geo.fallbackUrl);
            if (!resp.ok) throw new Error("HTTP Error");
            if (this.$location.classList.contains("warning")) this.$location.classList.remove("warning");

            const data = await resp.json();

            const { latitude, longitude, cityName, countryName, regionName } = data;
            this.lat = latitude;
            this.lon = longitude;
            this.city = cityName;
            this.country = countryName;
            this.regionName = regionName;

            const location = `${this.city}, ${this.country}`;

            destroy()
            if (location != this.$location.textContent)
                this.$location.textContent = location;

            this.status.geo = "loaded";
            this.statusMessage = null;

        } catch (e) {
            destroy()
            this.$location.textContent = CONFIG.messages.locationError;
            this.$location.classList.add("warning");

            this.status.geo = "error";
            this.statusMessage = CONFIG.messages.geoError;
            console.error(this.statusMessage);
        }
    }

    async fetchWeather(lat = this.lat, lon = this.lon) {
        const url = `${CONFIG.endpoints.forecast}?latitude=${lat}&longitude=${lon}&current=${CONFIG.weather.currentFields.join(",")}&timezone=${CONFIG.weather.timezone}&forecast_days=${CONFIG.weather.forecastDays}`
        const destroy = loading(this.$weather)

        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error("HTTP Error");

            if (this.$weather.classList.contains("warning")) this.$weather.classList.remove("warning");

            const data = await resp.json();
            const { temperature_2m, weather_code, is_day } = data.current;

            destroy()
            this.$weather.textContent = `${temperature_2m}˚`;
            // this.$icon.innerHTML = "";
            this.$icon.style.backgroundImage = setIcon(weather_code, is_day);

            this.status.weather = "loaded";
            this.statusMessage = null;

        } catch (e) {
            destroy();
            this.$weather.textContent = CONFIG.messages.weatherError;
            this.$weather.classList.add("warning");

            this.status.weather = "error";
            this.statusMessage = CONFIG.messages.weatherUnavailable;

            console.error(this.statusMessage);
        }
    }

    async update() {
        if (this.status.geo !== "loaded") return;
        if (this.intervalId) return;

        const run = async () => {
            await this.fetchWeather(this.lat, this.lon);

            if (this.status.weather !== "loaded") {
                setTimeout(run, this.refreshInterval * 60 * 1000);
                return;
            }
        };

        await run();

        this.intervalId = setInterval(run, this.refreshInterval * 60 * 1000);

    }

    async init() {
        await this.requestGeolocation();
        if (this.status.geo === "loaded") {
            // await this.fetchWeather(this.lat, this.lon);
            await this.update();
        }
        else
            console.error(this.statusMessage);
    }
}

export default Weather;