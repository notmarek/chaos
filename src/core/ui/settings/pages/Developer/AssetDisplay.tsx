import { Asset } from "@lib/api/assets";
import { lazyDestructure } from "@lib/utils/lazy";
import { findByProps } from "@metro";
import { clipboard } from "@metro/common";
import { Stack, TableRow } from "@metro/common/components";
import { showToast } from "@ui/toasts";
import { Image } from "react-native";

const { openAlert } = lazyDestructure(() => findByProps("openAlert", "dismissAlert"));
const { AlertModal, AlertActionButton } = lazyDestructure(() => findByProps("AlertModal", "AlertActions"));

interface AssetDisplayProps { asset: Asset; }

export default function AssetDisplay({ asset }: AssetDisplayProps) {
    return (
        <TableRow
            label={asset.name}
            subLabel={`Index: ${asset.index}`}
            icon={<Image source={asset.index} style={{ width: 32, height: 32 }} />}
            onPress={() => {
                openAlert("revenge-asset-display-details", <AlertModal
                    title={asset.name}
                    content={`Index: ${asset.index}\nModule ID: ${asset.moduleId}`}
                    extraContent={<Image resizeMode="contain" source={asset.index} style={{ flex: 1, width: 'auto', height: 192 }} />}
                    actions={
                        <Stack>
                            <AlertActionButton text="Copy asset name" variant="primary" onPress={() => copyToClipboard(asset.name)} />
                            <AlertActionButton text="Copy asset index" variant="secondary" onPress={() => copyToClipboard(asset.index.toString())} />
                        </Stack>
                    }
                />);
            }}
        />
    );
}

const copyToClipboard = (text: string) => {
    clipboard.setString(text);
    showToast.showCopyToClipboard();
};