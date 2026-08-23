const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../paintings.csv');
const OUTPUT_PATH = path.join(__dirname, '../app/data/paintings.ts');

function parseCSV(content) {
  const lines = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Double quotes inside quotes means a single quote character
          cell += '"';
          i++; // Skip next quote
        } else {
          // End of quotes
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
        row.push(cell.trim());
        // Only push non-empty rows
        if (row.length > 1 || row[0] !== '') {
          lines.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
  }

  // Handle final cell if no trailing newline
  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    lines.push(row);
  }

  return lines;
}

async function processImages(imagesString) {
  if (!imagesString) return [];
  const images = imagesString.split(',').map(img => img.trim()).filter(Boolean);
  const processed = [];

  for (const img of images) {
    // If it's a URL or absolute path, leave it as is
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/')) {
      processed.push(img);
      continue;
    }

    const ext = path.extname(img).toLowerCase();
    if (ext === '.heic') {
      const baseName = path.basename(img, path.extname(img));
      const heicFilename = img;
      const jpgFilename = `${baseName}.jpg`;

      const imagesDir = path.join(__dirname, '../public/images');
      const localHeicPath = path.join(imagesDir, heicFilename);
      let resolvedHeicPath = localHeicPath;

      // Scan directory for case-insensitive match (e.g. .HEIC instead of .heic)
      if (!fs.existsSync(localHeicPath) && fs.existsSync(imagesDir)) {
        const files = fs.readdirSync(imagesDir);
        const found = files.find(f => f.toLowerCase() === heicFilename.toLowerCase());
        if (found) {
          resolvedHeicPath = path.join(imagesDir, found);
        }
      }

      if (fs.existsSync(resolvedHeicPath)) {
        const localJpgPath = path.join(imagesDir, jpgFilename);
        if (!fs.existsSync(localJpgPath)) {
          console.log(`Converting HEIC file: ${heicFilename} -> ${jpgFilename}...`);
          try {
            const heicConvert = require('heic-convert');
            const inputBuffer = fs.readFileSync(resolvedHeicPath);
            const outputBuffer = await heicConvert({
              buffer: inputBuffer,
              format: 'JPEG',
              quality: 0.92 // High quality
            });
            fs.writeFileSync(localJpgPath, outputBuffer);
            console.log(`Successfully converted ${heicFilename} to ${jpgFilename}`);
          } catch (err) {
            console.error(`Failed to convert HEIC image ${heicFilename}:`, err);
            processed.push(`/images/${heicFilename}`); // fallback
            continue;
          }
        }
        processed.push(`/images/${jpgFilename}`);
      } else {
        console.warn(`Warning: HEIC image not found in public/images: ${heicFilename}`);
        processed.push(`/images/${heicFilename}`); // fallback
      }
    } else {
      // Standard image format, mapping to local public/images folder
      processed.push(`/images/${img}`);
    }
  }

  return processed;
}

async function run() {
  console.log('Parsing paintings.csv database...');
  
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Error: CSV file not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvContent);

  if (rows.length < 1) {
    console.error('Error: CSV file is empty.');
    process.exit(1);
  }

  const headers = rows[0].map(h => h.toLowerCase());
  const dataRows = rows.slice(1);
  
  const paintings = [];

  for (let idx = 0; idx < dataRows.length; idx++) {
    const row = dataRows[idx];
    
    // Helper to find column index by name
    const getValue = (columnName) => {
      const colIdx = headers.indexOf(columnName.toLowerCase());
      return colIdx !== -1 && row[colIdx] !== undefined ? row[colIdx] : '';
    };

    const id = getValue('id');
    const title = getValue('title');
    const series = getValue('series');
    const size = getValue('size') || getValue('dimensions');
    const medium = getValue('medium');
    const priceRaw = getValue('price');
    const status = getValue('status').toLowerCase() === 'sold' ? 'sold' : 'available';
    const year = getValue('year') || new Date().getFullYear().toString();
    const imagesRaw = getValue('images');
    const description = getValue('description');
    const details = getValue('details') || getValue('additionalinfo');

    if (!id || !title) {
      console.warn(`Warning: Row ${idx + 2} is missing ID or Title, skipping.`);
      continue;
    }

    // Process price
    const priceNum = parseFloat(priceRaw.replace(/[^0-9.]/g, '')) || 0;
    const formattedPrice = priceNum > 0 
      ? `$${priceNum.toLocaleString()}`
      : 'Contact for Price';

    // Process images (async)
    const images = await processImages(imagesRaw);

    paintings.push({
      id,
      title,
      series,
      size,
      medium,
      price: priceNum,
      formattedPrice,
      description,
      details,
      images,
      status,
      year
    });
  }

  const fileContent = `// THIS FILE IS AUTOMATICALLY GENERATED. DO NOT EDIT DIRECTLY.
// To modify details, update paintings.csv in the root folder and run builds.

export interface Painting {
  id: string;
  title: string;
  series: string;
  size: string;
  medium: string;
  price: number;
  formattedPrice: string;
  description: string;
  details: string;
  images: string[];
  status: 'available' | 'sold';
  year: string;
}

export const paintings: Painting[] = ${JSON.stringify(paintings, null, 2)};

`;

  // Create data directory if it doesn't exist
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, fileContent, 'utf-8');
  console.log(`Successfully generated ${paintings.length} paintings into ${OUTPUT_PATH}`);
}

run();
