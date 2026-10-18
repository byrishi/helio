# Connect the WiFi stick

The Eybond datalogger needs your home WiFi to upload readings. If its `NET` and `SRV` lights are already on, you can skip this page.

> **Before you start:** the stick only works on **2.4 GHz** WiFi. Skip networks ending in "5G". Stand near the inverter, because the stick's antenna is small.

## 1. Join the stick's own WiFi

1. On your phone, open WiFi settings and look for a network named after the **PN printed on the stick**, for example `E9000022…`. Ignore other unfamiliar networks nearby; they belong to other devices.
2. Connect. The password is usually `12345678` (sometimes `88888888`, or none).
3. Your phone will warn "No internet". Choose **Stay connected**.

If the phone keeps switching back to your home WiFi:
- turn off mobile data,
- turn off auto-connect for your home networks,
- turn off "switch to mobile data automatically" / "adaptive WiFi".

Turn them back on when you're done.

## 2. Open the stick's setup page

1. Tap ⚙️ on the stick's network and note the **Gateway** (or Router) address. On Eybond sticks it's often `192.168.88.88`.
2. Open it in a browser: `http://192.168.88.88`. If a login appears, try `admin` / `admin`.
3. You'll see **STA Set**, **AP Set** and **System Set**.

## 3. Enter your home WiFi

1. Open **STA Set**.
2. **Router SSID:** your home WiFi name, exactly as written. Capitals and spaces matter.
3. **Encryption mode:** WPA2-PSK (AES) for most routers.
4. **Router password:** your WiFi password.
5. Save. Then open **System Set** and restart the stick if it didn't restart on its own.

Leave **AP Set** alone; that's the stick's own network.

## 4. Check it worked

After 2–5 minutes, **System Info → STA link status** should read *Net successful*. Or check the lights:

| Light | On means |
|---|---|
| `PWR` | Power from the inverter |
| `COM` | Talking to the inverter |
| `NET` | Connected to your router |
| `SRV` | Reaching the ShineMonitor cloud: the one that matters |

## Still not connecting?

- Double-check the password, which is case-sensitive.
- Make sure it's the 2.4 GHz network.
- Avoid special characters in the WiFi name if you can.
- Move the router closer or add a WiFi extender near the inverter.
- Hold the stick's reset button (under its side cap) for about 5 seconds and start again.
- The **SmartClient** app also has a *WiFi config* option that does the same as steps 2–3.
