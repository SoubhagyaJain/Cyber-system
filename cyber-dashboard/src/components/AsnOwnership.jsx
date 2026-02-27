import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';

const data = [
    { name: 'AS13335', user1: 420, user2: 310, user3: 180 },
    { name: 'AS15169', user1: 380, user2: 250, user3: 220 },
    { name: 'AS16509', user1: 340, user2: 400, user3: 150 },
    { name: 'AS20940', user1: 290, user2: 180, user3: 350 },
    { name: 'AS8075', user1: 220, user2: 320, user3: 270 },
    { name: 'AS14618', user1: 180, user2: 260, user3: 190 },
];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
        <div
            style={{
                background: 'rgba(17,24,39,0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
        >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#F9FAFB', marginBottom: '8px' }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{p.name}:</span>
                    <span style={{ fontSize: '12px', color: '#F9FAFB', fontWeight: 600 }}>{p.value}</span>
                </div>
            ))}
        </div>
    );
};

const RoundedBar = (props) => {
    const { x, y, width, height, fill } = props;
    if (height <= 0) return null;
    const radius = Math.min(6, width / 2);
    return (
        <g>
            <defs>
                <filter id={`bar-glow-${fill}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={radius}
                ry={radius}
                fill={fill}
                style={{ transition: 'all 0.3s ease' }}
            />
        </g>
    );
};

export default function AsnOwnership() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
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
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', marginBottom: '4px' }}>
                ASN Ownership
            </h3>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '20px' }}>
                Autonomous system number allocation
            </p>

            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data} barCategoryGap="20%" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                        dataKey="name"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Legend
                        wrapperStyle={{ paddingTop: '12px' }}
                        formatter={(value) => (
                            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{value}</span>
                        )}
                    />
                    <Bar dataKey="user1" name="Cloudflare" fill="#22C55E" shape={<RoundedBar />} />
                    <Bar dataKey="user2" name="Google" fill="#3B82F6" shape={<RoundedBar />} />
                    <Bar dataKey="user3" name="Amazon" fill="#F59E0B" shape={<RoundedBar />} />
                </BarChart>
            </ResponsiveContainer>
        </motion.div>
    );
}
