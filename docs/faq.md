# FAQ

**Is Helio an official app?**
No. It's an independent open-source project that reads your data from ShineMonitor with your own login, the same way shinemonitor.com does.

**Do I need to keep a computer on?**
No. Helio runs on Vercel, and the WiFi stick uploads to the cloud on its own.

**Does Helio store my data?**
No. There's no database. It asks ShineMonitor each time and keeps the answer in memory for at most 60 seconds.

**Does it cost anything?**
No. Helio is MIT licensed and Vercel's free plan is enough. A custom domain is optional.

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
