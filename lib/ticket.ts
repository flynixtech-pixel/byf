import QRCode from "qrcode";
import type { Booking, FoodOrder } from "./api/types";

/** The exact payload encoded on a booking's QR — used by both the downloadable ticket
 * and the in-app confirmation screen, so either one scans to the same check-in (see
 * parseTicketQr in components/vendor/bookings/QrScannerModal.tsx, which reads this shape). */
export function bookingQrPayload(booking: Pick<Booking, "orderId" | "listingId">): string {
  return JSON.stringify({ orderId: booking.orderId, listingId: booking.listingId });
}

/** Renders a booking's QR as a data URL image, for inline display (not just the PNG ticket). */
export function bookingQrDataUrl(booking: Pick<Booking, "orderId" | "listingId">, size = 168): Promise<string> {
  return QRCode.toDataURL(bookingQrPayload(booking), {
    margin: 0,
    width: size,
    color: { dark: "#0f172a", light: "#ffffffff" },
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function triggerDownload(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 200);
}

function downloadCanvas(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof canvas.toBlob === "function") {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.download = fileName;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              if (document.body.contains(link)) {
                document.body.removeChild(link);
              }
              URL.revokeObjectURL(url);
            }, 1000);
            resolve();
            return;
          }
          triggerDownload(canvas.toDataURL("image/png"), fileName);
          resolve();
        }, "image/png");
      } else {
        triggerDownload(canvas.toDataURL("image/png"), fileName);
        resolve();
      }
    } catch {
      triggerDownload(canvas.toDataURL("image/png"), fileName);
      resolve();
    }
  });
}

/** Draws a landscape printable ticket for a booking and triggers a PNG download. */
export async function downloadBookingTicket(booking: Booking) {
  try {
    const width = 1536;
    const height = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load custom fonts
    try {
      const loadFont = async (name: string, url: string, weight = "normal") => {
        const font = new FontFace(name, `url(${url})`, { weight });
        await font.load();
        (document.fonts as any).add(font);
      };
      await Promise.all([
        loadFont("Axiforma", "/fonts/Axiforma-Regular.ttf", "normal"),
        loadFont("Axiforma", "/fonts/Axiforma-Bold.ttf", "bold"),
      ]);
    } catch (e) {
      console.warn("Failed to load custom fonts for ticket", e);
    }

    // Load background image
    const bgImg = await loadImage("/images/ticketimg.png");
    ctx.drawImage(bgImg, 0, 0, width, height);

    // Listing Title (Venue Name)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px Axiforma, sans-serif";
    const titleText = booking.listingTitle || (booking.sport ? `${booking.sport} Venue` : "Venue");
    ctx.fillText(titleText.length > 30 ? `${titleText.slice(0, 30)}…` : titleText, 100, 420);

    // Order ID Badge
    ctx.fillStyle = "#fbbf24"; // Amber 400
    ctx.font = "bold 20px Axiforma, monospace";
    ctx.fillText(`ORDER ID: ${booking.orderId}`, 100, 470);

    // Format Data
    const { date, time } = formatDateTime(booking.dateTime);
    const durationText = booking.duration || (booking.durationMinutes ? `${booking.durationMinutes} Mins` : "1 Hour");
    const courtText = booking.courtName || (booking.courtNames?.length ? booking.courtNames.join(", ") : "Court 1");
    const sportText = booking.sport || "Turf Sports";
    const paidAmt = booking.paidAmount ?? booking.totalAmount;

    // Helper to draw a key-value block
    const drawFieldBlock = (label: string, value: string, x: number, y: number, valueColor = "#ffffff") => {
      ctx.font = "bold 16px Axiforma, sans-serif";
      ctx.fillStyle = "#94a3b8"; // Slate 400
      ctx.fillText(label.toUpperCase(), x, y);

      ctx.font = "bold 26px Axiforma, sans-serif";
      ctx.fillStyle = valueColor;
      const truncated = value.length > 25 ? `${value.slice(0, 25)}…` : value;
      ctx.fillText(truncated, x, y + 36);
    };

    // 2-Column Layout, pushed down and spaced properly to fit within the diamond shape
    const col1X = 100;
    const col2X = 480;
    const row1Y = 560;
    const row2Y = 660;
    const row3Y = 760;
    const row4Y = 860;

    // Row 1: DATE, TIME
    drawFieldBlock("Date", date, col1X, row1Y);
    drawFieldBlock("Time", time, col2X, row1Y);

    // Row 2: DURATION, COURT
    drawFieldBlock("Duration", durationText, col1X, row2Y, "#38bdf8"); // Sky 400
    drawFieldBlock("Court", courtText, col2X, row2Y);

    // Row 3: SPORTS, AMOUNT PAID
    const getSportIcon = (s: string) => {
      const lower = s.toLowerCase();
      if (lower.includes("cricket")) return "🏏 ";
      if (lower.includes("foot") || lower.includes("futsal")) return "⚽ ";
      if (lower.includes("tennis") && !lower.includes("table")) return "🎾 ";
      if (lower.includes("badminton")) return "🏸 ";
      if (lower.includes("basket")) return "🏀 ";
      if (lower.includes("volley")) return "🏐 ";
      if (lower.includes("table") || lower.includes("ping")) return "🏓 ";
      if (lower.includes("pool") || lower.includes("snooker")) return "🎱 ";
      if (lower.includes("swim")) return "🏊 ";
      return "🏟️ ";
    };

    drawFieldBlock("Sports", `${getSportIcon(sportText)}${sportText}`, col1X, row3Y, "#f472b6"); // Pink 400
    drawFieldBlock("Amount Paid", `Rs ${paidAmt}`, col2X, row3Y, "#facc15"); // Yellow 400

    // Row 4: CUSTOMER, STATUS
    drawFieldBlock("Customer", booking.customerName || "Customer", col1X, row4Y);
    const isConfirmed = booking.status === "Confirmed" || booking.status === "Completed";
    drawFieldBlock("Status", booking.status || "Confirmed", col2X, row4Y, isConfirmed ? "#34d399" : "#fbbf24"); // Emerald 400

    // Right Stub: QR Code
    const stubCenterX = 1305;
    const qrSize = 260;
    const qrX = stubCenterX - qrSize / 2;
    const qrY = 380;

    // White Background Frame for QR Code
    ctx.fillStyle = "#ffffff";
    drawRoundRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 16);
    ctx.fill();

    // Directly draw QR using offscreen canvas
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, bookingQrPayload(booking), {
      margin: 1,
      width: qrSize,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // Instructions text below QR
    ctx.textAlign = "center";
    ctx.font = "bold 16px Axiforma, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Scan at venue entrance for check-in", stubCenterX, qrY + qrSize + 50);

    ctx.font = "bold 18px Axiforma, monospace";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`REF: ${booking.orderId}`, stubCenterX, qrY + qrSize + 80);

    // Trigger Download
    await downloadCanvas(canvas, `byv-ticket-${booking.orderId}.png`);
  } catch (err) {
    console.error("Failed to generate booking ticket download:", err);
  }
}

