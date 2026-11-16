const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Lightweight pure Node.js PNG generator (No external dependencies)
function createPng(size, r, g, b, a = 255) {
  const width = size;
  const height = size;

  // Each scanline begins with a filter byte (0 = None) followed by width * 4 bytes (RGBA)
  const rowBytes = 1 + width * 4;
  const buffer = Buffer.alloc(height * rowBytes);

  const radius = width / 2;
  const center = width / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    buffer[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Crimson circular crest with dark obsidian border
      if (dist < radius - 1) {
        if (dist > radius - 3) {
          // Inner border
          buffer[pixelOffset] = 239;     // R
          buffer[pixelOffset + 1] = 68;  // G
          buffer[pixelOffset + 2] = 68;  // B
          buffer[pixelOffset + 3] = 255; // A
        } else if (dist < radius * 0.45) {
          // Central emblem star/core
          buffer[pixelOffset] = 255;
          buffer[pixelOffset + 1] = 255;
          buffer[pixelOffset + 2] = 255;
          buffer[pixelOffset + 3] = 255;
        } else {
          // Main crimson seal
          buffer[pixelOffset] = r;
          buffer[pixelOffset + 1] = g;
          buffer[pixelOffset + 2] = b;
          buffer[pixelOffset + 3] = a;
        }
      } else {
        // Transparent outside
        buffer[pixelOffset] = 0;
        buffer[pixelOffset + 1] = 0;
        buffer[pixelOffset + 2] = 0;
        buffer[pixelOffset + 3] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(buffer);

  // Build PNG chunks
  function makeChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const toCrc = Buffer.concat([typeBuf, data]);

    const crcVal = crc32(toCrc);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal >>> 0, 0);

    return Buffer.concat([length, typeBuf, data, crcBuf]);
  }

  // Basic CRC32
  function crc32(buf) {
    let table = crc32.table;
    if (!table) {
      table = crc32.table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
          c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
        }
        table[i] = c;
      }
    }
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return c ^ 0xffffffff;
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icon 16, 32, 48, 128
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const png = createPng(size, 202, 0, 25); // #ca0019
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png`);
});

// Also copy favicon.svg
const svgSrc = path.join(__dirname, '..', 'frontend', 'public', 'favicon.svg');
if (fs.existsSync(svgSrc)) {
  fs.copyFileSync(svgSrc, path.join(iconsDir, 'icon.svg'));
  console.log('Copied icon.svg');
}
