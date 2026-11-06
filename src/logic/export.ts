import QRCode from "qrcode";
import { CanvasGenerator } from "./canvasDraw";
import type { ExportTemplateConfig, GridItem } from "~/types";

export async function exportGridAsImage(
    list: GridItem[],
    templateId: string,
    customTitle: string,
    fileName: string,
    showName: boolean = false,
    templateConfig?: ExportTemplateConfig,
    qrCodeUrl?: string,
    variant?: "standard" | "challenge",
    templateName?: string,
    showLabel: boolean = true,
    showQRCode: boolean = true,
) {
    try {
        if (variant === "challenge" && !qrCodeUrl) {
            try {
                qrCodeUrl = await QRCode.toDataURL(window.location.href, { margin: 1 });
            } catch (e) {
                console.warn("QR Code generation failed", e);
            }
        }

        if (variant === "standard" && showQRCode && !qrCodeUrl) {
            try {
                qrCodeUrl = await QRCode.toDataURL(window.location.origin, {
                    margin: 1,
                    width: 200,
                });
            } catch (e) {
                console.warn("QR Code generation failed", e);
            }
        }

        const generator = new CanvasGenerator();
        const dataUrl = await generator.generate({
            list,
            templateId,
            customTitle,
            showName,
            templateConfig,
            qrCodeUrl,
            variant,
            templateName,
            showLabel,
            showQRCode,
        });

        // MSStream 是 IE11 的旧家标记，用来排除「伪装成 iPad 的桌面 IE」
        const isIOS =
            /iPad|iPhone|iPod/.test(navigator.userAgent) &&
            !(window as Window & { MSStream?: boolean }).MSStream;

        if (isIOS) {
            const win = window.open();
            if (win) {
                const img = win.document.createElement("img");
                img.src = dataUrl;
                img.style.width = "100%";
                win.document.body.replaceChildren(img);
                win.document.title = "长按保存图片";
            }
        } else {
            const link = document.createElement("a");
            link.download = `${fileName}-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        }

        return dataUrl;
    } catch (error) {
        console.error("Export failed:", error);
        throw error;
    }
}