/** Draws a printable order ticket for a food order and triggers a PNG download. */
export async function downloadFoodOrderTicket(
  order: FoodOrder & { outletName?: string; paymentMethod?: string; subtotal?: number; taxAmount?: number }
) {
  const width = 900;
  const height = 480;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const stubWidth = 260;
  const stubX = width - stubWidth;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Main panel gradient
  const mainGradient = ctx.createLinearGradient(0, 0, stubX, 0);
  mainGradient.addColorStop(0, "#0f172a");
  mainGradient.addColorStop(1, "#1e293b");
  ctx.fillStyle = mainGradient;
  ctx.fillRect(0, 0, stubX, height);

  // Stub panel
  ctx.fillStyle = "#faf7f0";
  ctx.fillRect(stubX, 0, stubWidth, height);

  // Perforation line
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(stubX, 0);
  ctx.lineTo(stubX, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Perforation notches
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(stubX, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(stubX, height, 14, 0, Math.PI * 2);
  ctx.fill();

  // Brand Header
  ctx.fillStyle = "#10b981";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("BOOK YOUR VIBE — TAX INVOICE & RECEIPT", 40, 44);

  // Outlet / Restaurant Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  const restaurantName = order.outletName || "BYV Partner Restaurant";
  ctx.fillText(restaurantName.length > 36 ? `${restaurantName.slice(0, 36)}…` : restaurantName, 40, 84);

  // Order Items
  const { date, time } = formatDateTime(order.createdAt);
  ctx.font = "13px sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("ORDERED ITEMS", 40, 125);

  let currentY = 150;
  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = "#f8fafc";

  const displayItems = order.items.slice(0, 4);
  displayItems.forEach((item) => {
    const itemText = `• ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ""} x${item.quantity}`;
    const priceText = `₹${(item.price * item.quantity).toLocaleString("en-IN")}`;
    ctx.fillText(itemText.length > 35 ? `${itemText.slice(0, 35)}…` : itemText, 40, currentY);
    ctx.fillText(priceText, 440, currentY);
    currentY += 24;
  });

  if (order.items.length > 4) {
    ctx.font = "italic 13px sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`+ ${order.items.length - 4} more item(s)...`, 40, currentY);
    currentY += 22;
  }

  // Divider
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, currentY + 10);
  ctx.lineTo(stubX - 40, currentY + 10);
  ctx.stroke();

  // Financial Breakdown & Metadata
  const metaY = currentY + 38;
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("DATE & TIME", 40, metaY);
  ctx.fillText("CUSTOMER", 220, metaY);
  ctx.fillText("PAYMENT METHOD", 400, metaY);

  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`${date} ${time}`, 40, metaY + 22);
  ctx.fillText(order.customerName || "Customer", 220, metaY + 22);
  ctx.fillText(order.paymentMethod || "Online (UPI/Gateway)", 400, metaY + 22);

  // Total Paid Banner
  const totalY = metaY + 68;
  ctx.fillStyle = "#10b981";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("TOTAL AMOUNT PAID:", 40, totalY);

  ctx.fillStyle = "#facc15";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(`₹${order.totalAmount.toLocaleString("en-IN")}`, 220, totalY + 2);

  ctx.fillStyle = "#34d399";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("✓ PAYMENT VERIFIED & CONFIRMED", 400, totalY);

  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("Present this receipt or scan QR code at counter for order pickup", 40, height - 20);

  // Stub Side (Order ID & Verification QR)
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("ORDER REFERENCE", stubX + 30, 44);
  ctx.font = "bold 18px monospace";
  ctx.fillText(order.orderId, stubX + 30, 70);

  const qrPayload = JSON.stringify({ orderId: order.orderId, vendorId: order.vendorId });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    margin: 0,
    width: 170,
    color: { dark: "#0f172a", light: "#00000000" },
  });
  const qrImg = await loadImage(qrDataUrl);
  const qrSize = 170;
  const qrX = stubX + (stubWidth - qrSize) / 2;
  const qrY = 96;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.fillText("ESTIMATED PREP: ~20 mins", stubX + stubWidth / 2, qrY + qrSize + 28);

  ctx.font = "11px sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("Scan to verify order", stubX + stubWidth / 2, qrY + qrSize + 48);
  ctx.textAlign = "left";

  triggerDownload(canvas.toDataURL("image/png"), `byv-food-invoice-${order.orderId}.png`);
}
