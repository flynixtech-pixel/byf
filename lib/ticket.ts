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

/** Draws a vertical printable ticket for a booking and triggers a PNG download. */
export async function downloadBookingTicket(booking: Booking) {
  try {
    // Vertical Ticket Dimensions
    const width = 560;
    const height = 960;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background Card - Slate Dark Theme Gradient
    const cardGradient = ctx.createLinearGradient(0, 0, 0, height);
    cardGradient.addColorStop(0, "#0b0f19");
    cardGradient.addColorStop(0.5, "#151d2a");
    cardGradient.addColorStop(1, "#0d131f");
    ctx.fillStyle = cardGradient;
    ctx.fillRect(0, 0, width, height);

    // Outer Decorative Border
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, width - 16, height - 16);

    // Inner Accent Glow Box for Top Header
    const headerBg = ctx.createLinearGradient(20, 20, width - 40, 140);
    headerBg.addColorStop(0, "#1e293b");
    headerBg.addColorStop(1, "#0f172a");
    ctx.fillStyle = headerBg;
    drawRoundRect(ctx, 24, 24, width - 48, 126, 18);
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Top Brand Header
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("BOOK YOUR VIBE", 44, 54);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("OFFICIAL TICKET", width - 44, 54);
    ctx.textAlign = "left";

    // Listing Title (Venue Name)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    const titleText = booking.listingTitle || (booking.sport ? `${booking.sport} Venue` : "Venue");
    ctx.fillText(titleText.length > 28 ? `${titleText.slice(0, 28)}…` : titleText, 44, 92);

    // Order ID Badge
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.fillText("ORDER ID:", 44, 122);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 14px monospace";
    ctx.fillText(booking.orderId, 116, 122);

    // Format Date & Time
    const { date, time } = formatDateTime(booking.dateTime);
    
    // Format Duration
    const durationText = booking.duration
      ? booking.duration
      : booking.durationMinutes
      ? `${booking.durationMinutes} Mins`
      : "1 Hour";

    // Format Court
    const courtText = booking.courtName
      ? booking.courtName
      : booking.courtNames && booking.courtNames.length > 0
      ? booking.courtNames.join(", ")
      : "Court 1";

    // Format Sport
    const sportText = booking.sport ? booking.sport : "Turf Sports";

    // Grid Section Background Card
    ctx.fillStyle = "rgba(30, 41, 59, 0.4)";
    drawRoundRect(ctx, 24, 168, width - 48, 480, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Helper to draw a key-value block
    const drawFieldBlock = (
      label: string,
      value: string,
      x: number,
      y: number,
      w: number,
      valueColor = "#ffffff",
      isBadge = false
    ) => {
      // Label
      ctx.font = "bold 11px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(label.toUpperCase(), x, y);

      // Value
      if (isBadge) {
        const isConfirmed = value === "Confirmed" || value === "Completed";
        const badgeBg = isConfirmed ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)";
        const badgeText = isConfirmed ? "#34d399" : "#fbbf24";

        ctx.fillStyle = badgeBg;
        drawRoundRect(ctx, x, y + 8, ctx.measureText(value).width + 24, 28, 8);
        ctx.fill();

        ctx.font = "bold 13px sans-serif";
        ctx.fillStyle = badgeText;
        ctx.fillText(value, x + 12, y + 27);
      } else {
        ctx.font = "bold 17px sans-serif";
        ctx.fillStyle = valueColor;
        const truncated = value.length > 18 ? `${value.slice(0, 18)}…` : value;
        ctx.fillText(truncated, x, y + 26);
      }
    };

    const col1X = 48;
    const col2X = 300;
    const colW = 210;

    // Row 1: DATE & TIME
    drawFieldBlock("Date", date, col1X, 200, colW);
    drawFieldBlock("Time", time, col2X, 200, colW);

    // Row 2: DURATION & COURT
    drawFieldBlock("Duration", durationText, col1X, 310, colW, "#38bdf8");
    drawFieldBlock("Court", courtText, col2X, 310, colW);

    // Row 3: SPORTS & BOOKED BY (CUSTOMER)
    drawFieldBlock("Sports", sportText, col1X, 420, colW, "#f472b6");
    drawFieldBlock("Booked By (Customer)", booking.customerName || "Customer", col2X, 420, colW);

    // Row 4: STATUS & AMOUNT PAID
    drawFieldBlock("Status", booking.status || "Confirmed", col1X, 530, colW, "#ffffff", true);
    const paidAmt = booking.paidAmount ?? booking.totalAmount;
    drawFieldBlock("Amount Paid", `Rs ${paidAmt}`, col2X, 530, colW, "#facc15");

    // Perforation Notch Y Position
    const perfY = 670;

    // Perforation Dashed Line
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(28, perfY);
    ctx.lineTo(width - 28, perfY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Circular Cutout Notches (Left & Right)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, perfY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width, perfY, 18, 0, Math.PI * 2);
    ctx.fill();

    // Bottom Stub Container (Scanner Section)
    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
    drawRoundRect(ctx, 24, 690, width - 48, 245, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
    ctx.stroke();

    // Stub Title
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ENTRY SCANNER QR", width / 2, 715);

    const qrSize = 160;
    const qrX = (width - qrSize) / 2;
    const qrY = 728;

    // White Background Frame for QR Code
    ctx.fillStyle = "#ffffff";
    drawRoundRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 14);
    ctx.fill();

    // Directly draw QR using offscreen canvas to avoid async image load failures
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, bookingQrPayload(booking), {
      margin: 1,
      width: qrSize,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // Instructions text below QR
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Scan at venue entrance for check-in", width / 2, qrY + qrSize + 26);

    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`REF: ${booking.orderId}`, width / 2, qrY + qrSize + 44);

    ctx.textAlign = "left";

    // Trigger Download using Blob URL for maximum browser compatibility
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
