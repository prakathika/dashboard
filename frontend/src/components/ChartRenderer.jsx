import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#10B981', '#34D399', '#059669', '#6EE7B7', '#047857', '#86EFAC', '#A7F3D0', '#064E3B', '#3B82F6', '#6366F1'];

function formatNumber(n) {
  if (typeof n !== 'number') return n;
  if (n >= 1e7) return (n / 1e7).toFixed(2) + 'Cr';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
      <p className="text-xs font-semibold text-slate-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-medium text-slate-800">{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
      <p className="text-xs font-medium text-slate-700">{p.name}</p>
      <p className="text-xs text-slate-500">Value: {formatNumber(p.value)}</p>
    </div>
  );
}

export default function ChartRenderer({ chart, index }) {
  const color = COLORS[index % COLORS.length];
  const title = chart.title || 'Chart';

  if (chart.chartType === 'bar') {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} interval={0} angle={chart.data.length > 6 ? 45 : 0} textAnchor={chart.data.length > 6 ? 'start' : 'middle'} height={chart.data.length > 6 ? 60 : 30} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={chart.yKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chart.chartType === 'horizontalBar') {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chart.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey={chart.xKey} type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={chart.yKey} fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chart.chartType === 'pie') {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                dataKey={chart.valueKey}
                nameKey={chart.nameKey}
              >
                {chart.data.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chart.chartType === 'groupedBar') {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {chart.keys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chart.chartType === 'line') {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey={chart.xKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey={chart.yKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Unsupported chart type</div>
    </div>
  );
}
