import { motion } from 'framer-motion';
import { HiOutlineBell } from 'react-icons/hi';

export default function TopBar({ title = "Attack Surface Dashboard", subtitle = "" }) {
    return (
        <motion.header
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 32px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            {/* Left */}
            <div>
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    color: '#F9FAFB',
                    margin: 0,
                }}>
                    {title}
                </h1>
                {subtitle && (
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* Notification */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                        position: 'relative',
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#9CA3AF',
                        fontFamily: 'inherit',
                    }}
                >
                    <HiOutlineBell size={20} />
                    <span
                        style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#EF4444',
                            boxShadow: '0 0 8px rgba(239,68,68,0.6)',
                        }}
                    />
                </motion.button>

                {/* Divider */}
                <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)' }} />

                {/* Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#fff',
                            boxShadow: '0 0 12px rgba(59,130,246,0.3)',
                        }}
                    >
                        SJ
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#F9FAFB' }}>Soubhagya Jain</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>Security Analyst</div>
                    </div>
                </div>
            </div>
        </motion.header>
    );
}
