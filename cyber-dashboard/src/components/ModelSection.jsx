import { useState, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trainModels, setActiveModel } from '../api';
import { DashboardContext } from '../App';

const ALL_MODELS = ['Random Forest', 'Decision Tree', 'Gaussian NB', 'XGBoost', 'MLP'];

const MODEL_COLORS = {
    'Random Forest': '#22C55E',
    'Decision Tree': '#3B82F6',
    'Gaussian NB': '#F59E0B',
    'XGBoost': '#EC4899',
    'MLP': '#8B5CF6',
};

const MODEL_ICONS = {
    'Random Forest': '🌲',
    'Decision Tree': '🌳',
    'Gaussian NB': '📊',
    'XGBoost': '⚡',
    'MLP': '🧠',
};

const DATA_SIZE_OPTIONS = [
    { label: '10K', value: 10000, desc: 'Quick test' },
    { label: '50K', value: 50000, desc: 'Standard' },
    { label: '100K', value: 100000, desc: 'Full dataset' },
    { label: '200K', value: 200000, desc: 'Extended' },
    { label: '500K', value: 500000, desc: 'Maximum' },
];

export default function ModelSection({ dashData }) {
    // ── Local UI state ─────────────────────────────────────────────────────
    // selectedModels: which checkboxes are ticked for TRAINING
    const [selectedModels, setSelectedModels] = useState(new Set(['Random Forest']));
    // dataSize: chosen sample count (kept here so it survives re-renders, not navigation)
    const [dataSize, setDataSize] = useState(10000);
    // training: whether a train job is currently in flight
    const [training, setTraining] = useState(false);
    // trainLog: per-model progress messages
    const [trainLog, setTrainLog] = useState([]);
    // showConfig: collapse/expand panel
    const [showConfig, setShowConfig] = useState(true);
    // pendingActiveModel: optimistic UI for card selection
    const [pendingActiveModel, setPendingActiveModel] = useState(null);

    // ── Data from backend poll ─────────────────────────────────────────────
    const models = dashData?.model_info || [];
    const backendActive = dashData?.active_model || 'None';
    const modelsTrained = dashData?.models_trained || 0;
    const simActive = dashData?.simulation_active || false;
    const recentPackets = dashData?.recent_packets || [];

    // Resolve active model: use optimistic value if we just set one, else backend truth
    const activeModel = pendingActiveModel || backendActive;

    // Best model by F1
    const bestModel = models.length > 0
        ? models.reduce((a, b) => (a.f1 > b.f1 ? a : b))
        : null;

    // ── Model checkbox toggle ──────────────────────────────────────────────
    const toggleModel = (name) => {
        setSelectedModels(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                if (next.size > 1) next.delete(name);  // must keep at least one
            } else {
                next.add(name);
            }
            return next;
        });
    };

    const selectAll = () => setSelectedModels(new Set(ALL_MODELS));
    const selectNone = () => setSelectedModels(new Set([ALL_MODELS[0]]));

    // ── Active model card click ────────────────────────────────────────────
    const handleCardClick = useCallback(async (name) => {
        if (name === activeModel) return;
        setPendingActiveModel(name);   // optimistic update
        try {
            await setActiveModel(name);
        } catch (e) {
            console.error('Failed to set active model', e);
            setPendingActiveModel(null);  // roll back on error
        }
        // Clear pending after a short delay (backend poll will confirm)
        setTimeout(() => setPendingActiveModel(null), 3000);
    }, [activeModel]);

    // ── Train handler ──────────────────────────────────────────────────────
    const handleTrain = async () => {
        setTraining(true);
        setTrainLog([]);
        const names = [...selectedModels];
        const ds = DATA_SIZE_OPTIONS.find(o => o.value === dataSize);

        try {
            // Always train models individually so each uses the EXACT selected dataSize
            // and only the SELECTED models are trained.
            for (const name of names) {
                setTrainLog(prev => [...prev, { name, status: 'training' }]);
                await trainModels(name, dataSize);
                setTrainLog(prev =>
                    prev.map(e => e.name === name ? { ...e, status: 'done' } : e)
                );
            }
        } catch (e) {
            setTrainLog(prev => [...prev, { name: 'Error', status: 'error', msg: e.message }]);
        }

        setTraining(false);
        // Auto-clear log after 5 seconds
        setTimeout(() => setTrainLog([]), 5000);
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                overflow: 'hidden',
            }}
        >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', margin: 0 }}>
                        🧠 ML Models &amp; Detection Engine
                    </h3>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        {modelsTrained > 0
                            ? `${modelsTrained} model${modelsTrained > 1 ? 's' : ''} trained · Active: ${activeModel}`
                            : 'Select models and data size, then train'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {simActive && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '5px 12px', borderRadius: '20px',
                            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                        }}>
                            <div className="animate-pulse-glow" style={{
                                width: 6, height: 6, borderRadius: '50%', background: '#22C55E',
                            }} />
                            <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: 600 }}>
                                SIMULATION ACTIVE · {activeModel}
                            </span>
                        </div>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowConfig(!showConfig)}
                        style={{
                            padding: '6px 14px', borderRadius: '8px',
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#9CA3AF', fontSize: '12px', fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    >
                        {showConfig ? '▼ Config' : '▶ Config'}
                    </motion.button>
                </div>
            </div>

            {/* ── Config Panel ────────────────────────────────────────────── */}
            <AnimatePresence>
                {showConfig && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{
                            padding: '20px 24px',
                            background: 'rgba(255,255,255,0.02)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '28px',
                        }}>
                            {/* ── Model Checkboxes ──────────────────────── */}
                            <div>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', marginBottom: '12px',
                                }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#D1D5DB' }}>
                                        Select Models to Train
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={selectAll} style={{
                                            padding: '3px 10px', borderRadius: '6px', fontSize: '11px',
                                            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                                            color: '#22C55E', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                                        }}>All</button>
                                        <button onClick={selectNone} style={{
                                            padding: '3px 10px', borderRadius: '6px', fontSize: '11px',
                                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                                        }}>Reset</button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {ALL_MODELS.map(name => {
                                        const isChecked = selectedModels.has(name);
                                        const color = MODEL_COLORS[name];
                                        return (
                                            <motion.button
                                                key={name}
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => toggleModel(name)}
                                                disabled={training}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    padding: '10px 16px', borderRadius: '10px',
                                                    background: isChecked ? `${color}12` : 'rgba(255,255,255,0.02)',
                                                    border: `1px solid ${isChecked ? color + '40' : 'rgba(255,255,255,0.06)'}`,
                                                    color: isChecked ? color : '#6B7280',
                                                    cursor: training ? 'not-allowed' : 'pointer',
                                                    fontFamily: 'inherit',
                                                    fontSize: '13px', fontWeight: isChecked ? 600 : 400,
                                                    transition: 'all 0.2s',
                                                    opacity: training ? 0.5 : 1,
                                                }}
                                            >
                                                {/* Checkbox */}
                                                <div style={{
                                                    width: 18, height: 18, borderRadius: '5px',
                                                    background: isChecked ? color : 'transparent',
                                                    border: `2px solid ${isChecked ? color : 'rgba(255,255,255,0.15)'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.2s', flexShrink: 0,
                                                }}>
                                                    {isChecked && (
                                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                            <path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <span>{MODEL_ICONS[name]}</span>
                                                <span>{name}</span>
                                            </motion.button>
                                        );
                                    })}
                                </div>

                                <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '8px' }}>
                                    {selectedModels.size} of {ALL_MODELS.length} models selected for training
                                </div>
                            </div>

                            {/* ── Data Size Radio ────────────────────────── */}
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#D1D5DB', marginBottom: '12px' }}>
                                    Training Data Size
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {DATA_SIZE_OPTIONS.map(opt => {
                                        const isSelected = dataSize === opt.value;
                                        return (
                                            <motion.button
                                                key={opt.value}
                                                whileHover={{ x: 2 }}
                                                onClick={() => !training && setDataSize(opt.value)}
                                                disabled={training}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '12px',
                                                    padding: '10px 14px', borderRadius: '10px',
                                                    background: isSelected ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                                                    border: `1px solid ${isSelected ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                                    cursor: training ? 'not-allowed' : 'pointer',
                                                    fontFamily: 'inherit',
                                                    transition: 'all 0.2s', textAlign: 'left', width: '100%',
                                                    opacity: training ? 0.5 : 1,
                                                }}
                                            >
                                                {/* Radio */}
                                                <div style={{
                                                    width: 16, height: 16, borderRadius: '50%',
                                                    border: `2px solid ${isSelected ? '#22C55E' : 'rgba(255,255,255,0.15)'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.2s', flexShrink: 0,
                                                }}>
                                                    {isSelected && (
                                                        <div style={{
                                                            width: 8, height: 8, borderRadius: '50%', background: '#22C55E',
                                                            boxShadow: '0 0 6px rgba(34,197,94,0.5)',
                                                        }} />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{
                                                        fontSize: '14px', fontWeight: isSelected ? 700 : 500,
                                                        color: isSelected ? '#22C55E' : '#D1D5DB',
                                                    }}>
                                                        {opt.label}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#4B5563', marginLeft: '8px' }}>
                                                        samples
                                                    </span>
                                                </div>
                                                <span style={{
                                                    fontSize: '11px', color: '#4B5563',
                                                    padding: '2px 8px', borderRadius: '6px',
                                                    background: isSelected ? 'rgba(34,197,94,0.08)' : 'transparent',
                                                }}>
                                                    {opt.desc}
                                                </span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ── Train Button Row ─────────────────────────── */}
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(255,255,255,0.02)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                Will train&nbsp;
                                <strong style={{ color: '#D1D5DB' }}>{[...selectedModels].join(', ')}</strong>
                                &nbsp;on&nbsp;
                                <strong style={{ color: '#22C55E' }}>
                                    {DATA_SIZE_OPTIONS.find(o => o.value === dataSize)?.label || dataSize}
                                </strong>
                                &nbsp;samples
                            </div>
                            <motion.button
                                whileHover={{ scale: training ? 1 : 1.05 }}
                                whileTap={{ scale: training ? 1 : 0.95 }}
                                onClick={handleTrain}
                                disabled={training}
                                style={{
                                    padding: '10px 28px',
                                    borderRadius: '10px',
                                    background: training
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'linear-gradient(135deg, #22C55E, #16A34A)',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: training ? 'not-allowed' : 'pointer',
                                    fontFamily: 'inherit',
                                    boxShadow: training ? 'none' : '0 0 24px rgba(34,197,94,0.25)',
                                }}
                            >
                                {training
                                    ? '⏳ Training...'
                                    : `⚡ Train ${selectedModels.size === 1
                                        ? [...selectedModels][0]
                                        : `${selectedModels.size} Models`}`}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Training Log ────────────────────────────────────────────── */}
            <AnimatePresence>
                {trainLog.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                            padding: '12px 24px', overflow: 'hidden',
                            background: 'rgba(255,255,255,0.02)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
                        }}
                    >
                        {trainLog.map((entry, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                fontSize: '12px', fontWeight: 600,
                                color: entry.status === 'error' ? '#EF4444'
                                    : entry.status === 'done' ? '#22C55E'
                                        : '#F59E0B',
                            }}>
                                {entry.status === 'training' && (
                                    <div className="animate-pulse-glow" style={{
                                        width: 7, height: 7, borderRadius: '50%', background: '#F59E0B',
                                    }} />
                                )}
                                {entry.status === 'done' && <span>✓</span>}
                                {entry.status === 'error' && <span>✗</span>}
                                {entry.msg || (entry.status === 'training'
                                    ? `Training ${entry.name} on ${DATA_SIZE_OPTIONS.find(o => o.value === dataSize)?.label || dataSize} samples…`
                                    : `${entry.name} done`)}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Trained Models Grid ──────────────────────────────────────── */}
            {models.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>🤖</div>
                    <p style={{ fontSize: '13px', color: '#6B7280', maxWidth: '400px', margin: '0 auto' }}>
                        Select models and data size above, then click&nbsp;
                        <strong style={{ color: '#22C55E' }}>Train</strong> to begin.
                        Trained model cards appear here — click one to make it the&nbsp;
                        <strong style={{ color: '#3B82F6' }}>active simulation model</strong>.
                    </p>
                </div>
            ) : (
                <div style={{ padding: '20px 24px' }}>
                    {/* Legend */}
                    <div style={{ fontSize: '11px', color: '#4B5563', marginBottom: '10px' }}>
                        Click a card to set it as the <strong style={{ color: '#F9FAFB' }}>active model</strong> for simulation
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                        {models.map((m) => {
                            const isBest = bestModel && m.name === bestModel.name;
                            const isActive = m.name === activeModel;
                            const isPending = m.name === pendingActiveModel;
                            const color = MODEL_COLORS[m.name] || '#6B7280';

                            return (
                                <motion.div
                                    key={m.name}
                                    onClick={() => handleCardClick(m.name)}
                                    whileHover={{ y: -4, boxShadow: `0 10px 20px ${color}30` }}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '12px',
                                        background: isActive
                                            ? `${color}12`
                                            : isPending
                                                ? 'rgba(255,255,255,0.05)'
                                                : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${isActive
                                            ? color + '60'
                                            : isPending
                                                ? 'rgba(255,255,255,0.2)'
                                                : 'rgba(255,255,255,0.06)'}`,
                                        textAlign: 'center',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                        boxShadow: isActive ? `0 0 18px ${color}20` : 'none',
                                    }}
                                >
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', marginBottom: '8px',
                                    }}>
                                        <span style={{ fontSize: '16px' }}>{MODEL_ICONS[m.name]}</span>
                                        {isBest && <span style={{ fontSize: '10px', color: '#F59E0B', fontWeight: 700 }}>🏆 BEST</span>}
                                        {isActive && !isBest && <span style={{ fontSize: '10px', color, fontWeight: 700 }}>🎯 ACTIVE</span>}
                                    </div>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#D1D5DB', marginBottom: '6px' }}>
                                        {m.name}
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: 800, color, letterSpacing: '-0.02em' }}>
                                        {(m.f1 * 100).toFixed(1)}%
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>F1 Score</div>
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px',
                                        marginTop: '8px', fontSize: '10px',
                                    }}>
                                        <div style={{ color: '#4B5563' }}>
                                            Acc <strong style={{ color: '#9CA3AF' }}>{(m.accuracy * 100).toFixed(1)}%</strong>
                                        </div>
                                        <div style={{ color: '#4B5563' }}>
                                            Pre <strong style={{ color: '#9CA3AF' }}>{(m.precision * 100).toFixed(1)}%</strong>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#4B5563', marginTop: '4px' }}>
                                        Time: <strong style={{ color: '#9CA3AF' }}>{m.train_time?.toFixed(2)}s</strong>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* ── Recent Detections (simulation only) ── */}
                    {simActive && recentPackets.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                            <div style={{
                                fontSize: '11px', color: '#4B5563', fontWeight: 600,
                                marginBottom: '8px', letterSpacing: '0.03em',
                            }}>
                                RECENT DETECTIONS — {activeModel}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                <AnimatePresence>
                                    {recentPackets.map((pkt, i) => (
                                        <motion.div
                                            key={`${pkt.timestamp}-${i}`}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            style={{
                                                flex: '0 0 auto',
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                background: pkt.is_attack
                                                    ? 'rgba(239,68,68,0.06)'
                                                    : 'rgba(34,197,94,0.04)',
                                                border: `1px solid ${pkt.is_attack
                                                    ? 'rgba(239,68,68,0.15)'
                                                    : 'rgba(34,197,94,0.1)'}`,
                                                fontSize: '11px',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            <span>{pkt.is_attack ? '⛔' : '✅'}</span>
                                            <span style={{ color: '#9CA3AF', fontFamily: 'monospace' }}>{pkt.src_ip}</span>
                                            <span style={{
                                                color: pkt.is_attack ? '#EF4444' : '#22C55E',
                                                fontWeight: 600,
                                            }}>{pkt.label}</span>
                                            <span style={{ color: '#4B5563' }}>{(pkt.confidence * 100).toFixed(0)}%</span>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
