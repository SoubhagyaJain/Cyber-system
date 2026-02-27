import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import MetricCards from './components/MetricCards';
import DarkWebGauge from './components/DarkWebGauge';
import ThreatSeverity from './components/ThreatSeverity';
import GlobalFootprint from './components/GlobalFootprint';
import AsnOwnership from './components/AsnOwnership';
import ModelSection from './components/ModelSection';
import LiveTrafficChart from './components/LiveTrafficChart';
import ModelCharts from './components/ModelCharts';
import ModelComparison from './components/ModelComparison';
import RealTimeOps from './components/RealTimeOps';
import IntelligencePanel from './components/IntelligencePanel';
import ResourceMonitor from './components/ResourceMonitor';
import { getDashboardStats, predictPackets, resetSimulation } from './api';

// Context to share dashboard data across components
export const DashboardContext = createContext(null);

function DashboardHome() {
    const { dashData, isSimulating } = useContext(DashboardContext);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <MetricCards dashData={dashData} />
            <LiveTrafficChart dashData={dashData} isSimulating={isSimulating} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '24px' }}>
                <DarkWebGauge dashData={dashData} />
                <ThreatSeverity dashData={dashData} />
            </div>
            <ModelSection dashData={dashData} />
            <ModelCharts dashData={dashData} />
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
                <GlobalFootprint dashData={dashData} />
                <AsnOwnership />
            </div>
        </div>
    );
}

const PAGES = {
    'dashboard': DashboardHome,
    'attack-surface': DashboardHome,
    'model-comparison': ModelComparison,
    'real-time-ops': RealTimeOps,
    'intelligence': IntelligencePanel,
    'resources': ResourceMonitor,
};

const PAGE_TITLES = {
    'dashboard': { title: 'Attack Surface Dashboard', sub: 'Real-time cyber threat intelligence overview' },
    'attack-surface': { title: 'Attack Surface Dashboard', sub: 'Real-time cyber threat intelligence overview' },
    'model-comparison': { title: 'Model Comparison', sub: 'Benchmark & compare all ML architectures' },
    'real-time-ops': { title: 'Real-Time Operations', sub: 'Live packet simulation & threat monitoring' },
    'intelligence': { title: 'Intelligence & XAI', sub: 'Explainable AI and model insights' },
    'resources': { title: 'Resource Monitor', sub: 'System health & resource utilization' },
};

export default function App() {
    const [activePage, setActivePage] = useState('attack-surface');
    const [dashData, setDashData] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [liveLog, setLiveLog] = useState([]);

    // Poll dashboard stats every 2 seconds
    const fetchDash = useCallback(async () => {
        try {
            const data = await getDashboardStats();
            setDashData(data);
            if (!isSimulating && data.recent_packets) {
                setLiveLog(data.recent_packets);
            }
        } catch (e) {
            // backend not available yet — that's fine
        }
    }, []);

    useEffect(() => {
        fetchDash();
        const interval = setInterval(fetchDash, 2000);
        return () => clearInterval(interval);
    }, [fetchDash]);

    // Fast simulation loop
    useEffect(() => {
        let interval;
        if (isSimulating) {
            const runTick = async () => {
                try {
                    const data = await predictPackets(3);
                    setLiveLog(data.log);
                } catch (e) {
                    setIsSimulating(false);
                }
            };
            runTick();
            interval = setInterval(runTick, 1000);
        }
        return () => clearInterval(interval);
    }, [isSimulating]);

    const handleReset = async () => {
        setIsSimulating(false);
        try {
            // Zero out dashData immediately in React state for instant UI sync
            setDashData(prev => prev ? {
                ...prev,
                total_packets: 0,
                blocked_packets: 0,
                unique_ips: 0,
                attack_rate: 0,
                threat_level: 'LOW',
                attack_type_counts: {},
                packet_log: [],
                simulation_active: false,
            } : prev);
            setLiveLog([]);
            await resetSimulation();
            // Re-fetch to confirm backend state
            fetchDash();
        } catch (e) {
            console.error('Failed to reset', e);
        }
    };

    const contextValue = {
        dashData,
        isSimulating,
        toggleSimulation: () => setIsSimulating(!isSimulating),
        resetSimulation: handleReset,
        liveLog
    };

    const PageComponent = PAGES[activePage] || DashboardHome;
    const pageInfo = PAGE_TITLES[activePage] || PAGE_TITLES['dashboard'];

    return (
        <DashboardContext.Provider value={contextValue}>
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar activePage={activePage} onNavigate={setActivePage} />

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <TopBar title={pageInfo.title} subtitle={pageInfo.sub} />

                    <main
                        style={{
                            flex: 1,
                            padding: '24px 32px',
                            overflowY: 'auto',
                        }}
                    >
                        <PageComponent />
                    </main>
                </div>
            </div>
        </DashboardContext.Provider>
    );
}
