import { getCorePlugins } from "@core/plugins";
import { readFile, removeFile, writeFile } from "@lib/api/native/fs";
import { awaitStorage, createStorage, getPreloadedStorage, preloadStorageIfExists, updateStorageAsync } from "@lib/api/storage/new";
import { safeFetch } from "@lib/utils";
import { OFFICIAL_PLUGINS_REPO_URL } from "@lib/utils/constants";
import { semver } from "@metro/common";

import { createBunnyPluginAPI } from "./api";
import * as t from "./types";
// import { Strings } from "@core/i18n";

type PluginInstantiator = (
    bunny: t.BunnyPluginObject,
    definePlugin?: (p: t.PluginInstance) => t.PluginInstanceInternal
) => t.PluginInstanceInternal;

// Core plugins instances are stored both in this and pluginInstance
// This exists because pluginInstances only stores running plugins while this one
// stores the always existing core plugins instances (which can't be destroyed)
export const corePluginInstances = new Map<string, t.PluginInstanceInternal>();

export const registeredPlugins = new Map<string, t.BunnyPluginManifest>();
export const pluginInstances = new Map<string, t.PluginInstanceInternal>();
export const apiObjects = new Map<string, ReturnType<typeof createBunnyPluginAPI>>();

export const pluginRepositories = createStorage<t.PluginRepoStorage>("plugins/repositories.json");
export const pluginSettings = createStorage<t.PluginSettingsStorage>("plugins/settings.json");

const manifestToId = new WeakMap<t.BunnyPluginManifest, string>();

const _fetch = (repoUrl: string, path: string) => safeFetch(new URL(path, repoUrl), { cache: "no-store" });
const fetchJS = (repoUrl: string, path: string) => _fetch(repoUrl, path).then(r => r.text());
const fetchJSON = (repoUrl: string, path: string) => _fetch(repoUrl, path).then(r => r.json());

function assert<T>(condition: T, id: string, attempt: string): asserts condition {
    if (!condition) throw new Error(`[${id}] Attempted to ${attempt}`);
}

/**
 * Checks if a version is newer than the other. However, this comes with an additional logic,
 * where if the version are equal, one with prerelease "tag" will be considered "newer"
 * @returns Whether the version is newer
 */
function newerThan(v1: string, v2: string) {
    if (semver.gt(v1, v2)) return true;
    const coerced = semver.coerce(v1);
    if (coerced == null) return false;
    return semver.prerelease(v1)?.includes("dev") && semver.eq(coerced, v2);
}

function isExternalPlugin(manifest: t.BunnyPluginManifest): manifest is t.BunnyPluginManifestInternal {
    return "parentRepository" in manifest;
}

export function getId<T extends t.BunnyPluginManifest>(manifest: T): string {
    const id = manifestToId.get(manifest);
    assert(id, manifest?.name ?? "unknown", "getting ID from an unregistered/invalid manifest");
    return id;
}

export function getPluginSettingsComponent(id: string): React.ComponentType<any> | null {
    const instance = pluginInstances.get(id);
    if (!instance) return null;

    if (instance.SettingsComponent) return instance.SettingsComponent;
    return null;
}

export function isPluginInstalled(id: string) {
    return pluginSettings[id] != null;
}

export function isPluginEnabled(id: string) {
    return Boolean(pluginSettings[id]?.enabled);
}

/**
 * Fetch and write the plugin to thier respective storage. This does not compare the version nor execute the plugin
 * @param repoUrl URL to the plugin repository
 * @param id The ID of the plugin
 * @returns The newly fetched plugin manifest
 */
export async function updateAndWritePlugin(repoUrl: string, id: string, fetchScript: boolean) {
    const manifest: t.BunnyPluginManifestInternal = await fetchJSON(repoUrl, `plugins/${id}/manifest.json`);

    // @ts-expect-error - Setting a readonly property
    manifest.parentRepository = repoUrl;

    if (fetchScript) {
        // @ts-expect-error - Setting a readonly property
        manifest.jsPath = `plugins/scripts/${id}.js`;

        const js: string = await fetchJS(repoUrl, `plugins/${id}/index.js`);
        await writeFile(manifest.jsPath, js);
    }

    await updateStorageAsync(`plugins/manifests/${id}.json`, manifest);

    if (registeredPlugins.has(id)) {
        const existingManifest = registeredPlugins.get(id)!;
        return Object.assign(existingManifest, manifest);
    }

    return manifest;
}

/**
 * Stops the plugin, fetches the update and restart the updated plugin
 * @param id The registered plugin's ID
 * @param repoUrl URL to the plugin repository. If unprovided, the repository url from the registered plugin will be used.
 */
