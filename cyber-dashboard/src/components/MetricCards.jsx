import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineGlobeAlt,
    HiOutlineServer,
    HiOutlineStatusOnline,
    HiOutlineShieldExclamation,
    HiOutlineDatabase,
} from 'react-icons/hi';

// Animate a number from current to target
function useAnimatedNumber(target, duration = 800) {
    const [display, setDisplay] = useState(target);
    const raf = useRef(null);
    const start = useRef(display);
    const startTime = useRef(null);

    useEffect(() => {
        start.current = display;
        startTime.current = performance.now();
        const animate = (now) => {
            const elapsed = now - startTime.current;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start.current + (target - start.current) * eased);
            setDisplay(current);
            if (progress < 1) raf.current = requestAnimationFrame(animate);
        };
        raf.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf.current);
    }, [target]);

    return display;
}

// Removed Fallback simulated metrics

function MetricCard({ icon: Icon, label, value, change, trend, color, isSim }) {
    const animatedValue = useAnimatedNumber(value);

    return (
        <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                border: isSim ? `1px solid ${color}25` : '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                cursor: 'pointer',
            }}
        >
            <div style={{
                width: 44, height: 44, borderRadius: '12px',
                background: `${color}15`, border: `1px solid ${color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px', color: color,
            }}>
                <Icon size={22} />
            </div>

            <div style={{ fontSize: '28px', fontWeight: 800, color: '#F9FAFB', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {animatedValue.toLocaleString()}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>{label}</span>
                {change !== undefined && (
                    <motion.span
                        key={`${trend}-${change}`}
                        initial={{ scale: 1.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: trend === 'up' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            color: trend === 'up' ? '#22C55E' : '#EF4444',
                        }}
                    >
                        {trend === 'up' ? '↑' : '↓'} {Math.abs(change)}%
                    </motion.span>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <div className="animate-pulse-glow" style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: isSim ? '#22C55E' : '#6B7280',
                    boxShadow: isSim ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
                }} />
                <span style={{ fontSize: '11px', color: '#4B5563' }}>
                    {isSim ? 'Live from simulation' : 'Paused · Last recorded'}
                </span>
            </div>
        </motion.div>
    );
}

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
};
const cardMotion = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function MetricCards({ dashData }) {
    const simActive = dashData?.simulation_active || false;

    // Show real data from backend persistently
    const metrics = [
        { icon: HiOutlineGlobeAlt, label: 'Total Packets', value: dashData?.total_packets || 0, color: '#F9FAFB', trend: 'up', change: undefined },
        { icon: HiOutlineShieldExclamation, label: 'Blocked', value: dashData?.blocked_packets || 0, color: '#EF4444', trend: 'up', change: undefined },
        { icon: HiOutlineStatusOnline, label: 'Attack Rate', value: Math.round(dashData?.attack_rate || 0), color: '#F59E0B', trend: (dashData?.attack_rate || 0) > 10 ? 'up' : 'down', change: dashData?.attack_rate || 0 },
        { icon: HiOutlineServer, label: 'Unique IPs', value: dashData?.unique_ips || 0, color: '#3B82F6', trend: 'up', change: undefined },
        { icon: HiOutlineDatabase, label: 'Models Active', value: dashData?.models_trained || 0, color: '#22C55E', trend: 'up', change: undefined },
    ];

    return (
        <motion.div variants={container} initial="hidden" animate="show"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            {metrics.map((m) => (
                <motion.div key={m.label} variants={cardMotion}>
                    <MetricCard {...m} isSim={simActive} />
                </motion.div>
            ))}
        </motion.div>
    );
}
