const HEADER_SIZE = 0x100;
const INDEX_START = 0x100;
const IMAGES_START = 0x4100;
const IMAGE_W = 74;
const IMAGE_H = 86;
const IMAGE_PIXELS = IMAGE_W * IMAGE_H * 4;
const IMAGE_BLOCK = 25600; // 74*86*4 + padding

let db = null; // { header, signatures[], images[], indexRegionSz }

// DOM
const dbForm = document.getElementById("db-form");
const dbInput = document.getElementById("db-input");
const dbStatus = document.getElementById("db-status");
const editor = document.getElementById("editor");
const messageBox = document.getElementById("message");
const countLabel = document.getElementById("count-label");
const cardGrid = document.getElementById("card-grid");
const addForm = document.getElementById("add-form");
const imageInput = document.getElementById("image-input");
const crcInput = document.getElementById("crc-input");
const downloadBtn = document.getElementById("download-btn");
const downloadImagesBtn = document.getElementById("download-images-btn"); // NEU

function setMessage(text) {
  if (!text) {
    messageBox.hidden = true;
    messageBox.textContent = "";
  } else {
    messageBox.hidden = false;
    messageBox.textContent = text;
  }
}

dbForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage("");
  const file = dbInput.files[0];
  if (!file) return;
  try {
    const buf = await file.arrayBuffer();
    db = parseLabelsDb(buf);
    dbStatus.textContent = `${db.signatures.length} images loaded`;
    editor.hidden = false;
    downloadBtn.disabled = false;
    downloadImagesBtn.disabled = false; // NEU
    renderGrid();
    setMessage("DB loaded successfully.");
  } catch (err) {
    console.error(err);
    setMessage("Error loading DB: " + err.message);
  }
});

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!db) {
    setMessage("No DB loaded – please load labels.db first.");
    return;
  }
  const imgFile = imageInput.files[0];
  let crc = crcInput.value.trim().toUpperCase().replace(/^0X/, "");
  if (!imgFile || crc.length !== 8 || !/^[0-9A-F]{8}$/.test(crc)) {
    setMessage("Please select a PNG and enter a valid 8-digit hex CRC32.");
    return;
  }
  try {
    const bgra = await pngFileToBGRA(imgFile);
    const sig = parseInt(crc, 16) >>> 0;

    let idx = db.signatures.findIndex((s) => s === sig);
    if (idx === -1) {
      db.signatures.push(sig);
      db.images.push(bgra);
    } else {
      db.images[idx] = bgra;
    }

    renderGrid();
    setMessage("Inserted / updated CRC " + crc);
    addForm.reset();
  } catch (err) {
    console.error(err);
    setMessage("Error processing PNG: " + err.message);
  }
});

