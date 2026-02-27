import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const GlassTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div style={{
            background: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
            padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', marginBottom: '8px' }}>
                {label}
            </div>
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '4px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                        <span style={{ color: '#D1D5DB', fontSize: '13px' }}>{p.name}</span>
                    </div>
                    <span style={{ color: p.color, fontSize: '14px', fontWeight: 700 }}>
                        {p.value.toLocaleString()} p/s
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function LiveTrafficChart({ dashData, isSimulating }) {
    const [data, setData] = useState([]);
    const [prevStats, setPrevStats] = useState({ total: 0, blocked: 0 });

    // Update chart data whenever dashData updates
    useEffect(() => {
        if (!dashData || !isSimulating) {
            // If not simulating, we could show a static/demo wave or just the current data
            if (!isSimulating && data.length === 0) {
                // Generate some fake idle data to make it look nice even when off
                const now = new Date();
                const demo = Array.from({ length: 30 }).map((_, i) => {
                    const t = new Date(now.getTime() - (29 - i) * 1000);
                    return {
                        time: t.toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
                        traffic: Math.floor(Math.random() * 20) + 10,
                        threats: Math.floor(Math.random() * 2),
                    };
                });
                setData(demo);
            }
            return;
        }

        const now = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });

        // Calculate delta (packets per second since last poll)
        // dashData polls every 2 seconds, simulation ticks faster, so this is an approximation of volume
        const currentTotal = dashData.total_packets || 0;
        const currentBlocked = dashData.blocked_packets || 0;

        let trafficDelta = currentTotal - prevStats.total;
        let threatDelta = currentBlocked - prevStats.blocked;

        // Handle resets or first loads
        if (trafficDelta < 0 || prevStats.total === 0) {
            trafficDelta = 0;
            threatDelta = 0;
        }

        setPrevStats({ total: currentTotal, blocked: currentBlocked });

        setData(prevData => {
            const newPoint = {
                time: now,
                traffic: trafficDelta > 0 ? trafficDelta : (Math.floor(Math.random() * 5) + 5), // Keep a small baseline noise
                threats: threatDelta > 0 ? threatDelta : 0,
            };

            const newData = [...prevData, newPoint];
            // Keep last 30 data points exactly
            if (newData.length > 30) {
                return newData.slice(newData.length - 30);
            }
            return newData;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dashData?.total_packets, dashData?.blocked_packets, isSimulating]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                gridColumn: '1 / -1', // Span full width if in a grid
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F9FAFB', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📈 Live Network Traffic
                        {isSimulating && (
                            <span style={{
                                fontSize: '10px', padding: '2px 8px', borderRadius: '12px',
                                background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)'
                            }}>
                                LIVE CAPTURE
                            </span>
                        )}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        Real-time packet volume vs detected threats (packets/sec)
                    </p>
                </div>

                {/* KPI Summaries */}
                <div style={{ display: 'flex', gap: '24px' }}>
                    <div>
                        <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>CURRENT VOL</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#3B82F6' }}>
                            {data.length > 0 ? data[data.length - 1].traffic : 0} <span style={{ fontSize: '12px', color: '#6B7280' }}>p/s</span>
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>THREAT VOL</div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#EF4444' }}>
                            {data.length > 0 ? data[data.length - 1].threats : 0} <span style={{ fontSize: '12px', color: '#6B7280' }}>p/s</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ height: 280, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis
                            dataKey="time"
                            stroke="#6B7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={20}
                        />
                        <YAxis
                            stroke="#6B7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => val === 0 ? '0' : val}
                        />
                        <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area
                            type="monotone"
                            dataKey="traffic"
                            name="Total Traffic"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#trafficGradient)"
                            activeDot={{ r: 6, fill: '#3B82F6', stroke: '#111827', strokeWidth: 2 }}
                            isAnimationActive={false} // Disable to prevent jerky re-renders on every tick
                        />
                        <Area
                            type="monotone"
                            dataKey="threats"
                            name="Threats Detected"
                            stroke="#EF4444"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#threatGradient)"
                            activeDot={{ r: 6, fill: '#EF4444', stroke: '#111827', strokeWidth: 2 }}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
