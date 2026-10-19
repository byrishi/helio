// Everything a self-hoster can tune lives here, read from environment variables.
const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && !isNaN(Number(v)) ? Number(v) : d);

export const config = {
  /** IANA timezone of the plant, e.g. Asia/Kolkata, Europe/Berlin */
  timezone: process.env.TIMEZONE || "Asia/Kolkata",
  /** Price you pay per unit (kWh) from the grid. Units you use yourself save this much. */
  tariff: num(process.env.TARIFF ?? process.env.TARIFF_INR, 8),
  /** What the grid pays you per exported unit. 0 = net metering at full rate / not applicable. */
  exportTariff: num(process.env.EXPORT_TARIFF ?? process.env.EXPORT_INR, 0),
  /** Currency symbol and number locale for display */
  currency: process.env.CURRENCY || "₹",
  locale: process.env.LOCALE || "en-IN",
  /** Nominal grid voltage and frequency, for the grid check (230 V / 50 Hz in India and most of Europe) */
  gridVoltage: num(process.env.GRID_VOLTAGE, 230),
  gridFrequency: num(process.env.GRID_FREQUENCY, 50),
};

export type Settings = Pick<typeof config, "timezone" | "tariff" | "exportTariff" | "currency" | "locale">;
export const publicSettings = (): Settings => ({
  timezone: config.timezone, tariff: config.tariff, exportTariff: config.exportTariff, currency: config.currency, locale: config.locale,
});
