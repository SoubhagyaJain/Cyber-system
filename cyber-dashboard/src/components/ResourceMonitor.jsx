import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getSystemMetrics } from '../api';

function GaugeRing({ label, value, unit, color, icon }) {
    const size = 140;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.min(value, 100);
    const offset = circumference * (1 - pct / 100);

    const glowColor = value > 80 ? '#EF4444' : value > 60 ? '#F59E0B' : color;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                    <defs>
                        <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
                    <circle
                        cx={size / 2} cy={size / 2} r={radius} fill="none"
                        stroke={glowColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        filter={`url(#glow-${label})`}
                        style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease' }}
                    />
                </svg>
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#F9FAFB' }}>{value}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{unit}</div>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>{icon}</span>
                <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 500 }}>{label}</span>
            </div>
        </div>
    );
}

export default function ResourceMonitor() {
    const [metrics, setMetrics] = useState(null);
    const [history, setHistory] = useState([]);

    const fetchMetrics = useCallback(async () => {
        try {
            const data = await getSystemMetrics();
            setMetrics(data);
            setHistory(prev => {
                const next = [...prev, { time: new Date().toLocaleTimeString(), ram: data.ram_percent, cpu: data.cpu_percent }];
                return next.slice(-20);
            });
        } catch (e) { /* backend not running */ }
    }, []);

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 3000);
        return () => clearInterval(interval);
    }, [fetchMetrics]);

    const GlassCard = ({ children, style }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                padding: '28px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                ...style,
            }}
        >{children}</motion.div>
    );

    if (!metrics) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F9FAFB', margin: 0 }}>
                    Resource Monitor
                </h2>
                <GlassCard style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖥️</div>
                    <h3 style={{ color: '#F9FAFB', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                        Connecting to Backend...
                    </h3>
                    <p style={{ color: '#6B7280', fontSize: '14px' }}>
                        Ensure the FastAPI server is running on port 8000.
                    </p>
                </GlassCard>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F9FAFB', margin: 0 }}>
                    Resource Monitor
                </h2>
                <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                    System health & resource utilization
                </p>
            </div>

            {/* Gauge Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                <GlassCard style={{ display: 'flex', justifyContent: 'center' }}>
                    <GaugeRing label="RAM Usage" value={metrics.ram_percent} unit="%" color="#22C55E" icon="💾" />
                </GlassCard>
                <GlassCard style={{ display: 'flex', justifyContent: 'center' }}>
                    <GaugeRing label="CPU Usage" value={metrics.cpu_percent} unit="%" color="#3B82F6" icon="⚡" />
                </GlassCard>
                <GlassCard style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px', fontWeight: 600 }}>MEMORY USED</div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#F9FAFB' }}>{metrics.ram_used_gb}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>GB / {metrics.ram_total_gb} GB</div>
                    <div style={{
                        marginTop: '16px', height: 6, borderRadius: 3,
                        background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                    }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${metrics.ram_percent}%` }}
                            transition={{ duration: 1 }}
                            style={{
                                height: '100%', borderRadius: 3,
                                background: metrics.ram_percent > 80
                                    ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                                    : 'linear-gradient(90deg, #22C55E, #16A34A)',
                                boxShadow: `0 0 8px ${metrics.ram_percent > 80 ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
                            }}
                        />
                    </div>
                </GlassCard>
                <GlassCard style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px', fontWeight: 600 }}>STATUS</div>
                    <div style={{
                        fontSize: '18px', fontWeight: 800,
                        color: metrics.ram_percent > 80 ? '#EF4444' : metrics.ram_percent > 60 ? '#F59E0B' : '#22C55E',
                    }}>
                        {metrics.ram_percent > 80 ? '⚠️ HIGH LOAD' : metrics.ram_percent > 60 ? '📊 MODERATE' : '✅ STABLE'}
                    </div>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '12px', lineHeight: 1.6 }}>
                        {metrics.ram_percent > 80
                            ? 'System resources are strained. Consider reducing sample size or closing other applications.'
                            : 'System resources are within acceptable limits.'}
                    </p>
                    <div style={{
                        marginTop: '16px', fontSize: '11px', color: '#4B5563',
                    }}>
                        Last updated: {new Date().toLocaleTimeString()}
                    </div>
                </GlassCard>
            </div>

            {/* History mini-chart (text-based) */}
            {history.length > 1 && (
                <GlassCard>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', marginBottom: '16px' }}>
                        Resource History
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
                        {history.map((h, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h.ram}%` }}
                                    style={{
                                        width: '100%',
                                        maxWidth: '20px',
                                        borderRadius: '4px 4px 0 0',
                                        background: h.ram > 80 ? '#EF4444' : h.ram > 60 ? '#F59E0B' : '#22C55E',
                                        opacity: 0.7,
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span style={{ fontSize: '10px', color: '#4B5563' }}>{history[0]?.time}</span>
                        <span style={{ fontSize: '10px', color: '#4B5563' }}>{history[history.length - 1]?.time}</span>
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
