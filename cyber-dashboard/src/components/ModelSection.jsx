import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { trainModels, setActiveModel } from '../api';

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
    const [selectedModels, setSelectedModels] = useState(new Set(ALL_MODELS));
    const [dataSize, setDataSize] = useState(100000);
    const [training, setTraining] = useState(false);
    const [trainProgress, setTrainProgress] = useState('');
    const [showConfig, setShowConfig] = useState(true);

    const models = dashData?.model_info || [];
    const activeModel = dashData?.active_model || 'None';
    const modelsTrained = dashData?.models_trained || 0;
    const simActive = dashData?.simulation_active || false;
    const recentPackets = dashData?.recent_packets || [];

    const bestModel = models.length > 0
        ? models.reduce((a, b) => (a.f1 > b.f1 ? a : b))
        : null;

    const toggleModel = (name) => {
        setSelectedModels(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                if (next.size > 1) next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };

    const handleCardClick = async (name) => {
        if (name === activeModel) return;
        try {
            await setActiveModel(name);
            // We rely on the App.jsx polling to update dashData.active_model within 2 seconds.
            // But we can eagerly update it visually if we want. For now, trusting the polling loop is fine.
        } catch (e) {
            console.error('Failed to set active model', e);
        }
    };

    const selectAll = () => setSelectedModels(new Set(ALL_MODELS));
    const selectNone = () => setSelectedModels(new Set([ALL_MODELS[0]]));

    const handleTrain = async () => {
        setTraining(true);
        const names = [...selectedModels];
        const ds = DATA_SIZE_OPTIONS.find(o => o.value === dataSize);
        setTrainProgress(`Training ${names.length} model${names.length > 1 ? 's' : ''} on ${ds?.label || dataSize} samples...`);

        try {
            if (names.length === ALL_MODELS.length) {
                await trainModels(null, dataSize);
            } else {
                for (const name of names) {
                    setTrainProgress(`Training ${name}...`);
                    await trainModels(name, dataSize);
                }
            }
            setTrainProgress('');
        } catch (e) {
            setTrainProgress('Error: ' + e.message);
        }
        setTraining(false);
    };

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
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', margin: 0 }}>
                        🧠 ML Models & Detection Engine
                    </h3>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        {modelsTrained > 0
                            ? `${modelsTrained} models trained · Active: ${activeModel}`
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
                            <div className="animate-pulse-glow" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                            <span style={{ fontSize: '11px', color: '#22C55E', fontWeight: 600 }}>SIMULATION ACTIVE</span>
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

            {/* Config Panel */}
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
                            {/* Model Selection */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#D1D5DB' }}>
                                        Select Models
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
                                        const isSelected = selectedModels.has(name);
                                        const color = MODEL_COLORS[name];
                                        return (
                                            <motion.button
                                                key={name}
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => toggleModel(name)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    padding: '10px 16px', borderRadius: '10px',
                                                    background: isSelected ? `${color}12` : 'rgba(255,255,255,0.02)',
                                                    border: `1px solid ${isSelected ? color + '40' : 'rgba(255,255,255,0.06)'}`,
                                                    color: isSelected ? color : '#6B7280',
                                                    cursor: 'pointer', fontFamily: 'inherit',
                                                    fontSize: '13px', fontWeight: isSelected ? 600 : 400,
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                {/* Checkbox */}
                                                <div style={{
                                                    width: 18, height: 18, borderRadius: '5px',
                                                    background: isSelected ? color : 'transparent',
                                                    border: `2px solid ${isSelected ? color : 'rgba(255,255,255,0.15)'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.2s', flexShrink: 0,
                                                }}>
                                                    {isSelected && (
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
                                    {selectedModels.size} of {ALL_MODELS.length} models selected
                                </div>
                            </div>

                            {/* Data Size Selection */}
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
                                                onClick={() => setDataSize(opt.value)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '12px',
                                                    padding: '10px 14px', borderRadius: '10px',
                                                    background: isSelected ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                                                    border: `1px solid ${isSelected ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                                    cursor: 'pointer', fontFamily: 'inherit',
                                                    transition: 'all 0.2s', textAlign: 'left', width: '100%',
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

                        {/* Train Button */}
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(255,255,255,0.02)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                Train <strong style={{ color: '#D1D5DB' }}>{selectedModels.size}</strong> model{selectedModels.size > 1 ? 's' : ''} on{' '}
                                <strong style={{ color: '#D1D5DB' }}>{DATA_SIZE_OPTIONS.find(o => o.value === dataSize)?.label || dataSize}</strong> samples
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
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
                                {training ? '⏳ Training...' : `⚡ Train ${selectedModels.size === ALL_MODELS.length ? 'All' : selectedModels.size} Model${selectedModels.size > 1 ? 's' : ''}`}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Training Progress */}
            {trainProgress && (
                <div style={{
                    padding: '12px 24px',
                    background: trainProgress.startsWith('Error') ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                    {!trainProgress.startsWith('Error') && (
                        <div className="animate-pulse-glow" style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
                    )}
                    <span style={{
                        fontSize: '12px', fontWeight: 600,
                        color: trainProgress.startsWith('Error') ? '#EF4444' : '#22C55E',
                    }}>
                        {trainProgress}
                    </span>
                </div>
            )}

            {/* Trained Models Grid */}
            {models.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '40px 24px',
                }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>🤖</div>
                    <p style={{ fontSize: '13px', color: '#6B7280', maxWidth: '400px', margin: '0 auto' }}>
                        Select your models and data size above, then click <strong style={{ color: '#22C55E' }}>Train</strong> to begin
                    </p>
                </div>
            ) : (
                <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                        {models.map((m) => {
                            const isBest = bestModel && m.name === bestModel.name;
                            const isActive = m.name === activeModel;
                            const color = MODEL_COLORS[m.name] || '#6B7280';

                            return (
                                <motion.div
                                    key={m.name}
                                    onClick={() => handleCardClick(m.name)}
                                    whileHover={{ y: -4, boxShadow: `0 10px 20px ${color}30` }}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '12px',
                                        background: isActive ? `${color}0A` : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${isActive ? color + '40' : 'rgba(255,255,255,0.06)'}`,
                                        textAlign: 'center',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '16px' }}>{MODEL_ICONS[m.name]}</span>
                                        {isBest && <span style={{ fontSize: '10px', color: '#F59E0B', fontWeight: 700 }}>🏆 BEST</span>}
                                        {isActive && !isBest && <span style={{ fontSize: '10px', color: color, fontWeight: 700 }}>🎯 ACTIVE</span>}
                                    </div>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#D1D5DB', marginBottom: '6px' }}>{m.name}</div>
                                    <div style={{ fontSize: '22px', fontWeight: 800, color, letterSpacing: '-0.02em' }}>
                                        {(m.f1 * 100).toFixed(1)}%
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>F1 Score</div>
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px',
                                        marginTop: '8px', fontSize: '10px',
                                    }}>
                                        <div style={{ color: '#4B5563' }}>Acc <strong style={{ color: '#9CA3AF' }}>{(m.accuracy * 100).toFixed(1)}%</strong></div>
                                        <div style={{ color: '#4B5563' }}>Pre <strong style={{ color: '#9CA3AF' }}>{(m.precision * 100).toFixed(1)}%</strong></div>
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#4B5563', marginTop: '4px' }}>
                                        Time: <strong style={{ color: '#9CA3AF' }}>{m.train_time?.toFixed(2)}s</strong>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Recent Detections */}
                    {simActive && recentPackets.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                            <div style={{ fontSize: '11px', color: '#4B5563', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.03em' }}>
                                RECENT DETECTIONS
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
                                                background: pkt.is_attack ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.04)',
                                                border: `1px solid ${pkt.is_attack ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.1)'}`,
                                                fontSize: '11px',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            <span>{pkt.is_attack ? '⛔' : '✅'}</span>
                                            <span style={{ color: '#9CA3AF', fontFamily: 'monospace' }}>{pkt.src_ip}</span>
                                            <span style={{ color: pkt.is_attack ? '#EF4444' : '#22C55E', fontWeight: 600 }}>{pkt.label}</span>
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