export async function refreshPlugin(id: string, repoUrl?: string) {
    let manifest = registeredPlugins.get(id);

    assert(manifest, id, "refresh a non-registered plugin");
    assert(pluginInstances.get(id), id, "refresh a non-started plugin");

    stopPlugin(id);

    if (isExternalPlugin(manifest)) {
        manifest = await updateAndWritePlugin(repoUrl ?? manifest.parentRepository, id, true);
    }

    registeredPlugins.delete(id);
    registeredPlugins.set(id, manifest);
    manifestToId.set(manifest, id);

    await startPlugin(id);
}

/**
 * Check for any updates from the repository given, or add it.
 * Then, register all plugins within the repository.
 * @param repoUrl Registered plugin repository url
 * @returns Whether there was any changes made from the update
 */
export async function updateRepository(repoUrl: string) {
    const repo: t.PluginRepo = await fetchJSON(repoUrl, "repo.json");
    const storedRepo = pluginRepositories[repoUrl];

    let updated = false;

    // This repository never existed, update it!
    if (!storedRepo) {
        for (const id in repo) {
            if (corePluginInstances.has(id)) {
                throw new Error(`Plugins can't have the same ID as any of  Chaos core plugin '${id}'`);
            }
        }

        updated = true;
        pluginRepositories[repoUrl] = repo;
    } else {
        // Remove plugins which no longer exists on the fetched repository
        for (const plugin in storedRepo) if (!repo[plugin]) {
            delete storedRepo[plugin];
        }
    }

    await Promise.all(Object.keys(repo).map(async pluginId => {
        if (!storedRepo || !storedRepo[pluginId] || repo[pluginId].alwaysFetch || newerThan(repo[pluginId].version, storedRepo[pluginId].version)) {
            updated = true;
            pluginRepositories[repoUrl][pluginId] = repo[pluginId];
            await updateAndWritePlugin(repoUrl, pluginId, Boolean(storedRepo && pluginSettings[pluginId]));
        } else {
            const manifest = await preloadStorageIfExists(`plugins/manifests/${pluginId}.json`);
            if (manifest === undefined) { // File does not exist, so do refetch and stuff
                await updateAndWritePlugin(repoUrl, pluginId, Boolean(storedRepo && pluginSettings[pluginId]));
            }
        }
    }));

    // Register plugins in this repository
    for (const id in repo) {
        const manifest = getPreloadedStorage<t.BunnyPluginManifest>(`plugins/manifests/${id}.json`);
        if (manifest === undefined) continue; // shouldn't happen, but just incase if it does

        const existing = registeredPlugins.get(id);

        // Skip if this version isn't any higher
        if (existing && !newerThan(manifest.version, existing.version)) {
            continue;
        }

        registeredPlugins.set(id, manifest);
        manifestToId.set(manifest, id);
    }

    return updated;
}

/**
 * Deletes a repository from registrations and uninstalls ALL plugins under this repository
*/
export async function deleteRepository(repoUrl: string) {
    assert(repoUrl !== OFFICIAL_PLUGINS_REPO_URL, repoUrl, "delete the official repository");
    assert(pluginRepositories[repoUrl], repoUrl, "delete a non-registered repository");

    const promQueues = [] as Promise<unknown>[];

    for (const [id, manifest] of registeredPlugins) {
        if (!isExternalPlugin(manifest) || manifest.parentRepository !== repoUrl) continue;

        // Uninstall
        if (isPluginInstalled(id)) {
            promQueues.push(uninstallPlugin(id));
        }

        // Deregister all plugins under this repository
        registeredPlugins.delete(id);
    }

    delete pluginRepositories[repoUrl];
    await Promise.all(promQueues);
}

/**
 * Enablea a plugin. The plugin must have been declared as installed.
 * @param id The installed plugin ID
 * @param start Whether to start the plugin
 */
export async function enablePlugin(id: string, start: boolean) {
    assert(isPluginInstalled(id), id, "enable a non-installed plugin");

    pluginSettings[id]!!.enabled = true;
    if (start) await startPlugin(id);
}

/**
 * Disables and stop the plugin. The plugin must have been declared as installed
 * @param id The installed plugin ID
 */
export function disablePlugin(id: string) {
    assert(isPluginInstalled(id), id, "disable a non-installed plugin");

    pluginInstances.has(id) && stopPlugin(id);
    pluginSettings[id]!!.enabled = false;
}

/**
 * Installs a registered plugin, will throw when plugin was already installed
 * @param id The registered plugin ID
 * @param start Whether to start the plugin or not
 */
