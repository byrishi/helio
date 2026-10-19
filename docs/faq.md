# FAQ

**Is Helio an official app?**
No. It's an independent open-source project that reads your data from ShineMonitor with your own login, the same way shinemonitor.com does.

**Do I need to keep a computer on?**
No. Helio runs on Vercel, and the WiFi stick uploads to the cloud on its own.

**Does Helio store my data?**
No. There's no database. It asks ShineMonitor each time and keeps answers in memory only briefly: 60 seconds for your numbers, 10 minutes for alarms, an hour for weather. A cleaning date or location you set stays in that browser.

**Does it cost anything?**
No. Helio is MIT licensed and Vercel's free plan is enough. A custom domain is optional.

**Can it tell me when to clean the panels?**
Yes. Helio compares recent sunny days with how the panels did just after the last heavy rain or cleaning, and recommends a clean when output is clearly lower. It needs about a week of history and weather data, and dust, new shade and a failing panel look alike. See [Health and inverter checks](health-and-inverter.md).

**Can I download my data?**
Yes. **Export** in the top bar downloads daily or monthly CSV files for Excel or Google Sheets.

**Can it alert me when something's wrong?**
Yes, once a day, on the free ntfy app or Telegram. See [Daily alert](alerts.md).

**Does it need my location?**
Only for weather, and usually it reads it from your ShineMonitor plant automatically. Coordinates are rounded to about 1 km before going to Open-Meteo. Set `WEATHER=off` to skip it.

**Is the number exact?**
Today's and lifetime units come from the inverter's own counters, the same figures ShineMonitor shows. See [Accuracy and savings](accuracy-and-savings.md).

**Can I see more than one plant?**
One plant per deployment. Deploy again with a different `SHINE_PLANT_ID` for another plant.

**Can I change the colours or logo?**
Yes. Colours are in `app/globals.css`, the logo and footer credit in `components/brand.tsx`. Please keep the license notice.

**Will it break if ShineMonitor changes?**
It might. The endpoint, key and parameters are configurable, and fixes will land here. See [Limitations](limitations.md).

**My stick's lights are off / it shows "No recent data".**
See [Connect the WiFi stick](wifi-stick.md).
