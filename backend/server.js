const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', () => resolve({ type: 'structured', data: rows }))
      .on('error', reject);
  });
}

function parseExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);
  return { type: 'structured', data: rows };
}

function analyzeText(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  
  const delimiters = ['\t', ',', '|', ';'];
  let best = null;
  
  for (const delim of delimiters) {
    const splitLines = lines.map(l => l.split(delim));
    if (splitLines.length < 2) continue;
    const colCounts = splitLines.map(arr => arr.length);
    const mode = colCounts.reduce((a,b,i,arr) => 
      arr.filter(v => v === arr[i]).length > arr.filter(v => v === a).length ? arr[i] : a, colCounts[0]);
    if (mode >= 2 && colCounts.filter(c => c === mode).length >= Math.max(3, splitLines.length * 0.5)) {
      const headers = splitLines[0].map(h => h.trim());
      const rows = splitLines.slice(1).filter(r => r.length === mode).map(r => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = r[i]?.trim() || '');
        return obj;
      });
      if (rows.length > 0) {
        best = { type: 'structured', data: rows, delimiter: delim };
        break;
      }
    }
  }
  
  if (best) return best;
  
  const words = text.split(/\s+/).filter(w => w);
  return {
    type: 'text',
    text: text,
    stats: { 
      charCount: text.length, 
      lineCount: lines.length, 
      wordCount: words.length, 
      preview: text.slice(0, 2000) 
    }
  };
}

function parseTextFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  return analyzeText(text);
}

async function parsePdfFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return analyzeText(data.text);
}

async function parseDocFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return analyzeText(result.value);
}

function toNum(v) {
  if (v === null || v === undefined) return NaN;
  const s = String(v).replace(/[$₹,\s%]/g, '');
  const n = Number(s);
  return isNaN(n) ? NaN : n;
}

function isNumericColumn(key, rows) {
  const vals = rows.map(r => r[key]).filter(v => v !== '' && v !== null && v !== undefined);
  if (vals.length === 0) return false;
  const nums = vals.map(toNum).filter(v => !isNaN(v));
  return nums.length >= vals.length * 0.5;
}

function isDateColumn(key, rows) {
  const vals = rows.map(r => r[key]).filter(v => v !== '' && v !== null && v !== undefined);
  if (vals.length === 0) return false;
  const dates = vals.filter(v => !isNaN(Date.parse(v)));
  return dates.length >= vals.length * 0.5;
}

