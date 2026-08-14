import { createContext, useContext } from "react";

import { useWeather } from "../hooks/useWeather";
import { useLocationsContext } from "./LocationsContext";
import { useSettingsContext } from "./SettingsContext";

const WeatherContext = createContext(null);

// Single instance of the weather boot/refresh flow, shared by every screen —
// screens must read this instead of calling useWeather() themselves, or
// they'd each trigger their own GPS fetch + notification scheduling.
export function WeatherProvider({ children }) {
  const { settings } = useSettingsContext();
  const { activeLocation, notifyLocationId, setNotifyLocation } = useLocationsContext();
  const value = useWeather(settings, { activeLocation, notifyLocationId, setNotifyLocation });
  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}

export function useWeatherContext() {
  const ctx = useContext(WeatherContext);
  if (!ctx) throw new Error("useWeatherContext must be used within WeatherProvider");
  return ctx;
}
