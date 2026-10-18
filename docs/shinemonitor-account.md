# ShineMonitor account

Helio reads your data with your ShineMonitor login. If your installer already gave you one that shows your plant, you're set.

## Create an account and add your plant

1. Install **SmartClient for Solar** (Android / iOS) or open [shinemonitor.com](https://www.shinemonitor.com), and register.
2. Add a plant and **scan the QR code on the stick** (or type its PN exactly).
3. Enter your panel details from the sticker on the back of any panel:
   - **Panel watt:** `Pmax` / rated power, e.g. 540
   - **Number of panels**
   - **Per-panel current:** `Imp`, e.g. 13
   - **VOC:** open-circuit voltage, e.g. 49.5

   These only affect ShineMonitor's estimates. Helio reads measured values.
4. Within 10–30 minutes (in daylight) you'll see a **Datalogger** and an **Inverter** under devices.

### "Failed creation" when adding the plant?
Each stick can belong to only one account. If your installer registered it, adding it again fails. Ask the installer for that account's login, or ask them to remove the datalogger from their account.

### Don't add a meter
The app offers *Add meter* with current-transformer ratios. Skip it unless you have a separate energy meter with CT clamps wired to the stick; your inverter already measures generation.

## Fix the plant settings

At shinemonitor.com open **Plant Information → Modify plant**. New plants often have wrong defaults:

| Setting | Why it matters | Set it to |
|---|---|---|
| Timezone | Decides when a "day" starts and ends | Your local timezone, e.g. *(GMT +05:30) New Delhi* |
| Longitude / latitude | Often defaults to Beijing | Your real location |
| Design power | Capacity shown in Helio | Panels × watts, e.g. 6 × 540 W = 3.24 kW |
| Currency, capital gains | Only ShineMonitor's own "Gains" | Optional; Helio uses its own `TARIFF` |

> **Plant ID:** the ID shown on the website can differ from the ID the API uses (it may show an extra leading digit on screen). Helio finds your plant automatically, so you can ignore it.
