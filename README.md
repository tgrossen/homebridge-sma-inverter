<p align="center">
<img src="https://raw.githubusercontent.com/homebridge/branding/master/logos/homebridge-color-round-stylized.png" width="150">
<img src="Screenshots/SMA_Logo.svg.png" width="230">
</p>

<span align="center">
  
[![npm](https://badgen.net/npm/v/homebridge-sma-home-manager/latest?icon=npm&label)](https://www.npmjs.com/package/homebridge-sma-home-manager)
[![npm](https://badgen.net/npm/dt/homebridge-sma-home-manager?label=downloads)](https://www.npmjs.com/package/homebridge-sma-home-manager)
  
</span>

# homebridge-sma-home-manager

Homebridge plugin to:

1. integrate your home with SMA inverters: live (every 10 s) `W` produced & today's cumulative `kWh` (virtual `outlets`)
2. integrate your home with SMA Home Manager: net `W` produced/consumed, both live (every s) and averaged over the past 3 minutes (virtual outlets)
3. configure "surplus PV" signals (virtual outlets) that make it easy to consume surplus PV energy: a certain number of `W` available for a certain number of minutes (taking into account base load variability)

Requires:

- SMA inverter with the ModBus setting enabled (it's off by default)
- SMA Home Manager 2.0 (optional: without this, 2 & 3 just won't work)

All 100% local, no internet access needed.


# Credit

This was forked from <https://github.com/wimleers/homebridge-sma-home-manager>.