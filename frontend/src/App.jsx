import { useState, useRef, useEffect, useMemo } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';

const api = axios.create({
  baseURL: import.meta.env.PROD ? 'https://dashboard-vvup.onrender.com' : '/api'
});
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, BarChart3, Download, Image as ImageIcon, FileCode,
  Presentation, FileSpreadsheet, TrendingUp, Activity, Database,
  X, ChevronDown, ChevronUp, Loader2, Table
} from 'lucide-react';
import ChartRenderer from './components/ChartRenderer';

const COLORS = ['#10B981', '#34D399', '#059669', '#6EE7B7', '#047857', '#86EFAC', '#A7F3D0', '#064E3B', '#3B82F6', '#6366F1'];

function formatNumber(n) {
  if (typeof n !== 'number') return n;
  if (n >= 1e7) return (n / 1e7).toFixed(2) + 'Cr';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const end = Number(value) || 0;
    if (!end) { setDisplay(0); return; }
    let start = 0;
    const duration = 1200;
    let raf;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplay(Math.floor(progress * end));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>{formatNumber(display)}</span>;
}

function KPICard({ title, value, icon: Icon, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-800">
        <AnimatedCounter value={value} />
      </div>
    </motion.div>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const dashboardRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError('');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) { setError('Please select a file first'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async () => {
    if (!dashboardRef.current) return;
    const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#f8fafc' });
    const link = document.createElement('a');
    link.download = 'dashboard.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const downloadPDF = async () => {
    if (!dashboardRef.current) return;
    const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#f8fafc' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('dashboard.pdf');
  };

  const downloadPPT = () => {
    if (!result) return;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.defineSlideMaster({
      title: 'MASTER_SLIDE',
      background: { color: 'F8FAFC' },
      objects: [{ rect: { x: 0, y: 0, w: '100%', h: 0.75, fill: { color: '059669' } } }]
    });

    const slide1 = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    slide1.addText('Dashboard Summary', { x: 0.5, y: 0.2, fontSize: 24, color: 'FFFFFF', bold: true });
    if (result.dashboard) {
      const d = result.dashboard;
      slide1.addText(`Total Rows: ${d.rowCount || 0}`, { x: 0.5, y: 1.2, fontSize: 16 });
      slide1.addText(`Columns: ${(d.columns || []).join(', ')}`, { x: 0.5, y: 1.8, fontSize: 14, w: 9 });
    }

    if (result.dashboard?.chartData) {
      result.dashboard.chartData.forEach((chart) => {
        const s = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
        s.addText(chart.title, { x: 0.5, y: 0.2, fontSize: 20, color: 'FFFFFF', bold: true });
        if (chart.chartType === 'bar' || chart.chartType === 'groupedBar') {
          const cats = chart.data.map(d => d[chart.xKey]);
          const vals = chart.keys
            ? chart.keys.map(k => ({ name: k, labels: cats, values: chart.data.map(d => d[k]) }))
            : [{ name: chart.yKey, labels: cats, values: chart.data.map(d => d[chart.yKey]) }];
          s.addChart(pptx.ChartType.bar, { x: 0.5, y: 1, w: 9, h: 4.5, chartColors: COLORS, barDir: 'col', data: vals });
        } else if (chart.chartType === 'horizontalBar') {
          const cats = chart.data.map(d => d[chart.xKey]);
          const vals = [{ name: chart.yKey, labels: cats, values: chart.data.map(d => d[chart.yKey]) }];
          s.addChart(pptx.ChartType.bar, { x: 0.5, y: 1, w: 9, h: 4.5, chartColors: COLORS, barDir: 'bar', data: vals });
        } else if (chart.chartType === 'pie') {
          const data = chart.data.map(d => ({ name: d.name, values: [d.value] }));
          s.addChart(pptx.ChartType.pie, { x: 0.5, y: 1, w: 9, h: 4.5, chartColors: COLORS, data });
        } else if (chart.chartType === 'line') {
          const cats = chart.data.map(d => d[chart.xKey]);
          const vals = [{ name: chart.yKey, labels: cats, values: chart.data.map(d => d[chart.yKey]) }];
          s.addChart(pptx.ChartType.line, { x: 0.5, y: 1, w: 9, h: 4.5, chartColors: COLORS, data: vals });
        }
      });
    }

    pptx.writeFile({ fileName: 'dashboard.pptx' });
  };

  const downloadHTML = () => {
    if (!result) return;
    const d = result.dashboard || {};
    const chartDivs = (d.chartData || []).map((chart) => {
      let rows = '';
      if (chart.chartType === 'pie') {
        rows = chart.data.map(r => `<tr><td>${r.name}</td><td>${formatNumber(r.value)}</td></tr>`).join('');
      } else {
        const keys = chart.keys ? chart.keys : [chart.yKey];
        const ths = `<th>${chart.xKey}</th>` + keys.map(k => `<th>${k}</th>`).join('');
        rows = chart.data.map(r => `<tr><td>${r[chart.xKey]}</td>` + keys.map(k => `<td>${formatNumber(r[k])}</td>`).join('') + '</tr>').join('');
        return `<div style="margin:20px 0;"><h3>${chart.title}</h3><table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
      }
      return `<div style="margin:20px 0;"><h3>${chart.title}</h3><table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join('');

    const summaryRows = Object.entries(d.summary || {}).map(([k, v]) => `
      <tr><td>${k}</td><td>${formatNumber(v.sum)}</td><td>${formatNumber(v.avg)}</td><td>${formatNumber(v.max)}</td><td>${formatNumber(v.min)}</td></tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Dashboard Export</title>
<style>
body{font-family:Inter,system-ui,sans-serif;background:#f8fafc;padding:40px;color:#111827}
.card{background:#fff;border-radius:16px;padding:24px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
h1{color:#059669}
table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{border:1px solid #e2e8f0;padding:8px 12px;text-align:left}
th{background:#ecfdf5;color:#064e3b}
</style></head>
<body>
<div class="card"><h1>Dashboard Summary</h1><p>Rows: ${d.rowCount || 0}</p><p>Columns: ${(d.columns || []).join(', ')}</p></div>
<div class="card"><h2>Summary Statistics</h2>
<table><thead><tr><th>Column</th><th>Sum</th><th>Avg</th><th>Max</th><th>Min</th></tr></thead><tbody>${summaryRows}</tbody></table></div>
<div class="card">${chartDivs}</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpiData = useMemo(() => {
    if (!result?.dashboard) return [];
    const d = result.dashboard;
    const firstNum = d.numericCols?.[0];
    const stats = firstNum ? d.summary[firstNum] : null;
    return [
      { title: 'Total Rows', value: d.rowCount || 0, icon: Database, color: 'bg-emerald-600' },
      { title: 'Total Sum', value: stats?.sum || 0, icon: TrendingUp, color: 'bg-emerald-500' },
      { title: 'Average', value: stats?.avg || 0, icon: Activity, color: 'bg-emerald-400' },
      { title: 'Maximum', value: stats?.max || 0, icon: BarChart3, color: 'bg-emerald-700' },
    ];
  }, [result]);

  const insights = useMemo(() => {
    if (!result?.dashboard) return [];
    const d = result.dashboard;
    const lines = [];
    if (d.rowCount) lines.push(`Dataset contains ${d.rowCount} rows with ${(d.columns || []).length} columns.`);
    if (d.numericCols?.length) lines.push(`Numeric columns detected: ${d.numericCols.join(', ')}.`);
    if (d.categoricalCols?.length) lines.push(`Categorical columns detected: ${d.categoricalCols.join(', ')}.`);
    if (d.dateCols?.length) lines.push(`Date columns detected: ${d.dateCols.join(', ')}.`);
    const firstNum = d.numericCols?.[0];
    if (firstNum && d.summary[firstNum]) {
      const s = d.summary[firstNum];
      lines.push(`${firstNum} ranges from ${formatNumber(s.min)} to ${formatNumber(s.max)} with an average of ${formatNumber(s.avg)}.`);
    }
    return lines;
  }, [result]);

  const columns = result?.dashboard?.columns || [];
  const tableRows = result?.data || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2 rounded-xl">
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Dashboard Generator</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Upload Data & Get Insights</p>
            </div>
          </div>
          {result && (
            <div className="flex items-center gap-2">
              <button onClick={downloadImage} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                <ImageIcon size={14} /> PNG
              </button>
              <button onClick={downloadPDF} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                <FileText size={14} /> PDF
              </button>
              <button onClick={downloadPPT} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                <Presentation size={14} /> PPT
              </button>
              <button onClick={downloadHTML} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                <FileCode size={14} /> HTML
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
              dragActive ? 'border-emerald-500 bg-emerald-50 scale-[1.01]' : 'border-slate-300 bg-white hover:border-emerald-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls,.pdf,.doc,.docx,.txt,.text"
              onChange={handleFileChange}
            />
            <motion.div
              animate={dragActive ? { y: [0, -8, 0] } : {}}
              transition={{ repeat: dragActive ? Infinity : 0, duration: 1.2 }}
              className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4"
            >
              <Upload size={28} />
            </motion.div>
            <p className="text-slate-700 font-medium mb-1">Drag & drop your file here</p>
            <p className="text-slate-400 text-sm mb-4">or click to browse</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-200"
            >
              Select File
            </button>
            <p className="text-xs text-slate-400 mt-4">Supports CSV, Excel, PDF, DOC/DOCX, TXT</p>
          </div>

          {file && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setFile(null); setResult(null); setError(''); }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
                  {loading ? 'Analyzing...' : 'Generate Dashboard'}
                </button>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100"
            >
              {error}
            </motion.div>
          )}
        </motion.div>

        {/* Dashboard */}
        <AnimatePresence>
          {result && (
            <motion.div
              ref={dashboardRef}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-10"
            >
              {result.type === 'text' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800 mb-4">Text Analysis</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{result.stats.wordCount.toLocaleString()}</p>
                      <p className="text-xs text-slate-500 mt-1">Words</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{result.stats.lineCount.toLocaleString()}</p>
                      <p className="text-xs text-slate-500 mt-1">Lines</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{result.stats.charCount.toLocaleString()}</p>
                      <p className="text-xs text-slate-500 mt-1">Characters</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{Math.round(result.stats.wordCount / Math.max(result.stats.lineCount, 1))}</p>
                      <p className="text-xs text-slate-500 mt-1">Words / Line</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Preview</h3>
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono max-h-96 overflow-auto">{result.stats.preview}</pre>
                  </div>
                </div>
              )}

              {result.type === 'structured' && result.dashboard && (
                <div className="space-y-6">
                  {/* KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kpiData.map((kpi, i) => (
                      <KPICard key={i} {...kpi} />
                    ))}
                  </div>

                  {/* Insights */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Activity size={16} className="text-emerald-600" />
                      <h3 className="text-sm font-semibold text-slate-700">Key Insights</h3>
                    </div>
                    <ul className="space-y-2">
                      {insights.map((line, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </motion.div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {result.dashboard.chartData?.map((chart, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * idx }}
                        className={chart.chartType === 'line' || chart.chartType === 'groupedBar' ? 'lg:col-span-2' : ''}
                      >
                        <ChartRenderer chart={chart} index={idx} />
                      </motion.div>
                    ))}
                  </div>

                  {/* Data Preview Table */}
                  {tableRows.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={() => setShowTable(v => !v)}
                        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Table size={16} className="text-emerald-600" />
                          <h3 className="text-sm font-semibold text-slate-700">Data Preview</h3>
                          <span className="text-xs text-slate-400">({tableRows.length} rows)</span>
                        </div>
                        {showTable ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </button>
                      <AnimatePresence>
                        {showTable && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-auto"
                          >
                            <table className="w-full text-sm">
                              <thead className="bg-emerald-50 text-emerald-900">
                                <tr>
                                  {columns.map(c => (
                                    <th key={c} className="px-4 py-3 text-left font-medium whitespace-nowrap">{c}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {tableRows.slice(0, 50).map((row, i) => (
                                  <tr key={i} className="hover:bg-slate-50">
                                    {columns.map(c => (
                                      <td key={c} className="px-4 py-2 text-slate-600 whitespace-nowrap">{String(row[c] ?? '')}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
