const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = IS_DEV ? 'http://localhost:8000/api/v1' : '/api/v1';

export const API = {
    async checkSystem() {
        try {
            const response = await fetch(`${API_BASE}/system/ffmpeg`);
            if (!response.ok) return { ffmpeg_installed: true }; // fail-safe
            return await response.json();
        } catch (error) {
            console.error('System Check Error:', error);
            return { ffmpeg_installed: true }; // Default to true if server unreachable yet
        }
    },
    
    async fetchInfo(url) {
        try {
            const response = await fetch(`${API_BASE}/info?url=${encodeURIComponent(url)}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to fetch info');
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    async startDownload(url, formatId, type = 'video') {
        try {
            const response = await fetch(`${API_BASE}/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, format_id: formatId, type })
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to start download');
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    async getStatus(taskId) {
        try {
            const response = await fetch(`${API_BASE}/status/${taskId}`);
            if (!response.ok) {
                throw new Error('Failed to get status');
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    getFileUrl(filePath) {
        const origin = API_BASE.replace('/api/v1', '');
        return `${origin}${filePath}`;
    }
};
