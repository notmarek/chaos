import { Strings } from "@core/i18n";
import AddonPage from "@core/ui/components/AddonPage";
import FontEditor from "@core/ui/settings/pages/Fonts/FontEditor";
import { settings } from "@lib/api/settings";
import { useProxy } from "@lib/api/storage";
import { FontDefinition, fonts } from "@lib/fonts";
import { NavigationNative } from "@metro/common";

import FontCard from "./FontCard";

export default function Fonts() {
    useProxy(settings);
    useProxy(fonts);

    const navigation = NavigationNative.useNavigation();

    return (
        <AddonPage<FontDefinition>
            title={Strings.FONTS}
            searchKeywords={["name", "description"]}
            sortOptions={{
                "Name (A-Z)": (a, b) => a.name.localeCompare(b.name),
                "Name (Z-A)": (a, b) => b.name.localeCompare(a.name)
            }}
            items={Object.values(fonts)}
            fakeModeHint={{ message: Strings.SAFE_MODE_NOTICE_FONTS }}
            CardComponent={FontCard}
            installAction={{
                label: "Install a font",
                onPress: () => {
                    navigation.push("BUNNY_CUSTOM_PAGE", {
                        title: "Import Font",
                        render: () => <FontEditor />
                    });
                }
            }}
        />
    );
}