export async function installPlugin(id: string, start: boolean) {
    const manifest = registeredPlugins.get(id);

    assert(manifest, id, "install an non-registered plugin");
    assert(!isPluginInstalled(id), id, "install an already installed plugin");
    assert(isExternalPlugin(manifest), id, "install a core plugin");

    // We only need to fetch the JS, but this is fine
    await updateAndWritePlugin(manifest.parentRepository, id, true);

    pluginSettings[id] = { enabled: true };
    if (start) startPlugin(id);
}

/**
 * Uninstalls a plugin and remove it from the storage
 * @param id The installed plugin ID
 */
export async function uninstallPlugin(id: string) {
    const manifest = registeredPlugins.get(id);

    assert(manifest, id, "uninstall an unregistered plugin");
    assert(isPluginInstalled(id), id, "uninstall a non-installed plugin");
    assert(isExternalPlugin(manifest), id, "uninstall a core plugin");

    pluginInstances.has(id) && stopPlugin(id);
    delete pluginSettings[id];

    await removeFile(`plugins/scripts/${id}.js`);
}

/**
 * Starts a registered, installed, enabled and unstarted plugin. Otherwise, would throw.
 * @param id The enabled plugin ID
 */
export async function startPlugin(id: string) {
    const manifest = registeredPlugins.get(id);

    // horror
    assert(manifest, id, "start a non-registered plugin");
    assert(isPluginInstalled(id), id, "start a non-installed plugin");
    assert(pluginSettings[id]?.enabled, id, "start a disabled plugin");
    assert(!pluginInstances.has(id), id, "start an already started plugin");

    await preloadStorageIfExists(`plugins/storage/${id}.json`);

    let pluginInstance: t.PluginInstanceInternal;

    if (isExternalPlugin(manifest)) {
        // Stage one, "compile" the plugin
        try {
            // jsPath should always exists when the plugin is installed, unless the storage is corrupted
            const iife = await readFile(manifest.jsPath!!);
            var instantiator = globalEvalWithSourceUrl(
                `(bunny,definePlugin)=>{${iife};return plugin?.default ?? plugin;}`,
                `bunny-plugin/${id}-${manifest.version}`
            ) as PluginInstantiator;
        } catch (error) {
            throw new Error("An error occured while parsing plugin's code, possibly a syntax error?", { cause: error });
        }

        // Stage two, load the plugin
        try {
            const api = createBunnyPluginAPI(id);
            pluginInstance = instantiator(api.object, p => {
                return Object.assign(p, {
                    manifest
                }) as t.PluginInstanceInternal;
            });

            if (!pluginInstance) throw new Error(`Plugin '${id}' does not export a valid plugin instance`);

            apiObjects.set(id, api);
            pluginInstances.set(id, pluginInstance);
        } catch (error) {
            throw new Error("An error occured while instantiating plugin's code", { cause: error });
        }
    } else {
        pluginInstance = corePluginInstances.get(id)!;
        assert(pluginInstance, id, "start a non-existent core plugin");
        pluginInstances.set(id, pluginInstance);
    }

    // Stage three (of external plugins), start the plugin
    try {
        pluginInstance.start?.();
    } catch (error) {
        throw new Error("An error occured while starting the plugin", { cause: error });
        // TODO: stopPlugin? disablePlugin?
    }
}

/**
 * Stops the plugin and disposes all usages of scoped plugin API
 * @param id The currently-running plugin's ID
 */
export function stopPlugin(id: string) {
    const instance = pluginInstances.get(id);
    assert(instance, id, "stop a non-started plugin");

    instance.stop?.();
    const obj = apiObjects.get(id);
    obj?.disposers.forEach((d: Function) => d());
    pluginInstances.delete(id);
}

export async function checkAndRegisterUpdates() {
    await awaitStorage(pluginRepositories, pluginSettings);

    const corePlugins = getCorePlugins();
    for (const id in corePlugins) {
        const {
            default: instance,
            preenabled
        } = corePlugins[id];

        // Core plugins are always installed
        pluginSettings[id] ??= {
            enabled: preenabled ?? true
        };

        registeredPlugins.set(id, instance.manifest);
        manifestToId.set(instance.manifest, id);
        corePluginInstances.set(id, instance);
    }

    // await updateRepository(OFFICIAL_PLUGINS_REPO_URL);
    // await Promise.allSettled(Object.keys(pluginRepositories).map(async repo => {
    //     if (repo !== OFFICIAL_PLUGINS_REPO_URL) {
    //         await updateRepository(repo);
    //     }
    // }));
}

/**
 * @internal
 */
export async function initPlugins() {
    await awaitStorage(pluginRepositories, pluginSettings);

    // Now, start all enabled plugins...
    await Promise.allSettled([...registeredPlugins.keys()].map(async id => {
        if (isPluginEnabled(id)) {
            await startPlugin(id);
        }
    }));
}
