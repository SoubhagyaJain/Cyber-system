import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Cell, PieChart, Pie,
    AreaChart, Area,
} from 'recharts';
import { setActiveModel } from '../api';

const MODEL_COLORS = {
    'Random Forest': '#22C55E',
    'Decision Tree': '#3B82F6',
    'Gaussian NB': '#F59E0B',
    'XGBoost': '#EC4899',
    'MLP': '#8B5CF6',
};

const GlassTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
        <div style={{
            background: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
            padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#F9FAFB', marginBottom: '4px' }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || '#22C55E' }} />
                    <span style={{ color: '#9CA3AF', fontSize: '11px' }}>{p.name}:</span>
                    <span style={{ color: '#F9FAFB', fontSize: '11px', fontWeight: 600 }}>
                        {typeof p.value === 'number' ? (p.value > 1 ? p.value.toFixed(2) : (p.value * 100).toFixed(2) + '%') : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

const GlassCard = ({ children, style }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
            padding: '20px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            ...style,
        }}
    >{children}</motion.div>
);

export default function ModelCharts({ dashData }) {
    const models = dashData?.model_info || [];
    const attackCounts = dashData?.attack_type_counts || {};
    const activeModelName = dashData?.active_model || 'None';

    if (models.length === 0) return null;

    const handleChartClick = async (data) => {
        const name = data?.fullName || data?.payload?.fullName; // Handle different Recharts event formats
        if (!name || name === activeModelName) return;
        try {
            await setActiveModel(name);
        } catch (e) {
            console.error('Failed to set active model', e);
        }
    };

    // Bar chart data
    const barData = models.map(m => ({
        name: m.name.replace('Random ', 'R.').replace('Decision ', 'D.').replace('Gaussian ', 'G.'),
        fullName: m.name,
        Accuracy: +(m.accuracy * 100).toFixed(2),
        F1: +(m.f1 * 100).toFixed(2),
        Precision: +(m.precision * 100).toFixed(2),
        Recall: +(m.recall * 100).toFixed(2),
    }));

    // Radar data
    const radarData = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc'].map(metric => {
        const point = { metric: metric === 'roc_auc' ? 'ROC-AUC' : metric.charAt(0).toUpperCase() + metric.slice(1) };
        models.forEach(m => {
            point[m.name] = +(m[metric] * 100).toFixed(1);
        });
        return point;
    });

    // Training time data
    const timeData = models.map(m => ({
        name: m.name.replace('Random ', 'R.').replace('Decision ', 'D.').replace('Gaussian ', 'G.'),
        fullName: m.name,
        time: +(m.train_time || 0).toFixed(3),
        color: MODEL_COLORS[m.name] || '#6B7280',
    }));

    // Attack distribution pie
    const getLabelColor = (label) => {
        const l = label.toLowerCase();
        if (l.includes('normal')) return '#22C55E'; // Green
        if (l.includes('ddos') || l.includes('flood')) return '#DC2626'; // Dark Red
        if (l.includes('dos')) return '#EF4444'; // Red
        if (l.includes('scan') || l.includes('recon')) return '#F59E0B'; // Orange
        if (l.includes('theft') || l.includes('exfil')) return '#EC4899'; // Pink
        if (l.includes('brute') || l.includes('force')) return '#EF4444'; // Red

        // Generate a consistent color based on string hash for unknown labels
        let hash = 0;
        for (let i = 0; i < l.length; i++) hash = l.charCodeAt(i) + ((hash << 5) - hash);
        const hue = hash % 360;
        return `hsl(${hue > 0 ? hue : -hue}, 70%, 50%)`;
    };

    const attackData = Object.entries(attackCounts).map(([label, count]) => ({
        name: label,
        value: count,
        color: getLabelColor(label),
    }));

    const radarColors = Object.values(MODEL_COLORS);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB' }}>📊 Model Performance Comparison</div>
                <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.06)' }} />
                {dashData?.simulation_active && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="animate-pulse-glow" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                        <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: 600 }}>LIVE</span>
                    </div>
                )}
            </div>

            {/* Row 1: Accuracy/F1 + Radar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <GlassCard>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#D1D5DB', margin: '0 0 14px 0' }}>
                        Accuracy vs F1 Score
                    </h4>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={barData} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={[95, 100]} />
                            <Tooltip content={<GlassTooltip />} />
                            <Bar dataKey="Accuracy" radius={[4, 4, 0, 0]}>
                                {barData.map((entry, index) => {
                                    const isActive = entry.fullName === activeModelName;
                                    const isOtherActive = activeModelName !== 'None' && !isActive;
                                    return <Cell key={`acc-${index}`} fill="#22C55E" fillOpacity={isActive ? 1 : isOtherActive ? 0.2 : 0.8} onClick={() => handleChartClick(entry)} style={{ cursor: 'pointer', transition: 'all 0.3s' }} />;
                                })}
                            </Bar>
                            <Bar dataKey="F1" radius={[4, 4, 0, 0]}>
                                {barData.map((entry, index) => {
                                    const isActive = entry.fullName === activeModelName;
                                    const isOtherActive = activeModelName !== 'None' && !isActive;
                                    return <Cell key={`f1-${index}`} fill="#8B5CF6" fillOpacity={isActive ? 1 : isOtherActive ? 0.2 : 0.8} onClick={() => handleChartClick(entry)} style={{ cursor: 'pointer', transition: 'all 0.3s' }} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </GlassCard>

                <GlassCard>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#D1D5DB', margin: '0 0 14px 0' }}>
                        Multi-Metric Radar
                    </h4>
                    <ResponsiveContainer width="100%" height={240}>
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.08)" />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                            <PolarRadiusAxis tick={{ fill: '#4B5563', fontSize: 9 }} domain={[95, 100]} />
                            {models.map((m, i) => {
                                const isActive = m.name === activeModelName;
                                const isOtherActive = activeModelName !== 'None' && !isActive;
                                return (
                                    <Radar
                                        key={m.name} name={m.name} dataKey={m.name}
                                        stroke={radarColors[i % radarColors.length]}
                                        fill={radarColors[i % radarColors.length]}
                                        fillOpacity={isActive ? 0.35 : isOtherActive ? 0.02 : 0.08}
                                        strokeOpacity={isActive ? 1 : isOtherActive ? 0.15 : 0.8}
                                        strokeWidth={isActive ? 3 : 1.5}
                                        style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                                        onClick={() => handleChartClick({ fullName: m.name })}
                                    />
                                );
                            })}
                        </RadarChart>
                    </ResponsiveContainer>
                </GlassCard>
            </div>

            {/* Row 2: Precision/Recall + Training Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <GlassCard>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#D1D5DB', margin: '0 0 14px 0' }}>
                        Precision vs Recall
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={barData} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} domain={[95, 100]} />
                            <Tooltip content={<GlassTooltip />} />
                            <Bar dataKey="Precision" radius={[4, 4, 0, 0]}>
                                {barData.map((entry, index) => {
                                    const isActive = entry.fullName === activeModelName;
                                    const isOtherActive = activeModelName !== 'None' && !isActive;
                                    return <Cell key={`pre-${index}`} fill="#3B82F6" fillOpacity={isActive ? 1 : isOtherActive ? 0.2 : 0.8} onClick={() => handleChartClick(entry)} style={{ cursor: 'pointer', transition: 'all 0.3s' }} />;
                                })}
                            </Bar>
                            <Bar dataKey="Recall" radius={[4, 4, 0, 0]}>
                                {barData.map((entry, index) => {
                                    const isActive = entry.fullName === activeModelName;
                                    const isOtherActive = activeModelName !== 'None' && !isActive;
                                    return <Cell key={`rec-${index}`} fill="#F59E0B" fillOpacity={isActive ? 1 : isOtherActive ? 0.2 : 0.8} onClick={() => handleChartClick(entry)} style={{ cursor: 'pointer', transition: 'all 0.3s' }} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </GlassCard>

                <GlassCard>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#D1D5DB', margin: '0 0 14px 0' }}>
                        Training Time (seconds)
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={timeData} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<GlassTooltip />} />
                            <Bar dataKey="time" name="Time (s)" radius={[4, 4, 0, 0]}>
                                {timeData.map((entry, i) => {
                                    const isActive = entry.fullName === activeModelName;
                                    const isOtherActive = activeModelName !== 'None' && !isActive;
                                    return <Cell key={i} fill={entry.color} fillOpacity={isActive ? 1 : isOtherActive ? 0.2 : 0.8} onClick={() => handleChartClick(entry)} style={{ cursor: 'pointer', transition: 'all 0.3s' }} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </GlassCard>
            </div>

            {/* Row 3: Attack Distribution (when simulation is active) */}
            {attackData.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
                    <GlassCard>
                        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#D1D5DB', margin: '0 0 14px 0' }}>
                            Attack Type Distribution
                        </h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={attackData} dataKey="value" nameKey="name"
                                    cx="50%" cy="50%" outerRadius={80} innerRadius={45}
                                    strokeWidth={2} stroke="rgba(11,15,20,0.8)"
                                >
                                    {attackData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<GlassTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
                            {attackData.map(a => (
                                <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
                                    <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{a.name}: {a.value}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#D1D5DB', margin: '0 0 14px 0' }}>
                            All Metrics Comparison
                        </h4>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr>
                                        {['Model', 'Accuracy', 'Precision', 'Recall', 'F1', 'ROC-AUC', 'Time'].map(h => (
                                            <th key={h} style={{
                                                textAlign: 'left', padding: '8px 10px', color: '#6B7280', fontWeight: 600,
                                                borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '11px',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {models.map(m => {
                                        const color = MODEL_COLORS[m.name] || '#6B7280';
                                        const best = models.length > 0 ? models.reduce((a, b) => (a.f1 > b.f1 ? a : b)) : null;
                                        const isBest = best && m.name === best.name;
                                        const isActive = m.name === dashData?.active_model;
                                        return (
                                            <tr key={m.name} style={{
                                                background: isActive ? 'rgba(59,130,246,0.08)' : isBest ? 'rgba(34,197,94,0.04)' : 'transparent',
                                            }}>
                                                <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                                                        <span style={{ color: '#D1D5DB', fontWeight: 500 }}>{m.name}</span>
                                                        {isActive && <span title="Active for Simulation" style={{ fontSize: '10px', color: '#3B82F6' }}>🎯</span>}
                                                        {isBest && !isActive && <span title="Best F1 Score" style={{ fontSize: '10px', color: '#F59E0B' }}>🏆</span>}
                                                    </div>
                                                </td>
                                                {['accuracy', 'precision', 'recall', 'f1', 'roc_auc'].map(metric => {
                                                    const val = (m[metric] * 100).toFixed(2);
                                                    const maxVal = Math.max(...models.map(x => x[metric]));
                                                    const isMax = m[metric] === maxVal;
                                                    return (
                                                        <td key={metric} style={{
                                                            padding: '8px 10px', color: isMax ? '#22C55E' : '#9CA3AF',
                                                            fontWeight: isMax ? 700 : 400, borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                        }}>{val}%</td>
                                                    );
                                                })}
                                                <td style={{ padding: '8px 10px', color: '#6B7280', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    {(m.train_time || 0).toFixed(2)}s
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
