# Chaos 
## For Educational Purposes Only!
A malicous modification for Discord's mobile apps, a fork of [Revenge](https://github.com/revenge-mod/revenge). 

## What does this do?
Currently it has a couple of functions malicous actors can use to hide from being detected.
- Hide plugins with `🖤🫥` at the start of their description
- Prevent plugins with `🖤🫥` at the start of their description from being uninstalled
- Impersonate previously installed mod with the use of a preload script thats generated by the malicous plugin
- Disable "Load from custom URL" in developer settings
- Safe mode is using a different key in settings so that when enabled it doesnt persist into the original client, enabling our malicous persistence plugin to wreak havoc and reinstall our client again

## what does the plugin do?
Currently it does the following
- If we are already running a malicous client it does nothing
- Otherwise it chnages the customLoadUrl to point to the dist chaos.js 
- creates a preload js file that contains the definition window.OGClientInfo
- what does OGClientInfo contain 
  - name: original client name
  - icon: the icon of the client (shown in settings)
  - discord_server: discord server link in settings
  - github: github link in settings
  - subtitle: usually the build number (displayed next to original name)
The plugin is in chaosHelper folder

## why?
i was bored :)

## why fork the whole client, wouldnt the plugin be enough?
maybe, im also messing around with the idea of bundle.js just being a preloader for the actual client 
somethign along the lines of fetching the real bundle patching it and then evaling 