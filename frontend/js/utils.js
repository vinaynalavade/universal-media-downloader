export const Utils = {
    formatDuration(seconds) {
        if (!seconds) return '00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },
    
    formatBytes(bytes, decimals = 2) {
        if (!+bytes) return 'Unknown Size';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        // Prevent exact duplicates in the stack
        const existingToasts = Array.from(container.children);
        if (existingToasts.some(t => t.dataset.message === message)) {
            return;
        }
        
        // Limit stack size (max 5)
        if (existingToasts.length >= 5) {
            existingToasts[0].remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.dataset.message = message;
        
        const iconMap = {
            'success': '✓',
            'error': '✕',
            'warning': '⚠',
            'info': 'ℹ'
        };
        const icon = iconMap[type] || iconMap['info'];
        
        toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-text">${message}</span>`;
        
        container.appendChild(toast);
        
        let timeoutId;
        const dismiss = () => {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        };
        
        const startTimer = () => {
            timeoutId = setTimeout(dismiss, 4000);
        };
        
        const clearTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
        
        toast.addEventListener('mouseenter', clearTimer);
        toast.addEventListener('mouseleave', startTimer);
        toast.addEventListener('click', dismiss);
        
        startTimer();
    }
};