downloadBtn.addEventListener("click", () => {
  if (!db) {
    setMessage("No DB loaded – nothing to download.");
    return;
  }
  const bytes = buildLabelsDb(db);
  const blob = new Blob([bytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "labels_modified.db";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// ---- labels.db parsing / building ----

function parseLabelsDb(buf) {
  const bytes = new Uint8Array(buf);
  if (bytes.length < IMAGES_START) {
    throw new Error("File too small to be labels.db");
  }
  const header = bytes.slice(0, HEADER_SIZE);
  const indexRegionSz = IMAGES_START - INDEX_START;
  const indexRegion = bytes.slice(INDEX_START, IMAGES_START);
  const dv = new DataView(
    indexRegion.buffer,
    indexRegion.byteOffset,
    indexRegion.byteLength
  );
  const signatures = [];
  const numEntries = indexRegionSz / 4;

  for (let i = 0; i < numEntries; i++) {
    const val = dv.getUint32(i * 4, true); // little endian
    if (val === 0xffffffff) break;
    signatures.push(val);
  }

  const images = [];
  let pos = IMAGES_START;
  for (let i = 0; i < signatures.length; i++) {
    if (pos + IMAGE_BLOCK > bytes.length) {
      throw new Error("Truncated image data");
    }
    images.push(bytes.slice(pos, pos + IMAGE_PIXELS));
    pos += IMAGE_BLOCK;
  }

  return { header, signatures, images, indexRegionSz };
}

function buildLabelsDb(db) {
  const indexRegionSz = db.indexRegionSz;
  const numEntries = indexRegionSz / 4;
  const numImages = db.signatures.length;

  // sort signatures + images gemeinsam
  const indices = db.signatures.map((_, i) => i);
  indices.sort((a, b) => db.signatures[a] - db.signatures[b]);

  const sortedSigs = indices.map((i) => db.signatures[i]);
  const sortedImgs = indices.map((i) => db.images[i]);

  const totalSize = IMAGES_START + IMAGE_BLOCK * numImages;
  const out = new Uint8Array(totalSize);
  out.set(db.header, 0);

  const dv = new DataView(out.buffer);
  const indexStart = INDEX_START;

  for (let i = 0; i < numEntries; i++) {
    const off = indexStart + i * 4;
    if (i < sortedSigs.length) {
      dv.setUint32(off, sortedSigs[i], true);
    } else {
      dv.setUint32(off, 0xffffffff, true);
    }
  }

  let pos = IMAGES_START;
  for (let i = 0; i < sortedImgs.length; i++) {
    out.set(sortedImgs[i], pos);
    // rest des Blocks (Padding) lassen wir 0 – Analogue scheint 0xFF zu nutzen,
    // aber 0 ist in der Praxis okay.
    pos += IMAGE_BLOCK;
  }

  return out;
}

// ---- PNG ↔ BGRA helpers ----

function pngFileToBGRA(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        // zeichne auf 74x86 Canvas
        const canvas = document.createElement("canvas");
        canvas.width = IMAGE_W;
        canvas.height = IMAGE_H;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, IMAGE_W, IMAGE_H);
        ctx.drawImage(img, 0, 0, IMAGE_W, IMAGE_H);
        const imgData = ctx.getImageData(0, 0, IMAGE_W, IMAGE_H);
        const src = imgData.data; // RGBA
        const out = new Uint8Array(IMAGE_PIXELS);
        for (let i = 0; i < src.length; i += 4) {
          const r = src[i];
          const g = src[i + 1];
          const b = src[i + 2];
          const a = src[i + 3];
          out[i + 0] = b;
          out[i + 1] = g;
          out[i + 2] = r;
          out[i + 3] = a;
        }
        resolve(out);
      };
      img.onerror = () => reject(new Error("Failed to decode PNG"));
      img.src = fr.result;
    };
    fr.onerror = () => reject(new Error("Failed to read file"));
    fr.readAsDataURL(file);
  });
}

function bgraToDataURL(bgra) {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_W;
  canvas.height = IMAGE_H;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(IMAGE_W, IMAGE_H);
  const dst = imgData.data; // RGBA

  for (let i = 0; i < bgra.length; i += 4) {
    const b = bgra[i];
    const g = bgra[i + 1];
    const r = bgra[i + 2];
    const a = bgra[i + 3];
    dst[i + 0] = r;
    dst[i + 1] = g;
    dst[i + 2] = b;
    dst[i + 3] = a;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

downloadImagesBtn.addEventListener("click", async () => {
  if (!db) {
    setMessage("No DB loaded – please load labels.db first.");
    return;
  }

  if (typeof JSZip === "undefined") {
    setMessage("JSZip not found – make sure jszip.min.js is included.");
    return;
  }

  const zip = new JSZip();

  db.signatures.forEach((sig, idx) => {
    const filename = sig.toString(16).toUpperCase().padStart(8, "0") + ".png";
    const dataUrl = bgraToDataURL(db.images[idx]); // wir haben diese Funktion schon
    const base64 = dataUrl.split(",")[1]; // data:image/png;base64,XXXX

    zip.file(filename, base64, { base64: true });
  });

  try {
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "labels-images.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage("Images ZIP downloaded.");
  } catch (err) {
    console.error(err);
    setMessage("Error creating ZIP: " + err.message);
  }
});

// ---- Rendering ----

function renderGrid() {
  if (!db) return;
  cardGrid.innerHTML = "";
  countLabel.textContent = `${db.signatures.length} entries`;

  db.signatures.forEach((sig, idx) => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.className = "card-thumb";
    img.src = bgraToDataURL(db.images[idx]);
    img.alt = "label";

    const idDiv = document.createElement("div");
    idDiv.className = "card-id";
    idDiv.textContent = sig.toString(16).toUpperCase().padStart(8, "0");

    const btn = document.createElement("button");
    btn.className = "btn-danger card-remove";
    btn.textContent = "Remove";
    btn.addEventListener("click", () => {
      db.signatures.splice(idx, 1);
      db.images.splice(idx, 1);
      renderGrid();
    });

    card.appendChild(img);
    card.appendChild(idDiv);
    card.appendChild(btn);
    cardGrid.appendChild(card);
  });
}
