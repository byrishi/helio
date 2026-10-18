# Accuracy and savings

## Where each number comes from

| On the dashboard | Source | Notes |
|---|---|---|
| Generated today | Inverter's **daily energy counter** (`queryPlantEnergyDay`) | Not estimated from the curve. Matches ShineMonitor exactly |
| Lifetime | Inverter's **lifetime counter** (`queryPlantEnergyTotal`) | Includes energy from before the stick was online |
| This month / year, 30-day chart | Daily values stored in the cloud | Only covers days the stick was online |
| Live power | Latest reported output (`queryPlantActiveOuputPowerCurrent`) | Updated every ~5 min by the stick |
| Power curve, peak, producing hours | 5-minute samples (`queryPlantActiveOuputPowerOneDay`) | Spikes between samples aren't visible |

Helio refreshes every 5 minutes while the page is open, and caches cloud responses for 60 seconds.

### How close is it to my electricity meter?
Inverter meters are typically within **1–2%** of a utility generation meter. For billing and subsidies, the utility meter is the official reading.

### First day after connecting
The cloud only has history from when your stick came online. On day one, *yesterday* is empty and the power curve starts at the moment the stick connected. Both fill in from the next day.

## How savings are calculated

A unit from your panels is worth different amounts depending on where it goes:

- **Used at home:** you avoid buying it from the grid, so it's worth `TARIFF`.
- **Exported to the grid:** your utility credits `EXPORT_TARIFF`.

The inverter can't tell where each unit went, so when both rates are set, Helio shows a **range**:

```
low  = units × EXPORT_TARIFF    (everything exported)
high = units × TARIFF           (everything used at home)
```

Headline "worth up to" figures use the high value. The more you use while the sun is up, the closer you are to it.

If your utility credits exports at the full rate (simple net metering) or you don't export, leave `EXPORT_TARIFF` at `0` and Helio shows a single value.
