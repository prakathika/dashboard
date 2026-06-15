import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, LabelList
} from 'recharts';

const COLORS = ['#F472B6', '#F59E0B', '#10B981', '#14B8A6', '#3B82F6', '#8B5CF6', '#EF4444', '#EAB308', '#6366F1', '#06B6D4', '#EC4899', '#84CC16'];

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
              <Bar dataKey={chart.yKey} radius={[4, 4, 0, 0]}>
                {chart.data.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
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
              <Bar dataKey={chart.yKey} radius={[0, 4, 4, 0]}>
                {chart.data.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
                <LabelList dataKey={chart.yKey} position="right" formatter={(v) => formatNumber(v)} style={{ fontSize: 10, fill: '#475569' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (chart.chartType === 'pie') {
    const RADIAN = Math.PI / 180;
    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
      const radius = outerRadius + 18;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      const label = `${name} ${(percent * 100).toFixed(1)}%`;
      return (
        <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight={500}>
          {label}
        </text>
      );
    };
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
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey={chart.valueKey}
                nameKey={chart.nameKey}
                labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                label={renderLabel}
              >
                {chart.data.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
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
