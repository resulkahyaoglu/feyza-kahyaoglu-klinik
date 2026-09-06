export function downloadBase64(filename: string, mime: string, b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

export async function compressImageFile(file: File): Promise<{
  b64: string;
  mime: string;
  name: string;
}> {
  const looksImage =
    file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
  if (!looksImage) throw new Error("Yalnızca görsel yükleyin.");
  if (file.size > 32 * 1024 * 1024) throw new Error("Fotoğraf 32 MB’dan küçük olsun.");

  try {
    const bitmap = await createImageBitmap(file);
    const max = 1280;
    let w = bitmap.width;
    let h = bitmap.height;
    if (w > max || h > max) {
      const r = Math.min(max / w, max / h);
      w = Math.round(w * r);
      h = Math.round(h * r);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Görsel işlenemedi.");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Sıkıştırılamadı."))),
        "image/jpeg",
        0.78,
      );
    });
    const b64 = await readFileAsBase64(new File([blob], "yemek.jpg", { type: "image/jpeg" }));
    const base = file.name.replace(/\.[^.]+$/, "") || "yemek";
    return { b64, mime: "image/jpeg", name: `${base}.jpg` };
  } catch (err) {
    if (file.size <= 900_000 && /jpe?g|png|webp/i.test(file.type || file.name)) {
      return {
        b64: await readFileAsBase64(file),
        mime: file.type || "image/jpeg",
        name: file.name,
      };
    }
    throw err instanceof Error ? err : new Error("Bu görsel okunamadı. JPG veya PNG deneyin.");
  }
}

export async function downloadDietPdf(opts: {
  title: string;
  content: string;
  clientName: string;
  createdAt?: string;
}) {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const fontkitMod = await import("@pdf-lib/fontkit");
  const fontkit = (fontkitMod as { default?: unknown }).default ?? fontkitMod;

  const [regular, bold] = await Promise.all([
    fetch("/fonts/DejaVuSans.ttf").then((r) => r.arrayBuffer()),
    fetch("/fonts/DejaVuSans-Bold.ttf").then((r) => r.arrayBuffer()),
  ]);

  const pdf = await PDFDocument.create();
  // @ts-expect-error fontkit CJS interop
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(regular);
  const fontBold = await pdf.embedFont(bold);

  const sage = rgb(35 / 255, 115 / 255, 97 / 255);
  const ink = rgb(26 / 255, 35 / 255, 33 / 255);
  const muted = rgb(109 / 255, 120 / 255, 117 / 255);
  const sand = rgb(250 / 255, 249 / 255, 247 / 255);

  const pageSize: [number, number] = [595.28, 841.89];
  let page = pdf.addPage(pageSize);
  const margin = 48;
  const maxWidth = pageSize[0] - margin * 2;
  let y = pageSize[1] - 56;

  const drawHeader = () => {
    page.drawRectangle({
      x: 0,
      y: pageSize[1] - 28,
      width: pageSize[0],
      height: 28,
      color: sage,
    });
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageSize[0],
      height: 28,
      color: sand,
    });
    page.drawText("Dyt. Feyza Kahyaoğlu  ·  Diyet Listesi", {
      x: margin,
      y: 10,
      size: 8,
      font,
      color: muted,
    });
  };

  drawHeader();

  page.drawText("Dyt. Feyza Kahyaoğlu", {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: sage,
  });
  y -= 16;
  page.drawText("Diyetisyen", {
    x: margin,
    y,
    size: 9,
    font,
    color: muted,
  });
  y -= 28;

  page.drawText(opts.title, {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: ink,
    maxWidth,
  });
  y -= 22;
  page.drawText(`Danışan: ${opts.clientName}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: ink,
  });
  y -= 28;

  const wrap = (text: string, size: number, f = font) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(trial, size) > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = trial;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  for (const raw of opts.content.replace(/\r/g, "").split("\n")) {
    if (y < 64) {
      page = pdf.addPage(pageSize);
      drawHeader();
      y = pageSize[1] - 56;
    }
    if (!raw.trim()) {
      y -= 8;
      continue;
    }
    const isHead =
      raw.startsWith("Sabah") ||
      raw.startsWith("Öğle") ||
      raw.startsWith("Akşam") ||
      raw.startsWith("Kuşluk") ||
      raw.startsWith("İkindi") ||
      raw.startsWith("Gece") ||
      raw.startsWith("Su ");
    const size = isHead ? 11 : 10;
    const f = isHead ? fontBold : font;
    const lines = wrap(raw, size, f);
    for (const ln of lines) {
      if (y < 64) {
        page = pdf.addPage(pageSize);
        drawHeader();
        y = pageSize[1] - 56;
      }
      page.drawText(ln, { x: margin, y, size, font: f, color: ink });
      y -= size + 5;
    }
  }

  const bytes = await pdf.save();
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(opts.title)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replaceAll("ı", "i")
      .replaceAll("ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("ş", "s")
      .replaceAll("ö", "o")
      .replaceAll("ç", "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "diyet-listesi"
  );
}
