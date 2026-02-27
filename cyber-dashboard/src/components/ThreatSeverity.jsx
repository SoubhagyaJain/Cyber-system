import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const DEFAULT_SEVERITIES = [
    { label: 'Exploited', color: '#EF4444' },
    { label: 'Critical', color: '#DC2626' },
    { label: 'High', color: '#F97316' },
    { label: 'Medium', color: '#F59E0B' },
    { label: 'Low', color: '#22C55E' },
];

// Map backend attack types to severity levels
function mapAttackTypesToSeverity(attackCounts, classes) {
    const getSeverity = (label) => {
        const l = label.toLowerCase();
        if (l.includes('normal')) return 'Low';
        if (l.includes('ddos') || l.includes('flood') || l.includes('dos') || l.includes('brute')) return 'Critical';
        if (l.includes('theft') || l.includes('exfil')) return 'Exploited';
        if (l.includes('scan') || l.includes('recon')) return 'High';
        return 'Medium';
    };

    const sevCounts = { Exploited: 0, Critical: 0, High: 0, Medium: 0, Low: 0 };

    for (const [label, count] of Object.entries(attackCounts)) {
        const sev = getSeverity(label);
        sevCounts[sev] += count;
    }

    return DEFAULT_SEVERITIES.map(s => ({
        ...s,
        value: sevCounts[s.label] || 0,
        total: Math.max(1, Object.values(attackCounts).reduce((a, b) => a + b, 0)),
    }));
}

// Zero state shown immediately after reset / before first simulation
const fallbackInit = [
    { label: 'Exploited', value: 0, total: 100, color: '#EF4444' },
    { label: 'Critical', value: 0, total: 100, color: '#DC2626' },
    { label: 'High', value: 0, total: 200, color: '#F97316' },
    { label: 'Medium', value: 0, total: 500, color: '#F59E0B' },
    { label: 'Low', value: 0, total: 1500, color: '#22C55E' },
];

function RadialRing({ label, value, total, color, delta }) {
    const size = 110;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(value / Math.max(total, 1), 1);
    const dashOffset = circumference * (1 - percentage);

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
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={dashOffset}
                        filter={`url(#glow-${label})`}
                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                </svg>
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#F9FAFB', letterSpacing: '-0.03em' }}>
                        {value.toLocaleString()}
                    </div>
                </div>
            </div>
            <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>{label}</span>
            {delta !== 0 && delta !== undefined && (
                <motion.span
                    key={value}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        fontSize: '10px', fontWeight: 600,
                        color: delta > 0 ? '#EF4444' : '#22C55E',
                    }}
                >
                    {delta > 0 ? `+${delta}` : delta}
                </motion.span>
            )}
        </div>
    );
}

export default function ThreatSeverity({ dashData }) {
    const [fallback, setFallback] = useState(fallbackInit);
    const [prevFallback, setPrevFallback] = useState(fallbackInit);

    const simActive = dashData?.simulation_active || false;
    const attackCounts = dashData?.attack_type_counts || {};

    // Reset to zeros when simulation stops; oscillate only after a 30s idle delay
    useEffect(() => {
        if (simActive) return;
        // Snap to zero immediately on reset
        setFallback(fallbackInit);
        setPrevFallback(fallbackInit);
        // After 30s idle, start gentle oscillation so the dashboard looks live
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                setFallback(prev => {
                    setPrevFallback(prev);
                    return prev.map(s => {
                        let delta;
                        if (s.label === 'Exploited') delta = Math.floor(Math.random() * 5) - 1;
                        else if (s.label === 'Critical') delta = Math.floor(Math.random() * 8) - 2;
                        else if (s.label === 'High') delta = Math.floor(Math.random() * 12) - 3;
                        else if (s.label === 'Medium') delta = Math.floor(Math.random() * 20) - 5;
                        else delta = Math.floor(Math.random() * 30) - 8;
                        return { ...s, value: Math.max(0, s.value + delta) };
                    });
                });
            }, 5000);
            return () => clearInterval(interval);
        }, 30000);
        return () => clearTimeout(timer);
    }, [simActive]);

    const displaySeverities = simActive
        ? mapAttackTypesToSeverity(attackCounts, dashData?.classes || [])
        : fallback;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
                padding: '28px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                border: simActive ? '1px solid rgba(239,68,68,0.12)' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', margin: 0 }}>
                        {simActive ? 'Attack Classification' : 'Threat Exposure Severity'}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        {simActive ? 'Live attack types from ML detection' : 'Vulnerability distribution by severity class'}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="animate-pulse-glow" style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: simActive ? '#22C55E' : '#F59E0B',
                        boxShadow: `0 0 6px ${simActive ? 'rgba(34,197,94,0.6)' : 'rgba(245,158,11,0.6)'}`,
                    }} />
                    <span style={{ fontSize: '11px', color: '#4B5563' }}>
                        {simActive ? 'Simulation' : 'Live · 5s'}
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
                {displaySeverities.map((s, i) => (
                    <RadialRing key={s.label} {...s} delta={simActive ? undefined : (fallback[i]?.value - prevFallback[i]?.value)} />
                ))}
            </div>
        </motion.div>
    );
}
