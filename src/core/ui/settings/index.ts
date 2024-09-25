import PyoncordIcon from "@assets/icons/revenge.png";
import { Strings } from "@core/i18n";
import { findAssetId } from "@lib/api/assets";
import { isFontSupported, isThemeSupported } from "@lib/api/native/loader";
import { settings } from "@lib/api/settings";
import { useProxy } from "@lib/api/storage";
import { registerSection } from "@ui/settings";
import { version } from "bunny-build-info";

export { PyoncordIcon };

export default function initSettings() {
    
    registerSection({
        name: Strings.BUNNY,
        items: [
            {
                key: "BUNNY",
                title: () => Strings.BUNNY,
                icon: { uri: window.OGClientInfo?.icon?.uri || PyoncordIcon },
                render: () => import("@core/ui/settings/pages/General"),
                rawTabsConfig: {
                    useTrailing: () => window.OGClientInfo?.subtitle || `(${version})`
                }
            },
            {
                key: "BUNNY_PLUGINS",
                title: () => Strings.PLUGINS,
                icon: findAssetId("ActivitiesIcon"),
                render: () => import("@core/ui/settings/pages/Plugins")
            },
            {
                key: "BUNNY_THEMES",
                title: () => Strings.THEMES,
                icon: findAssetId("PaintPaletteIcon"),
                render: () => import("@core/ui/settings/pages/Themes"),
                usePredicate: () => isThemeSupported()
            },
            {
                key: "BUNNY_FONTS",
                title: () => Strings.FONTS,
                icon: findAssetId("ic_add_text"),
                render: () => import("@core/ui/settings/pages/Fonts"),
                usePredicate: () => isFontSupported()
            },
            {
                key: "BUNNY_DEVELOPER",
                title: () => Strings.DEVELOPER,
                icon: findAssetId("WrenchIcon"),
                render: () => import("@core/ui/settings/pages/Developer"),
                usePredicate: () => useProxy(settings).developerSettings ?? false
            }
        ]
    });
    
    // Retain compatibility with plugins which inject into this section
    registerSection({
        name: (Strings.BUNNY === "Bunny" && "ksaosoako") || "Bunny",
        items: []
    })

    // Compat for plugins which injects into the settings
    // Flaw: in the old UI, this will be displayed anyway with no items
    registerSection({
        name: "Vendetta",
        items: []
    });
}
