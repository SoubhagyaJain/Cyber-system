import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Map backend threat_level string → a stable gauge percentage
function threatLevelToPercent(level) {
    switch ((level || '').toUpperCase()) {
        case 'HIGH': return 85;
        case 'MODERATE': return 52;
        case 'LOW':
        default: return 15;
    }
}

export default function DarkWebGauge({ dashData }) {
    const [progress, setProgress] = useState(0);

    // Only use real simulation data — no idle oscillation
    const simActive = dashData?.simulation_active || false;

    // When simulation is active derive value from threat_level; otherwise lock to 0
    const targetValue = simActive
        ? threatLevelToPercent(dashData?.threat_level)
        : 0;

    // Reset to zero immediately when simulation stops
    useEffect(() => {
        if (!simActive) {
            setProgress(0);
        }
    }, [simActive]);

    // Animate progress toward target (only when simulating)
    useEffect(() => {
        if (!simActive && targetValue === 0) return; // skip animation when idle
        const raf = { id: null };
        const start = progress;
        const startTime = performance.now();
        const duration = 1200;
        const animate = (now) => {
            const elapsed = now - startTime;
            const p = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setProgress(Math.round(start + (targetValue - start) * eased));
            if (p < 1) raf.id = requestAnimationFrame(animate);
        };
        raf.id = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf.id);
    }, [targetValue]); // eslint-disable-line react-hooks/exhaustive-deps

    // SVG arc
    const size = 260;
    const strokeWidth = 18;
    const radius = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size / 2 + 20;

    const startAngle = 180;
    const totalAngle = 180;
    const progressAngle = (progress / 100) * totalAngle;

    function polarToCartesian(angle) {
        const rad = (angle * Math.PI) / 180;
        return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) };
    }

    const bgStart = polarToCartesian(startAngle);
    const bgEnd = polarToCartesian(0);
    const bgPath = `M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 0 1 ${bgEnd.x} ${bgEnd.y}`;
    const circumference = Math.PI * radius;
    const dashOffset = circumference - (progress / 100) * circumference;

    const needleAngle = startAngle - progressAngle;
    const needleTip = polarToCartesian(needleAngle);

    const riskColor = progress > 70 ? '#EF4444' : progress > 40 ? '#F59E0B' : '#22C55E';

    // Readable label — driven entirely by backend threat_level when active
    const displayLabel = simActive
        ? ((dashData?.threat_level || 'LOW') + ' RISK')
        : 'AWAITING SIMULATION';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
                padding: '28px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                border: simActive ? `1px solid ${riskColor}20` : '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', margin: 0 }}>
                        {simActive ? 'Threat Level' : 'Dark Web Risk Level'}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        {simActive ? 'Based on live simulation attack rate' : 'Start simulation to measure exposure'}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="animate-pulse-glow" style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: simActive ? '#22C55E' : '#4B5563',
                        boxShadow: simActive ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
                    }} />
                    <span style={{ fontSize: '11px', color: '#4B5563' }}>{simActive ? 'Live' : 'Idle'}</span>
                </div>
            </div>

            <svg width={size} height={size / 2 + 50} viewBox={`0 0 ${size} ${size / 2 + 50}`}>
                <defs>
                    <filter id="glow-gauge" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22C55E" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#EF4444" />
                    </linearGradient>
                </defs>
                <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} strokeLinecap="round" />
                <path d={bgPath} fill="none"
                    stroke={simActive ? 'url(#gauge-gradient)' : 'rgba(255,255,255,0.04)'}
                    strokeWidth={strokeWidth} strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={dashOffset}
                    filter={simActive ? 'url(#glow-gauge)' : undefined}
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
                <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y}
                    stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"
                    style={{ transition: 'all 0.5s ease-out' }} />
                <circle cx={cx} cy={cy} r="6" fill={simActive ? riskColor : '#374151'} style={{ transition: 'fill 0.5s' }} />
                <circle cx={cx} cy={cy} r="3" fill="#0B0F14" />
                <text x={cx} y={cy - 30} textAnchor="middle" fill={simActive ? '#F9FAFB' : '#374151'} fontSize="42" fontWeight="800" fontFamily="Inter" letterSpacing="-2">
                    {progress}%
                </text>
                <text x={cx} y={cy - 8} textAnchor="middle" fill={simActive ? riskColor : '#4B5563'} fontSize="12" fontWeight="600" fontFamily="Inter"
                    style={{ transition: 'fill 0.5s' }}>
                    {displayLabel}
                </text>
            </svg>

            <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                {[
                    { label: 'Low', color: '#22C55E' },
                    { label: 'Medium', color: '#F59E0B' },
                    { label: 'High', color: '#EF4444' },
                ].map((l) => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: simActive ? l.color : '#374151' }} />
                        <span style={{ fontSize: '11px', color: simActive ? '#9CA3AF' : '#4B5563' }}>{l.label}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
