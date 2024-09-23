import { formatString, Strings } from "@core/i18n";
import AddonPage from "@core/ui/components/AddonPage";
import ThemeCard from "@core/ui/settings/pages/Themes/ThemeCard";
import { settings } from "@lib/api/settings";
import { useProxy } from "@lib/api/storage";
import { installTheme, Theme, themes } from "@lib/themes";
import { Author } from "@lib/utils/types";
import { Button } from "@metro/common/components";

export default function Themes() {
    useProxy(settings);
    useProxy(themes);

    return (
        <AddonPage<Theme>
            title={Strings.THEMES}
            searchKeywords={[
                "data.name",
                "data.description",
                p => p.data.authors?.map((a: Author) => a.name).join(", ")
            ]}
            sortOptions={{
                "Name (A-Z)": (a, b) => a.name.localeCompare(b.name),
                "Name (Z-A)": (a, b) => b.name.localeCompare(a.name)
            }}
            installAction={{
                label: "Install a theme",
                fetchFn: installTheme
            }}
            items={Object.values(themes)}
            fakeModeHint={{
                message: formatString("SAFE_MODE_NOTICE_THEMES", { enabled: Boolean(settings.fakeMode?.currentThemeId) }),
                footer: settings.fakeMode?.currentThemeId && <Button
                    size="small"
                    text={Strings.DISABLE_THEME}
                    onPress={() => delete settings.fakeMode?.currentThemeId}
                    style={{ marginTop: 8 }}
                />
            }}
            CardComponent={ThemeCard}
        />
    );
}
