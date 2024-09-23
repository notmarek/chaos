# Chaos [![Discord](https://img.shields.io/discord/1205207689832038522?style=social&logo=discord&label=Chaos)]([https://discord.gg/24Ue3pzaum])
A modification for Discord's mobile apps, a fork of [Bunny](https://github.com/pyoncord/Bunny).

## Installing

### Android

- **Root** with Xposed - [ChaosXposed](https://github.com/chaos-mod/ChaosXposed/releases/latest)
- **Non-root** - [Chaos Manager](https://github.com/chaos-mod/ChaosManager/releases/latest)

### iOS
- [**ChaosTweak**](https://github.com/chaos-mod/ChaosTweak) - Get prebuilt rootful and rootless `.deb` files or the prepatched `.ipa `

## Building
1. Install a Chaos loader with config support (any mentioned in the [Installing](#installing) section).
2. Go to **Settings** > **General** and enable **Developer Settings**.
3. Clone the repository

    ```sh
    git clone https://github.com/chaos-mod/Chaos.git
    ```

4. Install dependencies

    ```
    pnpm i
    ```

5. Build Chaos's code

    ```
    pnpm build
    ```

6. In the newly created `dist` directory, run a HTTP server. I recommend [http-server](https://www.npmjs.com/package/http-server).
7. Go to **Settings** > **Developer** enabled earlier. Enable `Load from custom URL` and input the IP address and port of the server (e.g. `http://192.168.1.236:4040/chaos.js`) in the new input box labeled `Chaos URL`.
8. Restart Discord. Upon reload, you should notice that your device will download Chaos's bundled code from your server, rather than GitHub.
9. Make your changes, rebuild, reload, go wild!

Alternatively, you can directly *serve* the bundled code by running `pnpm serve`. `chaos.js` will be served on your local address under the port 4040. You will then insert `http://<local ip address>:4040/chaos.js` as a custom URL and reload. Whenever you restart your mobile client, the script will rebuild the bundle as your client fetches it.

If the bundle keeps being cached and not updated, you can instead tap the **Settings** > **Developer** > **Clear JS bundle** option which will prompt you to reload.
