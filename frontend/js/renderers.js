import { Utils } from './utils.js';
import { Components } from './components.js';
import { QueueManager } from './queue.js';

export const MediaRenderer = {
    render(mediaResponse) {
        const type = mediaResponse.type || 'video';
        
        switch (type) {
            case 'image':
                return this.renderImage(mediaResponse);
            case 'carousel':
                return this.renderCarousel(mediaResponse);
            case 'video':
            default:
                return this.renderVideo(mediaResponse);
        }
    },

    renderVideo(response) {
        const firstItem = response.items && response.items.length > 0 ? response.items[0] : response;
        const thumbnail = response.thumbnail || firstItem.thumbnail || 'images/placeholder.jpg';
        const title = response.title || 'Unknown Title';
        const duration = firstItem.duration || 0;
        const platform = response.platform || 'Unknown';
        const formats = firstItem.formats || [];
        const downloadUrl = firstItem.download_url; // if exists
        
        const container = document.createElement('div');
        container.className = 'media-preview glass-panel fade-in-up';
        
        container.innerHTML = `
            <img src="${thumbnail}" alt="Thumbnail" class="media-thumbnail">
            <div class="media-details">
                <h2 class="media-title">${title}</h2>
                <p class="media-meta">${Utils.formatDuration(duration)} • ${platform}</p>
                
                <div class="download-options">
                    <div class="option-row">
                        <div class="option-group">
                            <select class="custom-select format-select">
                                <option value="video">Video</option>
                                <option value="audio">Audio</option>
                            </select>
                        </div>
                        
                        <div class="option-group quality-group">
                            <select class="custom-select quality-select">
                                <!-- Populated dynamically -->
                            </select>
                        </div>
                    </div>
                    
                    <button type="button" class="primary-btn full-width download-btn">Download</button>
                </div>
            </div>
        `;
        
        const formatSelect = container.querySelector('.format-select');
        const qualitySelect = container.querySelector('.quality-select');
        const downloadBtn = container.querySelector('.download-btn');
        
        // Populate initially
        Components.populateQualities(formats, qualitySelect, formatSelect.value);
        
        // Update on format change
        formatSelect.addEventListener('change', () => {
            Components.populateQualities(formats, qualitySelect, formatSelect.value);
        });
        
        downloadBtn.addEventListener('click', () => {
            const urlToDownload = downloadUrl || document.getElementById('url-input').value.trim();
            const type = formatSelect.value;
            const formatId = qualitySelect.value;
            const qualityLabel = qualitySelect.options[qualitySelect.selectedIndex].text;
            
            QueueManager.add(firstItem, formatId, type, urlToDownload, qualityLabel);
        });
        
        return container;
    },

    renderImage(response) {
        const firstItem = response.items && response.items.length > 0 ? response.items[0] : response;
        const thumbnail = response.thumbnail || firstItem.thumbnail || 'images/placeholder.jpg';
        const downloadUrl = firstItem.download_url;
        const title = response.title || 'Image Post';
        const platform = response.platform || 'Unknown';
        
        let width = firstItem.width || 'Unknown';
        let height = firstItem.height || 'Unknown';
        let format = 'WEBP';
        if (downloadUrl) {
            const extMatch = downloadUrl.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
            if (extMatch) format = extMatch[1].toUpperCase();
        }
        
        const container = document.createElement('div');
        container.className = 'media-preview glass-panel fade-in-up';
        
        container.innerHTML = `
            <img src="${thumbnail}" alt="Image Preview" class="media-thumbnail" loading="lazy">
            <div class="media-details">
                <h2 class="media-title">${title}</h2>
                <p class="media-meta">${platform}</p>
                <p class="media-meta" style="margin-top: 8px;">Resolution: ${width} × ${height}</p>
                <p class="media-meta">Format: ${format}</p>
                
                <div class="download-options" style="margin-top: 15px;">
                    <button type="button" class="primary-btn full-width download-img-btn ripple">
                        <span>Download Image</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                </div>
            </div>
        `;
        
        const downloadBtn = container.querySelector('.download-img-btn');
        downloadBtn.addEventListener('click', () => {
            const urlToDownload = downloadUrl || document.getElementById('url-input').value.trim();
            QueueManager.add(firstItem, '', 'image', urlToDownload, 'Original');
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '<span>Downloading...</span>';
            setTimeout(() => {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = `
                    <span>Download Image</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                `;
            }, 2000);
        });
        
        return container;
    },

    renderCarousel(response) {
        const items = response.items || [];
        const title = response.title || 'Carousel Post';
        const platform = response.platform || 'Unknown';
        const totalItems = items.length;
        
        const container = document.createElement('div');
        container.className = 'carousel-container fade-in-up';
        
        // Header
        const header = document.createElement('div');
        header.className = 'carousel-header glass-panel';
        header.innerHTML = `
            <div class="carousel-header-info">
                <h2 class="media-title">${title}</h2>
                <p class="media-meta">${totalItems} items • ${platform}</p>
            </div>
            <button type="button" class="primary-btn download-all-btn ripple" aria-label="Download All Images">
                <span class="download-all-btn-title">Download All Images</span>
                <span class="download-all-btn-meta">${totalItems} Images</span>
            </button>
        `;
        
        const downloadAllBtn = header.querySelector('.download-all-btn');
        downloadAllBtn.addEventListener('click', () => {
            downloadAllBtn.disabled = true;
            downloadAllBtn.classList.add('loading-state');
            
            let dispatched = 0;
            
            const processNext = () => {
                if (dispatched >= totalItems) {
                    downloadAllBtn.innerHTML = `
                        <span class="download-all-btn-title">Queued Successfully!</span>
                        <span class="download-all-btn-meta">Check tasks below</span>
                    `;
                    return;
                }
                
                downloadAllBtn.innerHTML = `
                    <span class="download-all-btn-title">Downloading...</span>
                    <span class="download-all-btn-meta">${dispatched + 1} / ${totalItems}</span>
                `;
                
                const item = items[dispatched];
                const urlToDownload = item.download_url || document.getElementById('url-input').value.trim();
                QueueManager.add(item, '', 'image', urlToDownload, 'Original');
                
                dispatched++;
                setTimeout(processNext, 300);
            };
            
            processNext();
        });
        
        container.appendChild(header);
        
        // Grid
        const grid = document.createElement('div');
        grid.className = 'media-grid';
        
        items.forEach((item, index) => {
            const thumbnail = item.thumbnail || 'images/placeholder.jpg';
            const downloadUrl = item.download_url;
            
            let width = item.width || 'Unknown';
            let height = item.height || 'Unknown';
            let format = 'WEBP';
            if (downloadUrl) {
                const extMatch = downloadUrl.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
                if (extMatch) format = extMatch[1].toUpperCase();
            }
            
            const card = document.createElement('div');
            card.className = 'media-card pop-in';
            card.style.animationDelay = `${index * 0.05}s`;
            
            card.innerHTML = `
                <div class="media-card-img-wrapper">
                    <img src="${thumbnail}" alt="Image ${index + 1}" class="media-card-img" loading="lazy">
                    <span class="media-card-badge">Image ${index + 1}</span>
                </div>
                <div class="media-card-info">
                    <h3>Image ${index + 1}</h3>
                    <div class="media-card-meta">
                        <span>Resolution: ${width} × ${height}</span>
                        <span>Format: ${format}</span>
                    </div>
                </div>
                <div class="media-card-actions">
                    <button type="button" class="primary-btn full-width download-single-btn ripple" aria-label="Download Image ${index + 1}">
                        <span>Download Image</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                </div>
            `;
            
            const downloadBtn = card.querySelector('.download-single-btn');
            downloadBtn.addEventListener('click', () => {
                const urlToDownload = downloadUrl || document.getElementById('url-input').value.trim();
                QueueManager.add(item, '', 'image', urlToDownload, 'Original');
                downloadBtn.disabled = true;
                downloadBtn.innerHTML = '<span>Downloading...</span>';
                setTimeout(() => {
                    downloadBtn.disabled = false;
                    downloadBtn.innerHTML = `
                        <span>Download Image</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    `;
                }, 2000);
            });
            
            grid.appendChild(card);
        });
        
        container.appendChild(grid);
        return container;
    }
};
