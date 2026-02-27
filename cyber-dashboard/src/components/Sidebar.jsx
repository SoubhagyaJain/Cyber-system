import { motion } from 'framer-motion';
import {
    HiOutlineViewGrid,
    HiOutlineGlobe,
    HiOutlineShieldCheck,
    HiOutlineExclamation,
    HiOutlineChartBar,
    HiOutlineDocumentReport,
    HiOutlineCog,
    HiOutlineSupport,
    HiOutlineSearch,
    HiOutlineLightningBolt,
    HiOutlineDesktopComputer,
    HiOutlineBeaker,
} from 'react-icons/hi';

const navItems = [
    { icon: HiOutlineViewGrid, label: 'Dashboard', id: 'dashboard' },
    { icon: HiOutlineGlobe, label: 'Attack Surface', id: 'attack-surface' },
    { icon: HiOutlineChartBar, label: 'Model Comparison', id: 'model-comparison' },
    { icon: HiOutlineLightningBolt, label: 'Real-Time Ops', id: 'real-time-ops' },
    { icon: HiOutlineBeaker, label: 'Intelligence', id: 'intelligence' },
    { icon: HiOutlineShieldCheck, label: 'Threat Exposure', id: 'attack-surface' },
    { icon: HiOutlineDocumentReport, label: 'Reports', id: 'dashboard' },
];

const bottomItems = [
    { icon: HiOutlineDesktopComputer, label: 'Resources', id: 'resources' },
    { icon: HiOutlineCog, label: 'Settings', id: 'dashboard' },
    { icon: HiOutlineSupport, label: 'Support', id: 'dashboard' },
];

export default function Sidebar({ activePage, onNavigate }) {
    return (
        <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
                width: '260px',
                minWidth: '260px',
                height: '100vh',
                position: 'sticky',
                top: 0,
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 14px',
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '0 24px 24px 0',
                boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 30px rgba(0,0,0,0.3)',
            }}
        >
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px', marginBottom: '24px' }}>
                <div
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(34,197,94,0.3)',
                    }}
                >
                    <HiOutlineShieldCheck size={22} color="#fff" />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em', color: '#F9FAFB' }}>CyberSentinel</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.04em' }}>SECURITY PLATFORM</div>
                </div>
            </div>

            {/* Search */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    marginBottom: '20px',
                }}
            >
                <HiOutlineSearch size={16} color="#6B7280" />
                <span style={{ fontSize: '13px', color: '#6B7280' }}>Search...</span>
            </div>

            {/* Main Nav */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {navItems.map((item) => (
                    <NavItem
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        isActive={activePage === item.id}
                        onClick={() => onNavigate(item.id)}
                    />
                ))}
            </nav>

            {/* Bottom Nav */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                {bottomItems.map((item) => (
                    <NavItem
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        isActive={activePage === item.id}
                        onClick={() => onNavigate(item.id)}
                    />
                ))}
            </div>
        </motion.aside>
    );
}

function NavItem({ icon: Icon, label, isActive, onClick }) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '12px',
                border: isActive ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                background: isActive
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)'
                    : 'transparent',
                color: isActive ? '#22C55E' : '#9CA3AF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '-0.01em',
                boxShadow: isActive ? '0 0 20px rgba(34,197,94,0.1)' : 'none',
                fontFamily: 'inherit',
            }}
        >
            <Icon size={20} />
            <span>{label}</span>
            {isActive && (
                <motion.div
                    layoutId="active-indicator"
                    style={{
                        marginLeft: 'auto',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#22C55E',
                        boxShadow: '0 0 8px rgba(34,197,94,0.6)',
                    }}
                />
            )}
        </motion.button>
    );
}
