import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const initialCountries = [
    { name: 'United States', code: 'US', flag: '🇺🇸', percentage: 42, attacks: 12400 },
    { name: 'China', code: 'CN', flag: '🇨🇳', percentage: 28, attacks: 8200 },
    { name: 'Russia', code: 'RU', flag: '🇷🇺', percentage: 18, attacks: 5300 },
    { name: 'Canada', code: 'CA', flag: '🇨🇦', percentage: 7, attacks: 2100 },
    { name: 'Germany', code: 'DE', flag: '🇩🇪', percentage: 5, attacks: 1500 },
];

function formatCount(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
}

// Simplified world map dots with live pulsing
const baseMapDots = [
    { x: 22, y: 32, size: 6, intensity: 1.0 },
    { x: 18, y: 38, size: 4, intensity: 0.7 },
    { x: 25, y: 28, size: 3, intensity: 0.5 },
    { x: 52, y: 28, size: 4, intensity: 0.6 },
    { x: 48, y: 32, size: 3, intensity: 0.4 },
    { x: 55, y: 25, size: 3, intensity: 0.3 },
    { x: 70, y: 25, size: 5, intensity: 0.85 },
    { x: 65, y: 30, size: 3, intensity: 0.5 },
    { x: 75, y: 28, size: 4, intensity: 0.7 },
    { x: 78, y: 38, size: 5, intensity: 0.9 },
    { x: 82, y: 35, size: 3, intensity: 0.6 },
    { x: 30, y: 60, size: 3, intensity: 0.3 },
    { x: 32, y: 55, size: 2, intensity: 0.2 },
    { x: 52, y: 50, size: 3, intensity: 0.3 },
    { x: 55, y: 45, size: 2, intensity: 0.2 },
    { x: 85, y: 62, size: 3, intensity: 0.3 },
];

function WorldMapSVG({ activeDots }) {
    return (
        <svg viewBox="0 0 100 70" style={{ width: '100%', height: '100%' }}>
            <defs>
                <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Continent outlines */}
            <g opacity="0.12" fill="none" stroke="#9CA3AF" strokeWidth="0.3">
                <path d="M 10,20 Q 15,15 25,18 Q 30,20 28,30 Q 25,40 20,42 Q 15,38 12,30 Z" />
                <path d="M 25,48 Q 30,45 35,50 Q 33,60 30,65 Q 27,62 25,55 Z" />
                <path d="M 45,18 Q 50,16 55,20 Q 53,28 48,30 Q 45,25 45,18 Z" />
                <path d="M 48,35 Q 55,33 58,40 Q 56,55 52,58 Q 48,52 47,42 Z" />
                <path d="M 58,15 Q 70,12 85,20 Q 88,30 82,38 Q 75,42 65,38 Q 58,30 58,15 Z" />
                <path d="M 80,55 Q 88,52 92,58 Q 88,65 82,62 Z" />
            </g>

            {/* Grid lines */}
            <g opacity="0.04" stroke="#9CA3AF" strokeWidth="0.15">
                {[15, 25, 35, 45, 55].map(y => <line key={`h-${y}`} x1="0" y1={y} x2="100" y2={y} />)}
                {[20, 40, 60, 80].map(x => <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="70" />)}
            </g>

            {/* Attack dots */}
            {baseMapDots.map((dot, i) => {
                const isActive = activeDots.includes(i);
                const scale = isActive ? 1.5 : 1;
                return (
                    <g key={i}>
                        <circle cx={dot.x} cy={dot.y} r={dot.size * 1.8 * scale} fill="#3B82F6" opacity={dot.intensity * (isActive ? 0.25 : 0.15)}>
                            {isActive && (
                                <animate attributeName="r" values={`${dot.size * 1.8};${dot.size * 3};${dot.size * 1.8}`} dur="1s" repeatCount="1" />
                            )}
                        </circle>
                        <circle cx={dot.x} cy={dot.y} r={dot.size * 0.6} fill="#3B82F6" opacity={dot.intensity} filter="url(#dot-glow)">
                            <animate attributeName="opacity" values={`${dot.intensity};${dot.intensity * 0.5};${dot.intensity}`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                            <animate attributeName="r" values={`${dot.size * 0.6};${dot.size * 0.8};${dot.size * 0.6}`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                        </circle>
                        <circle cx={dot.x} cy={dot.y} r={dot.size * 0.25} fill="#fff" opacity={dot.intensity * 0.8} />
                        {isActive && (
                            <circle cx={dot.x} cy={dot.y} r={dot.size * 2.5} fill="none" stroke="#3B82F6" strokeWidth="0.3" opacity="0.5">
                                <animate attributeName="r" values={`${dot.size * 0.6};${dot.size * 4}`} dur="1.5s" repeatCount="1" />
                                <animate attributeName="opacity" values="0.6;0" dur="1.5s" repeatCount="1" />
                            </circle>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

export default function GlobalFootprint() {
    const [countries, setCountries] = useState(initialCountries);
    const [activeDots, setActiveDots] = useState([]);

    // Live update every 4 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCountries(prev => {
                return prev.map(c => {
                    const delta = Math.floor(Math.random() * 200) - 50;
                    const newAttacks = Math.max(100, c.attacks + delta);
                    return { ...c, attacks: newAttacks };
                }).sort((a, b) => b.attacks - a.attacks).map((c, i, arr) => {
                    const total = arr.reduce((s, x) => s + x.attacks, 0);
                    return { ...c, percentage: Math.round((c.attacks / total) * 100) };
                });
            });

            // Random active dots for attack ripple effect
            const numActive = Math.floor(Math.random() * 4) + 1;
            const dots = [];
            for (let i = 0; i < numActive; i++) {
                dots.push(Math.floor(Math.random() * baseMapDots.length));
            }
            setActiveDots(dots);
            setTimeout(() => setActiveDots([]), 2000);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{
                padding: '28px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', margin: 0 }}>
                        Global Footprint
                    </h3>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        Geographic attack origin distribution
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="animate-pulse-glow" style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#3B82F6', boxShadow: '0 0 6px rgba(59,130,246,0.6)',
                    }} />
                    <span style={{ fontSize: '11px', color: '#4B5563' }}>Live · 4s</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px', alignItems: 'start' }}>
                {/* Country list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {countries.map((c) => (
                        <div key={c.code}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '16px' }}>{c.flag}</span>
                                    <span style={{ fontSize: '13px', color: '#D1D5DB', fontWeight: 500 }}>{c.name}</span>
                                </div>
                                <motion.span key={c.attacks} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
                                    style={{ fontSize: '12px', color: '#6B7280' }}>
                                    {formatCount(c.attacks)}
                                </motion.span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                <motion.div
                                    animate={{ width: `${c.percentage}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    style={{
                                        height: '100%', borderRadius: 2,
                                        background: `linear-gradient(90deg, #3B82F6, ${c.percentage > 30 ? '#60A5FA' : '#3B82F6'})`,
                                        boxShadow: '0 0 8px rgba(59,130,246,0.3)',
                                    }}
                                />
                            </div>
                            <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '3px' }}>{c.percentage}%</div>
                        </div>
                    ))}
                </div>

                {/* Map */}
                <div style={{
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    padding: '16px',
                    aspectRatio: '16/10',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <WorldMapSVG activeDots={activeDots} />
                </div>
            </div>
        </motion.div>
    );
}
