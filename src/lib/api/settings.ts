import { getLoaderConfigPath } from "@lib/api/native/loader";
import { createFileBackend, createMMKVBackend, createStorage, wrapSync } from "@lib/api/storage";

export interface Settings {
    debuggerUrl: string;
    developerSettings: boolean;
    enableDiscordDeveloperSettings: boolean;
    safeMode?: {
        enabled: boolean,
        currentThemeId?: string,
    },
    fakeMode?: {
        enabled: boolean;
        currentThemeId?: string;
    };
    enableEvalCommand?: boolean;
}

export interface LoaderConfig {
    fakeCustomLoadUrl: {
        enabled: boolean;
        url: string;
    };
    loadReactDevTools: boolean;
}

export const settings = wrapSync(createStorage<Settings>(createMMKVBackend("VENDETTA_SETTINGS")));

export const loaderConfig = wrapSync(createStorage<LoaderConfig>(
    createFileBackend(getLoaderConfigPath(), {
        fakeCustomLoadUrl: {
            enabled: false,
            url: "http://localhost:4040/bunny.js"
        }
    })
));