function computeDashboardData(rows) {
  if (!rows || rows.length === 0) return { summary: {}, chartData: [], rowCount: 0 };
  
  const keys = Object.keys(rows[0]);
  const numericCols = keys.filter(k => isNumericColumn(k, rows));
  const dateCols = keys.filter(k => isDateColumn(k, rows));
  const categoricalCols = keys.filter(k => !numericCols.includes(k) && !dateCols.includes(k));
  
  const summary = {};
  numericCols.forEach(col => {
    const nums = rows.map(r => toNum(r[col])).filter(v => !isNaN(v));
    if (nums.length) {
      const sum = nums.reduce((a,b)=>a+b,0);
      summary[col] = {
        sum,
        avg: sum / nums.length,
        max: Math.max(...nums),
        min: Math.min(...nums),
        count: nums.length
      };
    }
  });
  
  const chartData = [];
  
  // Bar chart: top categorical by first numeric
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    const catCol = categoricalCols[0];
    const numCol = numericCols[0];
    const map = {};
    rows.forEach(r => {
      const k = String(r[catCol] || 'Unknown');
      const v = toNum(r[numCol]);
      if (!isNaN(v)) map[k] = (map[k] || 0) + v;
    });
    const data = Object.entries(map)
      .map(([name, value]) => ({ [catCol]: name, [numCol]: value }))
      .sort((a,b) => b[numCol] - a[numCol])
      .slice(0, 10);
    if (data.length > 0) {
      chartData.push({ chartType: 'bar', title: `${numCol} by ${catCol}`, xKey: catCol, yKey: numCol, data });
    }
    
    // Pie chart
    const pieData = Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value)
      .slice(0, 6);
    if (pieData.length > 1) {
      chartData.push({ chartType: 'pie', title: `Share by ${catCol}`, nameKey: 'name', valueKey: 'value', data: pieData });
    }
  }
  
  // Horizontal bar for another categorical if available
  if (categoricalCols.length > 1 && numericCols.length > 0) {
    const catCol = categoricalCols[1];
    const numCol = numericCols[0];
    const map = {};
    rows.forEach(r => {
      const k = String(r[catCol] || 'Unknown');
      const v = toNum(r[numCol]);
      if (!isNaN(v)) map[k] = (map[k] || 0) + v;
    });
    const data = Object.entries(map)
      .map(([name, value]) => ({ [catCol]: name, [numCol]: value }))
      .sort((a,b) => b[numCol] - a[numCol])
      .slice(0, 8);
    if (data.length > 0) {
      chartData.push({ chartType: 'horizontalBar', title: `${numCol} by ${catCol}`, xKey: catCol, yKey: numCol, data });
    }
  }
  
  // Grouped bar for multiple numerics
  if (numericCols.length >= 2 && categoricalCols.length > 0) {
    const catCol = categoricalCols[0];
    const selected = numericCols.slice(0, 3);
    const data = rows.slice(0, 15).map(r => {
      const obj = { [catCol]: String(r[catCol] || 'Unknown').slice(0, 20) };
      selected.forEach(k => { obj[k] = toNum(r[k]) || 0; });
      return obj;
    });
    chartData.push({ chartType: 'groupedBar', title: 'Metric Comparison', keys: selected, xKey: catCol, data });
  }
  
  // Count/frequency bar for a categorical
  if (categoricalCols.length > 0) {
    const catCol = categoricalCols[0];
    const freq = {};
    rows.forEach(r => {
      const k = String(r[catCol] || 'Unknown');
      freq[k] = (freq[k] || 0) + 1;
    });
    const data = Object.entries(freq)
      .map(([name, count]) => ({ [catCol]: name, Count: count }))
      .sort((a,b) => b.Count - a.Count)
      .slice(0, 10);
    if (data.length > 0) {
      chartData.push({ chartType: 'bar', title: `Count by ${catCol}`, xKey: catCol, yKey: 'Count', data });
    }
  }
  
  // Line chart for date + numeric
  if (dateCols.length > 0 && numericCols.length > 0) {
    const dateCol = dateCols[0];
    const numCol = numericCols[0];
    const map = {};
    rows.forEach(r => {
      const d = new Date(r[dateCol]);
      if (!isNaN(d)) {
        const k = d.toISOString().slice(0,10);
        const v = toNum(r[numCol]);
        if (!isNaN(v)) map[k] = (map[k] || 0) + v;
      }
    });
    const data = Object.entries(map)
      .map(([date, value]) => ({ [dateCol]: date, [numCol]: value }))
      .sort((a,b) => new Date(a[dateCol]) - new Date(b[dateCol]));
    if (data.length > 1) {
      chartData.push({ chartType: 'line', title: `${numCol} Over Time`, xKey: dateCol, yKey: numCol, data });
    }
  }
  
  return {
    summary,
    numericCols,
    categoricalCols,
    dateCols,
    chartData,
    rowCount: rows.length,
    columns: keys
  };
}

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;
    let result;
    
    if (ext === '.csv') {
      result = await parseCsvFile(filePath);
    } else if (['.xlsx', '.xls'].includes(ext)) {
      result = parseExcelFile(filePath);
    } else if (ext === '.pdf') {
      result = await parsePdfFile(filePath);
    } else if (['.doc', '.docx'].includes(ext)) {
      result = await parseDocFile(filePath);
    } else if (ext === '.txt' || ext === '.text') {
      result = parseTextFile(filePath);
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Unsupported file type. Supported: CSV, Excel, PDF, DOC/DOCX, TXT' });
    }
    
    if (result.type === 'structured') {
      result.dashboard = computeDashboardData(result.data);
    }
    
    fs.unlinkSync(filePath);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to process file' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
