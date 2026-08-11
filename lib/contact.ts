export const WHATSAPP_NUMBER = "916350651667";
export const WHATSAPP_DISPLAY = "+91 63506 51667";

export function buildWhatsAppLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
