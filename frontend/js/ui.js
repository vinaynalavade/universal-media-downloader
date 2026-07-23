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
            actionBtn: document.getElementById('action-btn'),
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
            
            errorCard: document.getElementById('error-card'),
            errorTitle: document.getElementById('error-title'),
            errorDesc: document.getElementById('error-desc'),
            mobileMenuBtn: document.getElementById('mobile-menu-btn'),
            mobileMenu: document.getElementById('mobile-menu'),
            themeColorMeta: document.getElementById('theme-color-meta'),
            
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
    
    updateActionBtnState() {
        if (!this.elements.actionBtn || !this.elements.urlInput) return;
        
        const hasText = this.elements.urlInput.value.trim().length > 0;
        const btn = this.elements.actionBtn;
        const icon = btn.querySelector('.btn-icon');
        const textSpan = btn.querySelector('.btn-text');
        
        if (hasText && btn.getAttribute('data-state') !== 'clear') {
            btn.setAttribute('data-state', 'clear');
            btn.setAttribute('aria-label', 'Clear URL');
            if(textSpan) textSpan.textContent = 'Clear';
            
            // Add slight animation class
            btn.classList.remove('btn-transition');
            void btn.offsetWidth; // trigger reflow
            btn.classList.add('btn-transition');
            
            if(icon) {
                icon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
            }
        } else if (!hasText && btn.getAttribute('data-state') !== 'paste') {
            btn.setAttribute('data-state', 'paste');
            btn.setAttribute('aria-label', 'Paste URL');
            if(textSpan) textSpan.textContent = 'Paste';
            
            // Add slight animation class
            btn.classList.remove('btn-transition');
            void btn.offsetWidth; // trigger reflow
            btn.classList.add('btn-transition');
            
            if(icon) {
                icon.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
            }
        }
    },
    
    bindEvents() {
        if(this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
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
        
        if(this.elements.actionBtn) {
            this.elements.actionBtn.addEventListener('click', async () => {
                const state = this.elements.actionBtn.getAttribute('data-state');
                
                if (state === 'paste') {
                    // Paste behavior
                    try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                            this.elements.urlInput.value = text;
                            this.updateActionBtnState();
                        }
                    } catch (err) {
                        Utils.showToast('Failed to read clipboard. Permissions needed.', 'error');
                    }
                } else if (state === 'clear') {
                    // Clear behavior
                    this.elements.urlInput.value = '';
                    this.elements.resultsContainer.classList.add('hidden');
                    this.elements.errorCard.classList.add('hidden');
                    this.updateActionBtnState();
                    this.elements.urlInput.focus();
                }
            });
        }
        
        if(this.elements.urlInput) {
            this.elements.urlInput.addEventListener('input', () => {
                this.updateActionBtnState();
                this.elements.errorCard.classList.add('hidden');
            });
        }
        
        if(this.elements.mobileMenuBtn) {
            this.elements.mobileMenuBtn.addEventListener('click', () => {
                this.elements.mobileMenu.classList.toggle('hidden');
                if (!this.elements.mobileMenu.classList.contains('hidden')) {
                    this.elements.mobileMenu.classList.add('fade-in-up');
                }
            });
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
        }
        
        this.elements.html.setAttribute('data-theme', actualTheme);
        
        if (this.elements.themeColorMeta) {
            this.elements.themeColorMeta.setAttribute('content', actualTheme === 'dark' ? '#000000' : '#F5F5F7');
        }
        
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
        
        this.elements.errorCard.classList.add('hidden');
        
        if (!Validation.isValidUrl(url)) {
            this.showErrorCard('Invalid URL format', 'Please paste a valid media URL.');
            return;
        }
        
        // Show Skeletons instead of full blocking overlay for better UX
        this.elements.resultsContainer.classList.remove('hidden');
        this.elements.skeletonLoader.classList.remove('hidden');
        this.elements.realContent.classList.add('hidden');
        
        try {
            const response = await API.fetchInfo(url);
            this.currentMediaResponse = response;
            
            // Use the first item for UI to maintain compatibility
            const firstItem = response.items && response.items.length > 0 ? response.items[0] : null;
            if (!firstItem) throw new Error("No media items found.");
            
            this.currentMediaInfo = {
                title: response.title,
                thumbnail: response.thumbnail || firstItem.thumbnail,
                duration: firstItem.duration || 0,
                formats: firstItem.formats || [],
                id: firstItem.id,
                download_url: firstItem.download_url || url,
                media_type: firstItem.media_type
            };
            
            // Populate UI
            this.elements.mediaThumbnail.src = this.currentMediaInfo.thumbnail || 'images/placeholder.jpg';
            this.elements.mediaTitle.textContent = this.currentMediaInfo.title;
            const platform = response.platform || Validation.getPlatformFromUrl(url);
            this.elements.mediaMeta.textContent = `${Utils.formatDuration(this.currentMediaInfo.duration)} • ${platform}`;
            
            // Trigger format population
            Components.populateQualities(this.currentMediaInfo.formats, this.elements.qualitySelect, this.elements.formatSelect.value);
            
            // Hide skeleton, show real content
            this.elements.skeletonLoader.classList.add('hidden');
            this.elements.realContent.classList.remove('hidden');
            
            // Scroll to results
            this.elements.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
        } catch (error) {
            this.elements.resultsContainer.classList.add('hidden');
            this.showErrorCard('Unable to fetch media', error.message || 'The URL might be private or unsupported.');
        }
    },
    
    showErrorCard(title, description) {
        if (this.elements.errorTitle) this.elements.errorTitle.textContent = title;
        if (this.elements.errorDesc) this.elements.errorDesc.textContent = description;
        this.elements.errorCard.classList.remove('hidden');
        
        // Remove animation class and add it back to restart animation
        this.elements.errorCard.classList.remove('fade-in-up');
        void this.elements.errorCard.offsetWidth; // trigger reflow
        this.elements.errorCard.classList.add('fade-in-up');
    },
    
    async handleDownload() {
        console.log("handleDownload() execution started!");
        try {
            const urlToDownload = this.currentMediaInfo.download_url || this.elements.urlInput.value.trim();
            const type = this.elements.formatSelect.value;
            const formatId = this.elements.qualitySelect.value;
            const qualityLabel = this.elements.qualitySelect.options[this.elements.qualitySelect.selectedIndex].text;
            
            console.log("Values retrieved:", { url: urlToDownload, type, formatId });
            
            QueueManager.add(this.currentMediaInfo, formatId, type, urlToDownload, qualityLabel);
        } catch (error) {
            Utils.showToast(error.message, 'error');
        }
    },
    // Polling is now handled by queue.js
};
