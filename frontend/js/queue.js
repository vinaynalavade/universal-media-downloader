import { API } from './api.js';
import { Utils } from './utils.js';

export const QueueManager = {
    items: [],
    isProcessing: false,
    isPaused: false,

    init() {
        this.queueContainer = document.getElementById('queue-list');
        this.queuePanel = document.getElementById('queue-panel');
        this.clearBtn = document.getElementById('clear-queue-btn');
        this.pauseBtn = document.getElementById('pause-queue-btn');
        
        if(this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearCompleted());
        }
        
        if(this.pauseBtn) {
            this.pauseBtn.addEventListener('click', () => this.togglePause());
        }
    },

    add(mediaInfo, formatId, type, url, qualityLabel) {
        const item = {
            id: 'q_' + Math.random().toString(36).substr(2, 9),
            mediaInfo,
            formatId,
            type,
            url,
            qualityLabel,
            status: 'waiting',
            progress: 0,
            taskId: null,
            speed: '-',
            eta: '-',
            message: 'Waiting in queue...'
        };
        
        this.items.push(item);
        this.render();
        Utils.showToast(`Added to queue: ${mediaInfo.title}`, 'success');
        
        if (this.queuePanel) this.queuePanel.classList.remove('hidden');
        
        this.processNext();
    },

    remove(id) {
        const index = this.items.findIndex(i => i.id === id);
        if (index === -1) return;
        const item = this.items[index];
        
        if (item.status === 'downloading' || item.status === 'processing') {
            if (item.taskId) {
                API.cancelDownload(item.taskId).catch(e => console.error(e));
            }
        }
        
        this.items.splice(index, 1);
        this.render();
        
        if (this.items.length === 0 && this.queuePanel) {
            this.queuePanel.classList.add('hidden');
        }
    },

    retry(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        
        item.status = 'waiting';
        item.progress = 0;
        item.taskId = null;
        item.speed = '-';
        item.eta = '-';
        item.message = 'Waiting in queue...';
        
        this.render();
        Utils.showToast("Let's try that again.", 'info');
        this.processNext();
    },

    clearCompleted() {
        this.items = this.items.filter(i => i.status !== 'completed' && i.status !== 'cancelled');
        this.render();
        if (this.items.length === 0 && this.queuePanel) {
            this.queuePanel.classList.add('hidden');
        }
    },
    
    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.pauseBtn) {
            this.pauseBtn.textContent = this.isPaused ? 'Resume Queue' : 'Pause Queue';
        }
        if (!this.isPaused) {
            this.processNext();
        }
    },

    async processNext() {
        if (this.isProcessing || this.isPaused) return;
        
        const nextItem = this.items.find(i => i.status === 'waiting');
        if (!nextItem) return;
        
        this.isProcessing = true;
        nextItem.status = 'preparing';
        nextItem.message = 'Talking to YouTube...';
        this.render();
        
        try {
            const result = await API.startDownload(nextItem.url, nextItem.formatId, nextItem.type);
            if (result.task_id) {
                nextItem.taskId = result.task_id;
                await this.poll(nextItem);
            }
        } catch (error) {
            nextItem.status = 'error';
            nextItem.message = 'Even the internet has bad days.';
            Utils.showToast(`Failed to start: ${error.message}`, 'error');
            this.isProcessing = false;
            this.render();
            this.processNext();
        }
    },

    async poll(item) {
        let isPolling = true;
        
        while (isPolling) {
            if (this.isPaused) {
                // If paused, we still poll, but don't stop the backend download
            }
            
            try {
                const statusData = await API.getStatus(item.taskId);
                item.progress = statusData.progress || 0;
                item.speed = statusData.speed || '-';
                item.eta = statusData.eta || '-';
                
                if (statusData.status === 'processing') {
                    item.status = 'downloading';
                    item.message = statusData.message || 'Catching every byte...';
                } else if (statusData.status === 'completed') {
                    item.status = 'completed';
                    item.progress = 100;
                    item.message = 'Mission accomplished.';
                    item.speed = '-';
                    item.eta = '-';
                    isPolling = false;
                    
                    if(statusData.file_url) {
                        const fileUrl = API.getFileUrl(statusData.file_url);
                        const a = document.createElement('a');
                        a.href = fileUrl;
                        a.download = '';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }
                    Utils.showToast('Download completed successfully', 'success');
                    
                    // Auto-remove completed download from queue after a brief delay
                    setTimeout(() => {
                        this.remove(item.id);
                    }, 2000);
                } else if (statusData.status === 'error') {
                    item.status = 'error';
                    item.message = 'Well... that didn\'t go as planned.';
                    item.speed = '-';
                    item.eta = '-';
                    isPolling = false;
                } else if (statusData.status === 'cancelled') {
                    item.status = 'cancelled';
                    item.message = 'Download cancelled.';
                    item.speed = '-';
                    item.eta = '-';
                    isPolling = false;
                }
            } catch (err) {
                item.status = 'error';
                item.message = 'Network error.';
                item.speed = '-';
                item.eta = '-';
                isPolling = false;
            }
            
            this.render();
            
            if (isPolling) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        this.isProcessing = false;
        this.processNext();
    },

    render() {
        if (!this.queueContainer) return;
        
        this.queueContainer.innerHTML = '';
        
        this.items.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = `queue-item glass-panel ${item.status}`;
            
            let actionBtn = `<button class="icon-btn remove-btn" onclick="window.QueueAPI.remove('${item.id}')" title="Remove">✕</button>`;
            if (item.status === 'error') {
                actionBtn = `
                    <button class="icon-btn retry-btn" onclick="window.QueueAPI.retry('${item.id}')" title="Retry">↻</button>
                    ${actionBtn}
                `;
            }

            el.innerHTML = `
                <img src="${item.mediaInfo.thumbnail}" alt="Thumbnail" class="queue-thumb">
                <div class="queue-details">
                    <div class="queue-header">
                        <span class="queue-title" title="${item.mediaInfo.title}">${item.mediaInfo.title}</span>
                        <div class="queue-actions">${actionBtn}</div>
                    </div>
                    <div class="queue-meta">
                        <span class="queue-res">${item.qualityLabel}</span>
                        <span class="queue-speed">${item.speed}</span>
                        <span class="queue-eta">${item.eta}</span>
                    </div>
                    <div class="queue-progress-bar">
                        <div class="queue-progress-fill ${item.status}" style="width: ${item.progress}%"></div>
                    </div>
                    <div class="queue-status-text">${item.message}</div>
                </div>
            `;
            this.queueContainer.appendChild(el);
        });
    }
};

window.QueueAPI = QueueManager;
