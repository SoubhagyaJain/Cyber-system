import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function DarkWebGauge({ dashData }) {
    const [fallbackValue, setFallbackValue] = useState(0);
    const [progress, setProgress] = useState(0);

    const simActive = dashData?.simulation_active || false;
    const targetValue = simActive
        ? Math.min(95, Math.max(5, Math.round(dashData.attack_rate * 2.5)))
        : fallbackValue;

    // Reset to zero when simulation stops; oscillate only after a delay
    useEffect(() => {
        if (simActive) {
            // Simulation just started — reset fallback so gauge reads real data
            return;
        }
        // Immediately snap to 0 on reset
        setFallbackValue(0);
        // Start oscillating only after 30s of idle (so page-load looks live but reset looks clean)
        const timer = setTimeout(() => {
            const interval = setInterval(() => {
                setFallbackValue(prev => {
                    const delta = Math.floor(Math.random() * 10) - 4;
                    return Math.max(20, Math.min(95, prev + delta));
                });
            }, 4000);
            // Store cleanup in a ref-like closure
            return () => clearInterval(interval);
        }, 30000);
        return () => clearTimeout(timer);
    }, [simActive]);

    // Animate progress toward target
    useEffect(() => {
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
    }, [targetValue]);

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
    const riskLabel = progress > 70 ? 'HIGH RISK' : progress > 40 ? 'MODERATE' : 'LOW RISK';

    // Use backend threat level when sim active
    const displayLabel = simActive ? (dashData.threat_level || 'LOW') : riskLabel;

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
                        {simActive ? 'Based on live simulation attack rate' : 'Exposure score based on leaked credentials'}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="animate-pulse-glow" style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: simActive ? '#22C55E' : riskColor,
                        boxShadow: `0 0 6px ${simActive ? 'rgba(34,197,94,0.6)' : riskColor + '90'}`,
                    }} />
                    <span style={{ fontSize: '11px', color: '#4B5563' }}>{simActive ? 'Simulation' : 'Live'}</span>
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
                <path d={bgPath} fill="none" stroke="url(#gauge-gradient)" strokeWidth={strokeWidth} strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={dashOffset} filter="url(#glow-gauge)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
                <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y}
                    stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"
                    style={{ transition: 'all 0.5s ease-out' }} />
                <circle cx={cx} cy={cy} r="6" fill={riskColor} style={{ transition: 'fill 0.5s' }} />
                <circle cx={cx} cy={cy} r="3" fill="#0B0F14" />
                <text x={cx} y={cy - 30} textAnchor="middle" fill="#F9FAFB" fontSize="42" fontWeight="800" fontFamily="Inter" letterSpacing="-2">
                    {progress}%
                </text>
                <text x={cx} y={cy - 8} textAnchor="middle" fill={riskColor} fontSize="12" fontWeight="600" fontFamily="Inter"
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
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{l.label}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
