import { useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardContext } from '../App';

export default function RealTimeOps() {
    const { dashData, isSimulating, toggleSimulation, resetSimulation, liveLog } = useContext(DashboardContext);

    const stats = {
        total_packets: dashData?.total_packets || 0,
        blocked_packets: dashData?.blocked_packets || 0,
        unique_ips: dashData?.unique_ips || 0,
        threat_level: dashData?.threat_level || 'LOW',
        attack_rate: dashData?.attack_rate || 0,
    };

    const running = isSimulating;
    const log = liveLog || [];
    const error = '';

    const handleReset = async () => {
        await resetSimulation();
    };

    const threatColors = { LOW: '#22C55E', MODERATE: '#F59E0B', HIGH: '#EF4444' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F9FAFB', margin: 0 }}>
                        Real-Time Operations
                    </h2>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                        Live packet simulation & threat monitoring
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleSimulation}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '12px',
                            background: running
                                ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                                : 'linear-gradient(135deg, #22C55E, #16A34A)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            boxShadow: running
                                ? '0 0 20px rgba(239,68,68,0.3)'
                                : '0 0 20px rgba(34,197,94,0.3)',
                        }}
                    >
                        {running ? '⏹ Stop' : '▶ Start Simulation'}
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleReset}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#9CA3AF',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        🔄 Reset
                    </motion.button>
                </div>
            </div>

            {error && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#EF4444',
                    fontSize: '13px',
                }}>
                    {error}
                </div>
            )}

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                {[
                    { label: 'Total Packets', value: stats.total_packets.toLocaleString(), color: '#F9FAFB' },
                    { label: 'Blocked', value: stats.blocked_packets.toLocaleString(), color: '#EF4444' },
                    { label: 'Attack Rate', value: `${stats.attack_rate}%`, color: '#F59E0B' },
                    { label: 'Unique IPs', value: stats.unique_ips.toLocaleString(), color: '#3B82F6' },
                    { label: 'Threat Level', value: stats.threat_level, color: threatColors[stats.threat_level] },
                ].map((kpi) => (
                    <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            padding: '20px',
                            borderRadius: '14px',
                            background: 'rgba(255,255,255,0.04)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '8px' }}>
                            {kpi.label.toUpperCase()}
                        </div>
                        <div style={{
                            fontSize: kpi.label === 'Threat Level' ? '18px' : '24px',
                            fontWeight: 800,
                            color: kpi.color,
                            letterSpacing: '-0.02em',
                            textShadow: kpi.label === 'Threat Level' ? `0 0 12px ${kpi.color}40` : 'none',
                        }}>
                            {kpi.value}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Packet Log */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                    padding: '24px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                }}
            >
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#F9FAFB', marginBottom: '16px' }}>
                    📡 Live Packet Stream
                </h3>

                {log.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📡</div>
                        <p>Start the simulation to see live packets</p>
                    </div>
                ) : (
                    <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 140px 70px 1fr 80px',
                            gap: '12px',
                            padding: '8px 12px',
                            fontSize: '11px',
                            color: '#6B7280',
                            fontWeight: 600,
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <span>TIME</span><span>SOURCE IP</span><span>PROTO</span><span>CLASSIFICATION</span><span>CONF</span>
                        </div>
                        <AnimatePresence>
                            {log.map((pkt, i) => (
                                <motion.div
                                    key={`${pkt.timestamp}-${i}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '80px 140px 70px 1fr 80px',
                                        gap: '12px',
                                        padding: '8px 12px',
                                        fontSize: '12px',
                                        borderRadius: '8px',
                                        background: pkt.is_attack ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.04)',
                                        borderLeft: `3px solid ${pkt.is_attack ? '#EF4444' : '#22C55E'}`,
                                    }}
                                >
                                    <span style={{ color: '#6B7280', fontFamily: 'monospace' }}>{pkt.timestamp}</span>
                                    <span style={{ color: '#D1D5DB', fontFamily: 'monospace' }}>{pkt.src_ip}</span>
                                    <span style={{ color: '#9CA3AF' }}>{pkt.protocol}</span>
                                    <span style={{
                                        color: pkt.is_attack ? '#EF4444' : '#22C55E',
                                        fontWeight: 600,
                                    }}>
                                        {pkt.is_attack ? '⛔' : '✅'} {pkt.label}
                                    </span>
                                    <span style={{ color: '#9CA3AF' }}>{(pkt.confidence * 100).toFixed(1)}%</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
