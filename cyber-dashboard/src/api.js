const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';
const API = API_BASE;

export async function trainModels(modelName = null, sampleSize = 100000) {
    const res = await fetch(`${API}/api/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName, sample_size: sampleSize }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function getModels() {
    const res = await fetch(`${API}/api/models`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function setActiveModel(name) {
    const res = await fetch(`${API}/api/set-active/${encodeURIComponent(name)}`, { method: 'POST' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function predictPackets(count = 5) {
    const res = await fetch(`${API}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function resetSimulation() {
    const res = await fetch(`${API}/api/simulation/reset`, { method: 'POST' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function getSystemMetrics() {
    const res = await fetch(`${API}/api/system`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function getDashboardStats() {
    const res = await fetch(`${API}/api/dashboard`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}
