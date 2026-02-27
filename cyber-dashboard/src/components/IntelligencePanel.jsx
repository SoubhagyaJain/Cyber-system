import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { getModels } from '../api';

export default function IntelligencePanel() {
    const [registry, setRegistry] = useState({});
    const [activeModel, setActiveModel] = useState('None');
    const [featureNames, setFeatureNames] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            const data = await getModels();
            setRegistry(data.models || {});
            setActiveModel(data.active_model || 'None');
            setFeatureNames(data.feature_names || []);
        } catch (e) { /* backend not ready */ }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const activeEntry = registry[activeModel];
    const importance = activeEntry?.feature_importance;

    const importanceData = importance
        ? importance.map(f => ({ name: f.feature, value: +(f.importance * 100).toFixed(2) }))
        : [];

    // Categorize top features for auto-insight
    function categorize(fname) {
        const l = fname.toLowerCase();
        if (['time', 'duration', 'idle', 'active', 'iat', 'ms', 'switched'].some(k => l.includes(k))) return 'timing';
        if (['tcp', 'win', 'flag', 'syn', 'ack', 'scale'].some(k => l.includes(k))) return 'tcp';
        if (['tos', 'protocol', 'dscp', 'ttl', 'port'].some(k => l.includes(k))) return 'protocol';
        if (['byte', 'pkt', 'len', 'size', 'payload'].some(k => l.includes(k))) return 'size';
        return 'general';
    }

    const insights = [];
    if (importance && importance.length >= 3) {
        const top3 = importance.slice(0, 3);
        const cats = top3.map(f => categorize(f.feature));
        if (cats.includes('timing')) insights.push('unusual timing patterns in packet flow (inter-arrival times, session duration)');
        if (cats.includes('tcp')) insights.push('TCP handshake irregularities (window scaling, flag combinations)');
        if (cats.includes('protocol')) insights.push('anomalous service-type fields (Type of Service, TTL values)');
        if (cats.includes('size')) insights.push('unusual packet sizes or byte distributions');
        if (!insights.length) insights.push('a combination of network-level features that diverge from normal traffic');
    }

    const GlassCard = ({ children, style }) => (
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
        >
            {children}
        </motion.div>
    );

    if (!activeEntry || !importance) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F9FAFB', margin: 0 }}>
                    Intelligence & Explainability
                </h2>
                <GlassCard style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
                    <h3 style={{ color: '#F9FAFB', fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
                        Intelligence Module Offline
                    </h3>
                    <p style={{ color: '#6B7280', fontSize: '14px', maxWidth: '500px', margin: '0 auto', lineHeight: 1.7 }}>
                        <strong>Explainable AI (XAI)</strong> helps you understand why a model made a specific prediction.
                        Train a model via the <strong>Model Comparison</strong> page to activate this module.
                    </p>
                </GlassCard>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F9FAFB', margin: 0 }}>
                    Intelligence & Explainability
                </h2>
                <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                    Model: <strong style={{ color: '#22C55E' }}>{activeModel}</strong>
                </p>
            </div>

            {/* Feature Importance + Education */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
                <GlassCard>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', marginBottom: '16px' }}>
                        🔬 Global Feature Importance
                    </h3>
                    <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={importanceData} layout="vertical" margin={{ left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis
                                type="category" dataKey="name" width={180}
                                tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px', fontSize: '12px', color: '#F9FAFB',
                                }}
                            />
                            <Bar dataKey="value" name="Importance %" fill="#22C55E" radius={[0, 6, 6, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </GlassCard>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <GlassCard>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', marginBottom: '12px' }}>
                            📘 What Is Feature Importance?
                        </h3>
                        <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.7 }}>
                            The model evaluates multiple signals from each network packet.
                            <strong style={{ color: '#D1D5DB' }}> Higher importance</strong> = Greater influence on the decision.
                            These features help the model separate normal vs malicious traffic.
                        </p>
                    </GlassCard>

                    <GlassCard>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', marginBottom: '12px' }}>
                            📊 Impact Scale
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { min: '> 15%', label: 'Dominant — Primary decision driver', color: '#EF4444' },
                                { min: '5–15%', label: 'Strong — Significant contributor', color: '#F59E0B' },
                                { min: '< 5%', label: 'Weak — Minor influence', color: '#22C55E' },
                            ].map((row) => (
                                <div key={row.min} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: 10, height: 10, borderRadius: '50%', background: row.color,
                                        boxShadow: `0 0 6px ${row.color}60`,
                                    }} />
                                    <span style={{ fontSize: '12px', color: '#D1D5DB' }}>
                                        <strong>{row.min}</strong> — {row.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* Auto-Generated Insight */}
            {insights.length > 0 && (
                <GlassCard style={{ borderLeft: '4px solid #22C55E' }}>
                    <div style={{ color: '#22C55E', fontWeight: 700, fontSize: '13px', letterSpacing: '0.03em', marginBottom: '10px' }}>
                        🧠 AUTO-GENERATED INSIGHT — {activeModel}
                    </div>
                    <p style={{ color: '#D1D5DB', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
                        The model primarily detects malicious traffic based on <strong>{insights.join(', and ')}</strong>,
                        which are hallmarks of automated attack tools and protocol-level manipulation.
                    </p>
                    {importance.length >= 3 && (
                        <div style={{ marginTop: '12px', fontSize: '12px', color: '#6B7280' }}>
                            <strong>Top 3 Features:</strong>{' '}
                            {importance.slice(0, 3).map(f => `${f.feature} (${(f.importance * 100).toFixed(2)}%)`).join(', ')}
                        </div>
                    )}
                </GlassCard>
            )}

            {/* Responsible AI */}
            <GlassCard style={{ borderLeft: '4px solid #F59E0B' }}>
                <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>
                    ⚠️ RESPONSIBLE AI & MODEL LIMITATIONS
                </div>
                <p style={{ color: '#9CA3AF', fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
                    ML models may occasionally misclassify legitimate traffic (false positives) or miss novel attack vectors (false negatives).
                    Human review is recommended for all critical security decisions. Model predictions should complement — not replace — expert analysis.
                    Regularly retrain models as new threat signatures emerge.
                </p>
            </GlassCard>
        </div>
    );
}
