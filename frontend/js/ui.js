import { Validation } from './validation.js';
import { API } from './api.js';
import { Utils } from './utils.js';
import { Components } from './components.js';
import { QueueManager } from './queue.js';

export const UI = {
    elements: {},
    currentMediaInfo: null,
    
    async init() {
        this.elements = {
            themeToggle: document.getElementById('theme-toggle'),
            urlInput: document.getElementById('url-input'),
            pasteBtn: document.getElementById('paste-btn'),
            downloadForm: document.getElementById('download-form'),
            resultsContainer: document.getElementById('results-container'),
            loadingOverlay: document.getElementById('loading-overlay'),
            dropZone: document.getElementById('drop-zone'),
            skeletonLoader: document.getElementById('skeleton-loader'),
            realContent: document.getElementById('real-content'),
            ffmpegWarning: document.getElementById('ffmpeg-warning'),
            
            progressContainer: document.getElementById('progress-container'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            
            mediaThumbnail: document.getElementById('media-thumbnail'),
            mediaTitle: document.getElementById('media-title'),
            mediaMeta: document.getElementById('media-meta'),
            
            formatSelect: document.getElementById('format-select'),
            qualitySelect: document.getElementById('quality-select'),
            qualityGroup: document.getElementById('quality-group'),
            downloadBtn: document.getElementById('download-btn'),
            
            sunIcon: document.querySelector('.sun-icon'),
            moonIcon: document.querySelector('.moon-icon'),
            html: document.documentElement
        };
        
        this.bindEvents();
        
        // Check system capabilities
        const sysInfo = await API.checkSystem();
        if (!sysInfo.ffmpeg_installed) {
            window.ffmpegMissing = true;
            if (this.elements.ffmpegWarning) {
                this.elements.ffmpegWarning.classList.remove('hidden');
            }
        } else {
            window.ffmpegMissing = false;
        }
        
        this.loadTheme();
    },
    
    bindEvents() {
        if(this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        if(this.elements.pasteBtn) {
            this.elements.pasteBtn.addEventListener('click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    this.elements.urlInput.value = text;
                    Utils.showToast('Pasted from clipboard', 'success');
                } catch (err) {
                    Utils.showToast('Failed to read clipboard. Permissions needed.', 'error');
                }
            });
        }
        
        if(this.elements.downloadForm) {
            this.elements.downloadForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleFetch();
            });
        }
        
        if(this.elements.formatSelect) {
            this.elements.formatSelect.addEventListener('change', (e) => {
                if(!this.currentMediaInfo) return;
                const type = e.target.value;
                Components.populateQualities(this.currentMediaInfo.formats, this.elements.qualitySelect, type);
            });
        }
        
        if(this.elements.downloadBtn) {
            console.log("Found downloadBtn, attaching click listener");
            this.elements.downloadBtn.addEventListener('click', async (e) => {
                console.log("Download button clicked!", e);
                e.preventDefault();
                await this.handleDownload();
            });
        } else {
            console.error("downloadBtn NOT FOUND during bindEvents!");
        }
        
        // Drag and Drop support
        if(this.elements.dropZone) {
            const preventDefaults = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                this.elements.dropZone.addEventListener(eventName, preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                this.elements.dropZone.addEventListener(eventName, () => {
                    this.elements.dropZone.classList.add('drag-over');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                this.elements.dropZone.addEventListener(eventName, () => {
                    this.elements.dropZone.classList.remove('drag-over');
                }, false);
            });

            this.elements.dropZone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const text = dt.getData('text');
                if(text && Validation.isValidUrl(text)) {
                    this.elements.urlInput.value = text;
                    this.handleFetch();
                } else {
                    Utils.showToast('Please drop a valid URL', 'error');
                }
            }, false);
        }
        
        // Clipboard Auto Detect
        window.addEventListener('focus', async () => {
            try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    const text = await navigator.clipboard.readText();
                    if (text && Validation.isValidUrl(text) && text !== this.elements.urlInput.value) {
                        this.showClipboardPrompt(text);
                    }
                }
            } catch (err) {
                // Ignore permissions errors on background read
            }
        });
    },
    
    showClipboardPrompt(url) {
        // Create an elegant popup if it doesn't exist
        let popup = document.getElementById('clipboard-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'clipboard-popup';
            popup.className = 'clipboard-popup glass-panel fade-in-up';
            popup.innerHTML = `
                <div class="clipboard-icon">🔗</div>
                <div class="clipboard-content">
                    <h4>You copied a media link.</h4>
                    <p>Coincidence? I think not. Want to download it?</p>
                    <div class="clipboard-actions">
                        <button id="clip-paste-btn" class="primary-btn">Paste</button>
                        <button id="clip-dismiss-btn" class="secondary-btn">Dismiss</button>
                    </div>
                </div>
            `;
            document.body.appendChild(popup);
        }
        
        document.getElementById('clip-paste-btn').onclick = () => {
            this.elements.urlInput.value = url;
            popup.classList.remove('fade-in-up');
            popup.classList.add('fade-out-down');
            setTimeout(() => popup.remove(), 300);
            this.handleFetch();
        };
        
        document.getElementById('clip-dismiss-btn').onclick = () => {
            popup.classList.remove('fade-in-up');
            popup.classList.add('fade-out-down');
            setTimeout(() => popup.remove(), 300);
        };
        
        // Auto dismiss after 10s
        setTimeout(() => {
            if(document.getElementById('clipboard-popup')) {
                document.getElementById('clip-dismiss-btn').click();
            }
        }, 10000);
    },
    
    toggleTheme() {
        const current = localStorage.getItem('theme') || 'system';
        let next = 'system';
        
        if (current === 'system') next = 'dark';
        else if (current === 'dark') next = 'light';
        else next = 'system';
        
        this.applyTheme(next);
        localStorage.setItem('theme', next);
        Utils.showToast(`Theme changed to ${next}`, 'success');
    },
    
    loadTheme() {
        const saved = localStorage.getItem('theme') || 'system';
        this.applyTheme(saved);
        
        // Listen to system changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (localStorage.getItem('theme') === 'system') {
                this.applyTheme('system');
            }
        });
    },
    
    applyTheme(themeType) {
        let actualTheme = themeType;
        if (themeType === 'system') {
            actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            // Show a system icon if we had one, but we'll just toggle sun/moon based on the computed value
        }
        
        this.elements.html.setAttribute('data-theme', actualTheme);
        
        if(actualTheme === 'dark') {
            this.elements.sunIcon.classList.remove('hidden');
            this.elements.moonIcon.classList.add('hidden');
        } else {
            this.elements.sunIcon.classList.add('hidden');
            this.elements.moonIcon.classList.remove('hidden');
        }
    },
    
    showLoading(show) {
        if(show) {
            this.elements.loadingOverlay.classList.remove('hidden');
        } else {
            this.elements.loadingOverlay.classList.add('hidden');
        }
    },
    
    async handleFetch() {
        const url = this.elements.urlInput.value.trim();
        
        if (!Validation.isValidUrl(url)) {
            Utils.showToast('Please enter a valid URL', 'error');
            return;
        }
        
        // Show Skeletons instead of full blocking overlay for better UX
        this.elements.resultsContainer.classList.remove('hidden');
        this.elements.skeletonLoader.classList.remove('hidden');
        this.elements.realContent.classList.add('hidden');
        
        try {
            const info = await API.fetchInfo(url);
            this.currentMediaInfo = info;
            
            // Populate UI
            this.elements.mediaThumbnail.src = info.thumbnail || 'images/placeholder.jpg';
            this.elements.mediaTitle.textContent = info.title;
            const platform = Validation.getPlatformFromUrl(url);
            this.elements.mediaMeta.textContent = `Duration: ${Utils.formatDuration(info.duration)} • Platform: ${platform}`;
            
            // Trigger format population
            Components.populateQualities(info.formats, this.elements.qualitySelect, this.elements.formatSelect.value);
            
            // Hide skeleton, show real content
            this.elements.skeletonLoader.classList.add('hidden');
            this.elements.realContent.classList.remove('hidden');
            
            // Scroll to results
            this.elements.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
        } catch (error) {
            Utils.showToast(error.message, 'error');
            this.elements.resultsContainer.classList.add('hidden');
        }
    },
    
    async handleDownload() {
        console.log("handleDownload() execution started!");
        try {
            const url = this.elements.urlInput.value.trim();
            const type = this.elements.formatSelect.value;
            const formatId = this.elements.qualitySelect.value;
            const qualityLabel = this.elements.qualitySelect.options[this.elements.qualitySelect.selectedIndex].text;
            
            console.log("Values retrieved:", { url, type, formatId });
            
            QueueManager.add(this.currentMediaInfo, formatId, type, url, qualityLabel);
        } catch (error) {
            Utils.showToast(error.message, 'error');
        }
    },
    // Polling is now handled by queue.js
};
