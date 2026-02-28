import { motion } from 'framer-motion';

const DEFAULT_SEVERITIES = [
    { label: 'Exploited', color: '#EF4444' },
    { label: 'Critical', color: '#DC2626' },
    { label: 'High', color: '#F97316' },
    { label: 'Medium', color: '#F59E0B' },
    { label: 'Low', color: '#22C55E' },
];

// Zero rings shown when simulation has not started
const ZERO_SEVERITIES = DEFAULT_SEVERITIES.map(s => ({ ...s, value: 0, total: 100 }));

// Map backend attack_type_counts to severity buckets
function mapAttackTypesToSeverity(attackCounts) {
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
        sevCounts[getSeverity(label)] += count;
    }

    const total = Math.max(1, Object.values(sevCounts).reduce((a, b) => a + b, 0));
    return DEFAULT_SEVERITIES.map(s => ({
        ...s,
        value: sevCounts[s.label] || 0,
        total,
    }));
}

function RadialRing({ label, value, total, color, simActive }) {
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
                        stroke={simActive ? color : 'rgba(255,255,255,0.04)'}
                        strokeWidth={strokeWidth} strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={dashOffset}
                        filter={simActive ? `url(#glow-${label})` : undefined}
                        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                </svg>
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: simActive ? '#F9FAFB' : '#374151', letterSpacing: '-0.03em' }}>
                        {value.toLocaleString()}
                    </div>
                </div>
            </div>
            <span style={{ fontSize: '12px', color: simActive ? '#9CA3AF' : '#4B5563', fontWeight: 500 }}>{label}</span>
        </div>
    );
}

export default function ThreatSeverity({ dashData }) {
    const simActive = dashData?.simulation_active || false;
    const attackCounts = dashData?.attack_type_counts || {};

    // Only show real data when simulation is active; zeros otherwise
    const displaySeverities = simActive
        ? mapAttackTypesToSeverity(attackCounts)
        : ZERO_SEVERITIES;

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
                        {simActive
                            ? 'Live attack types from ML detection'
                            : 'Start simulation to see severity breakdown'}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="animate-pulse-glow" style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: simActive ? '#22C55E' : '#4B5563',
                        boxShadow: simActive ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
                    }} />
                    <span style={{ fontSize: '11px', color: '#4B5563' }}>
                        {simActive ? 'Live' : 'Idle'}
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
                {displaySeverities.map((s) => (
                    <RadialRing key={s.label} {...s} simActive={simActive} />
                ))}
            </div>
        </motion.div>
    );
}
