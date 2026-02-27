import { useState, useEffect, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { trainModels, getModels, setActiveModel } from '../api';
import { DashboardContext } from '../App';

const METRIC_COLORS = {
    accuracy: '#22C55E',
    precision: '#3B82F6',
    recall: '#F59E0B',
    f1: '#8B5CF6',
    roc_auc: '#EC4899',
};

const GlassCard = ({ children, style, ...props }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
            padding: '24px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            ...style,
        }}
        {...props}
    >
        {children}
    </motion.div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
        <div style={{
            background: 'rgba(17,24,39,0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#F9FAFB', marginBottom: '6px' }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{p.name}:</span>
                    <span style={{ color: p.color || '#F9FAFB', fontSize: '12px', fontWeight: 600 }}>
                        {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}%
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function ModelComparison() {
    const { dashData } = useContext(DashboardContext);
    const [registry, setRegistry] = useState({});
    const [localActiveModel, setLocalActiveModel] = useState('None');
    const [classes, setClasses] = useState([]);
    const [training, setTraining] = useState(false);
    const [trainProgress, setTrainProgress] = useState('');
    const [error, setError] = useState('');

    const fetchModels = useCallback(async () => {
        try {
            const data = await getModels();
            setRegistry(data.models || {});
            setLocalActiveModel(data.active_model || 'None');
            setClasses(data.classes || []);
        } catch (e) {
            // Backend not available yet
        }
    }, []);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    const activeModel = dashData?.active_model || localActiveModel;

    const handleTrainAll = async () => {
        setTraining(true);
        setTrainProgress('Training all 5 models...');
        setError('');
        try {
            const data = await trainModels(null, 100000);
            setTrainProgress('');
            await fetchModels();
        } catch (e) {
            setError(e.message);
        }
        setTraining(false);
    };

    const handleSetActive = async (name) => {
        try {
            await setActiveModel(name);
            setLocalActiveModel(name);
        } catch (e) {
            setError(e.message);
        }
    };

    const modelNames = Object.keys(registry);
    const bestModel = modelNames.length > 0
        ? modelNames.reduce((a, b) => (registry[a]?.f1 || 0) > (registry[b]?.f1 || 0) ? a : b)
        : null;

    // Prepare chart data
    const comparisonData = modelNames.map((name) => ({
        name,
        Accuracy: +(registry[name].accuracy * 100).toFixed(2),
        Precision: +(registry[name].precision * 100).toFixed(2),
        Recall: +(registry[name].recall * 100).toFixed(2),
        'F1 Score': +(registry[name].f1 * 100).toFixed(2),
        'ROC-AUC': +(registry[name].roc_auc * 100).toFixed(2),
        'Train Time': +registry[name].train_time?.toFixed(2) || 0,
    }));

    const radarData = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc'].map(metric => {
        const point = { metric: metric.replace('_', ' ').toUpperCase() };
        modelNames.forEach(name => {
            point[name] = +(registry[name][metric] * 100).toFixed(1);
        });
        return point;
    });

    const radarColors = ['#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F9FAFB', margin: 0 }}>
                        Model Comparison
                    </h2>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                        Benchmark all architectures side-by-side
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleTrainAll}
                    disabled={training}
                    style={{
                        padding: '12px 28px',
                        borderRadius: '12px',
                        background: training
                            ? 'rgba(255,255,255,0.06)'
                            : 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: training ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        boxShadow: training ? 'none' : '0 0 30px rgba(34,197,94,0.3)',
                        letterSpacing: '-0.01em',
                    }}
                >
                    {training ? '⏳ Training...' : '⚡ Train All Models'}
                </motion.button>
            </div>

            {error && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#EF4444',
                    fontSize: '13px',
                }}>
                    {error}
                </div>
            )}

            {trainProgress && (
                <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.2)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="animate-pulse-glow" style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: '#22C55E',
                        }} />
                        <span style={{ color: '#22C55E', fontSize: '14px', fontWeight: 600 }}>
                            {trainProgress}
                        </span>
                    </div>
                </div>
            )}

            {modelNames.length === 0 ? (
                <GlassCard style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                    <h3 style={{ color: '#F9FAFB', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                        No Models Trained Yet
                    </h3>
                    <p style={{ color: '#6B7280', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                        Click <strong>"Train All Models"</strong> to benchmark Random Forest, Decision Tree,
                        Gaussian NB, XGBoost, and MLP on the intrusion detection dataset.
                    </p>
                </GlassCard>
            ) : (
                <>
                    {/* Best & Active cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {bestModel && (
                            <GlassCard style={{ borderLeft: '3px solid #22C55E' }}>
                                <div style={{ color: '#22C55E', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
                                    🏆 BEST MODEL
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#F9FAFB' }}>{bestModel}</div>
                                <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>
                                    F1: <strong style={{ color: '#22C55E' }}>{(registry[bestModel].f1 * 100).toFixed(2)}%</strong>
                                    {' · '}Accuracy: {(registry[bestModel].accuracy * 100).toFixed(2)}%
                                </div>
                            </GlassCard>
                        )}
                        <GlassCard style={{ borderLeft: '3px solid #3B82F6' }}>
                            <div style={{ color: '#3B82F6', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
                                🎯 ACTIVE MODEL
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#F9FAFB' }}>{activeModel}</div>
                            {registry[activeModel] && (
                                <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>
                                    F1: <strong style={{ color: '#3B82F6' }}>{(registry[activeModel].f1 * 100).toFixed(2)}%</strong>
                                    {' · '}Accuracy: {(registry[activeModel].accuracy * 100).toFixed(2)}%
                                </div>
                            )}
                        </GlassCard>
                    </div>

                    {/* Performance Table */}
                    <GlassCard>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', marginBottom: '16px' }}>
                            Performance Summary
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        {['Model', 'Accuracy', 'Precision', 'Recall', 'F1 Score', 'ROC-AUC', 'Time (s)'].map(h => (
                                            <th key={h} style={{
                                                textAlign: 'left', padding: '10px 12px', color: '#9CA3AF', fontWeight: 600,
                                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparisonData.map((row) => (
                                        <tr
                                            key={row.name}
                                            onClick={() => handleSetActive(row.name)}
                                            style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '10px 12px', color: '#F9FAFB', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                {row.name === bestModel && '🏆 '}
                                                {row.name === activeModel && '🎯 '}
                                                {row.name}
                                            </td>
                                            {['Accuracy', 'Precision', 'Recall', 'F1 Score', 'ROC-AUC'].map(m => (
                                                <td key={m} style={{
                                                    padding: '10px 12px',
                                                    color: row[m] === Math.max(...comparisonData.map(d => d[m])) ? '#22C55E' : '#D1D5DB',
                                                    fontWeight: row[m] === Math.max(...comparisonData.map(d => d[m])) ? 700 : 400,
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                }}>
                                                    {row[m]}%
                                                </td>
                                            ))}
                                            <td style={{ padding: '10px 12px', color: '#9CA3AF', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                {row['Train Time']}s
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>

                    {/* Charts Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Accuracy & F1 Bar Chart */}
                        <GlassCard>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', marginBottom: '16px' }}>
                                Accuracy vs F1 Score
                            </h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={comparisonData} barCategoryGap="20%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="Accuracy" fill="#22C55E" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="F1 Score" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </GlassCard>

                        {/* Radar Chart */}
                        <GlassCard>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', marginBottom: '16px' }}>
                                Multi-Metric Radar
                            </h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                                    <PolarRadiusAxis tick={{ fill: '#6B7280', fontSize: 10 }} domain={[0, 100]} />
                                    {modelNames.map((name, i) => (
                                        <Radar
                                            key={name}
                                            name={name}
                                            dataKey={name}
                                            stroke={radarColors[i % radarColors.length]}
                                            fill={radarColors[i % radarColors.length]}
                                            fillOpacity={0.1}
                                            strokeWidth={2}
                                        />
                                    ))}
                                </RadarChart>
                            </ResponsiveContainer>
                        </GlassCard>
                    </div>

                    {/* ROC-AUC & Training Time */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <GlassCard>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', marginBottom: '16px' }}>
                                ROC-AUC Score
                            </h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={comparisonData} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="ROC-AUC" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </GlassCard>

                        <GlassCard>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', marginBottom: '16px' }}>
                                Training Time
                            </h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={comparisonData} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="Train Time" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </GlassCard>
                    </div>

                    {/* ── Metric Heatmap ─────────────────────────────────────────── */}
                    <GlassCard>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', margin: 0 }}>
                                    📊 Model × Metric Heatmap
                                </h3>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                                    Per-column colour intensity — darker = higher score within that metric
                                </p>
                            </div>
                            {/* gradient legend */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', color: '#6B7280' }}>Low</span>
                                <div style={{
                                    width: 100, height: 10, borderRadius: 6,
                                    background: 'linear-gradient(to right, rgba(59,130,246,0.15), rgba(34,197,94,0.9))',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }} />
                                <span style={{ fontSize: '11px', color: '#6B7280' }}>High</span>
                            </div>
                        </div>
                        <MetricHeatmap registry={registry} modelNames={modelNames} />
                    </GlassCard>

                    {/* Confusion Matrix */}
                    {registry[activeModel]?.confusion_matrix && (
                        <GlassCard>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', marginBottom: '4px' }}>
                                Confusion Matrix — {activeModel}
                            </h3>
                            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
                                Diagonal (green) = correct predictions · Off-diagonal (red) = misclassifications
                            </p>
                            <ConfusionMatrix matrix={registry[activeModel].confusion_matrix} labels={classes} />
                        </GlassCard>
                    )}
                </>
            )}
        </div>
    );
}


function MetricHeatmap({ registry, modelNames }) {
    const METRICS = [
        { key: 'accuracy', label: 'Accuracy' },
        { key: 'precision', label: 'Precision' },
        { key: 'recall', label: 'Recall' },
        { key: 'f1', label: 'F1 Score' },
        { key: 'roc_auc', label: 'ROC-AUC' },
    ];

    // Per-column min/max for normalised colouring
    const colStats = METRICS.map(({ key }) => {
        const vals = modelNames.map(n => registry[n]?.[key] ?? 0);
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        return { min, max, range: max - min || 1 };
    });

    const cellH = 52;
    const labelW = 140;
    const colW = 120;
    const headerH = 40;
    const totalW = labelW + METRICS.length * colW;
    const totalH = headerH + modelNames.length * cellH;

    // Interpolate between two hex colours
    function lerp(t) {
        // low: #1e3a5f  high: #22c55e
        const r = Math.round(30 + t * (34 - 30));
        const g = Math.round(58 + t * (197 - 58));
        const b = Math.round(95 + t * (94 - 95));
        return `rgb(${r},${g},${b})`;
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <svg width={totalW} height={totalH} style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}>
                {/* Column headers */}
                {METRICS.map(({ label }, ci) => (
                    <text
                        key={label}
                        x={labelW + ci * colW + colW / 2}
                        y={headerH - 10}
                        textAnchor="middle"
                        fill="#9CA3AF"
                        fontSize={11}
                        fontWeight={600}
                        fontFamily="Inter, sans-serif"
                    >
                        {label}
                    </text>
                ))}

                {modelNames.map((model, ri) => {
                    const y = headerH + ri * cellH;
                    const isActive = model === Object.keys(registry).find(
                        k => registry[k]?.f1 === Math.max(...Object.values(registry).map(r => r?.f1 ?? 0))
                    );
                    return (
                        <g key={model}>
                            {/* Row label */}
                            <text
                                x={labelW - 12}
                                y={y + cellH / 2 + 4}
                                textAnchor="end"
                                fill={isActive ? '#22C55E' : '#D1D5DB'}
                                fontSize={12}
                                fontWeight={isActive ? 700 : 500}
                                fontFamily="Inter, sans-serif"
                            >
                                {isActive ? '🏆 ' : ''}{model}
                            </text>

                            {/* Cells */}
                            {METRICS.map(({ key }, ci) => {
                                const val = registry[model]?.[key] ?? 0;
                                const { min, range } = colStats[ci];
                                const t = (val - min) / range;
                                const bg = lerp(t);
                                const pct = (val * 100).toFixed(1);
                                return (
                                    <g key={key}>
                                        <rect
                                            x={labelW + ci * colW + 4}
                                            y={y + 4}
                                            width={colW - 8}
                                            height={cellH - 8}
                                            rx={8}
                                            fill={bg}
                                            fillOpacity={0.85}
                                            stroke="rgba(255,255,255,0.07)"
                                            strokeWidth={1}
                                        />
                                        <text
                                            x={labelW + ci * colW + colW / 2}
                                            y={y + cellH / 2 - 3}
                                            textAnchor="middle"
                                            fill="#fff"
                                            fontSize={15}
                                            fontWeight={700}
                                            fontFamily="Inter, sans-serif"
                                        >
                                            {pct}%
                                        </text>
                                        <text
                                            x={labelW + ci * colW + colW / 2}
                                            y={y + cellH / 2 + 13}
                                            textAnchor="middle"
                                            fill="rgba(255,255,255,0.6)"
                                            fontSize={9}
                                            fontFamily="Inter, sans-serif"
                                        >
                                            {t >= 0.95 ? '▲ best' : t <= 0.05 ? '▼ worst' : ''}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

function ConfusionMatrix({ matrix, labels }) {
    if (!matrix || matrix.length === 0) return null;
    const maxVal = Math.max(...matrix.flat());
    const total = matrix.flat().reduce((a, b) => a + b, 0);
    const [hover, setHover] = useState(null);

    return (
        <div style={{ overflowX: 'auto' }}>
            {hover && (
                <div style={{
                    marginBottom: 10, padding: '8px 14px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)', fontSize: 12, color: '#D1D5DB',
                    display: 'inline-block'
                }}>
                    Actual: <strong style={{ color: '#F9FAFB' }}>{hover.actual}</strong>
                    {' → '}Predicted: <strong style={{ color: '#F9FAFB' }}>{hover.predicted}</strong>
                    {' · '}<span style={{ color: hover.correct ? '#22C55E' : '#EF4444' }}>
                        {hover.val.toLocaleString()} samples ({((hover.val / total) * 100).toFixed(1)}%)
                    </span>
                </div>
            )}
            <table style={{ borderCollapse: 'collapse', margin: '0 auto' }}>
                <thead>
                    <tr>
                        <th style={{ padding: '8px 12px', color: '#4B5563', fontSize: '11px', textAlign: 'right' }}>
                            Actual ↓&nbsp;&nbsp;Pred →
                        </th>
                        {labels.map((l, i) => (
                            <th key={i} style={{
                                padding: '6px 10px', color: '#9CA3AF', fontSize: '11px',
                                textAlign: 'center', maxWidth: 80, overflow: 'hidden',
                                whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                            }}>
                                {l.length > 10 ? l.slice(0, 9) + '…' : l}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {matrix.map((row, r) => (
                        <tr key={r}>
                            <td style={{
                                padding: '6px 12px', color: '#9CA3AF', fontSize: '11px',
                                fontWeight: 600, textAlign: 'right', maxWidth: 100,
                                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                            }}>
                                {labels[r]?.length > 12 ? labels[r].slice(0, 11) + '…' : (labels[r] || r)}
                            </td>
                            {row.map((val, c) => {
                                const intensity = maxVal > 0 ? val / maxVal : 0;
                                const isCorrect = r === c;
                                return (
                                    <td
                                        key={c}
                                        onMouseEnter={() => setHover({
                                            actual: labels[r] || r,
                                            predicted: labels[c] || c,
                                            val, correct: isCorrect
                                        })}
                                        onMouseLeave={() => setHover(null)}
                                        style={{
                                            padding: '8px 14px',
                                            textAlign: 'center',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: intensity > 0.3 ? '#fff' : '#9CA3AF',
                                            background: isCorrect
                                                ? `rgba(34,197,94,${0.12 + intensity * 0.7})`
                                                : `rgba(239,68,68,${intensity * 0.55})`,
                                            borderRadius: '6px',
                                            border: '1px solid rgba(255,255,255,0.04)',
                                            cursor: 'default',
                                            transition: 'filter 0.15s',
                                            filter: hover?.actual === (labels[r] || r) && hover?.predicted === (labels[c] || c)
                                                ? 'brightness(1.4)' : 'brightness(1)',
                                        }}
                                    >
                                        {val.toLocaleString()}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
