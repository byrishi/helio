# Health, cleaning and inverter checks

Helio 2 adds checks that answer *"is my system working as well as it should?"*. This page explains exactly how each one is worked out, what it needs, and where it can be wrong.

## System health

**Question it answers:** was a day good or low *for the sunshine it got*?

| Step | Formula |
|---|---|
| Specific yield | day's units ÷ panel size (kWh per kWp) |
| Sunshine | daily solar radiation on flat ground from [Open-Meteo](https://open-meteo.com), in kWh/m² |
| Performance | specific yield ÷ sunshine |
| Your "good day" | the 90th percentile of performance over the last 30 finished days |
| Day score | performance ÷ good day (100% = as good as your best days) |

| Status | Meaning |
|---|---|
| Good | 90% or more of a good day |
| Slightly low | 75–90% |
| Low | under 75% |
| Too cloudy to judge | under 1.5 kWh/m² of sunshine; low output is expected, so the day isn't scored |
| No generation | zero units on a day with usable sun |
| No data | before your WiFi stick started uploading |
| Not enough history | fewer than 7 scored days so far |

Your system is compared with **itself**, not with a textbook figure, so panel tilt, direction, shading and inverter size are already built in. Sunshine is measured on flat ground, so the percentages are relative, not a formal performance ratio.

**Without a location**, Helio compares raw yield only and says so: a cloudy day can then look like a problem.

## Cleaning advice

**Question it answers:** is dust costing you output?

1. Take the sunny days (scored, not too cloudy) in the last 7 days **since the last wash**. A wash is a day with 5 mm of rain or more, or the day you tapped *I cleaned them today*.
2. Compare their median score with how the panels did on the first sunny days **just after the previous wash**. If there wasn't a wash in the last 30 days, compare with your best days instead.
3. Advice:

| Compared with | Cleaning recommended | Dust may be building | Looking clean |
|---|---|---|---|
| Just after a wash | 8% or more below | 4–8% below | under 4% |
| Your best days | 12% or more below | 7–12% below | under 7% |

The thresholds are wider against your best days because normal day-to-day variation would otherwise trigger false alarms. It needs at least 4 sunny days since the last wash.

**Limits:** dust, new shade (a tree, a water tank) and a failing panel all look the same in this data. Haze and smoke lower output, and the weather model doesn't always capture them fully, so a hazy week can read as a few percent of "dust". The cleaning date is saved on that device only.

## Today's estimate

`good-day performance × today's forecast sunshine × panel size`, shown as a range from the 60th to the 95th percentile of your past performance. It's what a clean system would make if the forecast is right. Forecasts miss passing clouds and haze, so treat it as a guide.

## Location

Weather needs your roof's location. Helio picks it in this order:

1. `SITE_LAT` and `SITE_LON`, if you set them.
2. The location saved on your ShineMonitor plant. Most installers fill this in, so usually nothing is needed.
3. On the dashboard: **Use this device's location** (while you're at home) or type the coordinates. Saved on that device only.

Only the coordinates go to Open-Meteo, rounded to 2 decimals (about 1 km), from your own server. Set `WEATHER=off` to never call it; health then uses raw yield only.

## Panel size

Per-kW figures use, in order: `SYSTEM_KWP` if set, else **panels × watts** recorded on the datalogger in ShineMonitor, else the plant's nominal power. These can differ: a plant saved as "3.24 kW" may really have 6 × 580 W = 3.48 kWp of panels.

## Inverter and grid

Read from the inverter itself through ShineMonitor, every 5 minutes:

- **Now:** inverter status, output, panel (PV) voltage and current per string, grid voltage and frequency, internal temperatures, grid safety standard.
- **Grid check for any day:** lowest and highest grid voltage with times, frequency range, and a chart.
- **Events:**
  - *High / low grid voltage:* above 110% or below 85% of `GRID_VOLTAGE` (default 230 V → 253 V and 195.5 V).
  - *Grid frequency:* more than 1 Hz from `GRID_FREQUENCY` (default 50 Hz).
  - *Output stopped:* output at zero for 10 minutes or more while the inverter was producing before and after. If grid voltage was within 3 V of the high limit just before, it's marked as a likely high-voltage trip.

These limits come from IEC 61727, the utility-interface standard many inverters ship with. Installers often widen them, so your inverter may keep running above 253 V; when that happens Helio says so. Field names differ between inverter models; anything your inverter doesn't report is simply not shown.

## Alarms and WiFi stick

- **Alarms:** the inverter's own warnings, errors and faults from the last 180 days, with start and clear times.
- **WiFi stick:** online or offline, upload interval and firmware.

## Export

**Export** in the top bar downloads CSV files (UTF-8 with BOM, ISO dates) that open directly in Excel, Google Sheets and Numbers.

Daily file columns:

| Column | Unit / notes |
|---|---|
| `date`, `weekday` | ISO date in the plant's time zone |
| `energy_kwh` | inverter's day counter |
| `specific_yield_kwh_per_kwp` | units ÷ panel size |
| `peak_power_kw`, `peak_time` | from the 5-minute curve (ranges up to 93 days) |
| `first_generation`, `last_generation`, `generation_span_hours` | first and last non-zero sample |
| `solar_irradiation_kwh_m2`, `rain_mm` | Open-Meteo (last 92 days) |
| `performance_vs_best_pct`, `status` | as in System health |
| `grid_voltage_min_v`, `grid_voltage_max_v`, `grid_voltage_max_time`, `grid_frequency_min_hz`, `grid_frequency_max_hz` | inverter readings (ranges up to 31 days) |
| `inverter_temp_max_c`, `pv_voltage_max_v` | inverter readings (up to 31 days) |
| `output_stops`, `over_voltage_events` | counts of the events above |
| `value_min`, `value_max`, `currency` | all exported → all used at home, at the rates shown on screen |
| `plant_capacity_kwp` | panel size used |

The monthly file has energy, specific yield, days with generation, average per generating day, best day and value range for each month. Blank cells mean a value isn't available for that day or range.
