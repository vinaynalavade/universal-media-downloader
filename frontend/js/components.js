import { Utils } from './utils.js';

export const Components = {
    populateQualities(formats, selectElement, type = 'video') {
        selectElement.innerHTML = '';
        
        let filteredFormats = [];
        
        if (type === 'audio') {
            filteredFormats = formats.filter(f => f.acodec !== 'none' && f.vcodec === 'none');
        } else {
            filteredFormats = formats.filter(f => f.vcodec !== 'none');
        }
        
        // Remove duplicates by resolution/quality
        const unique = new Map();
        filteredFormats.forEach(f => {
            const key = type === 'audio' ? f.format_id : (f.resolution || f.quality_label);
            if (!unique.has(key)) {
                unique.set(key, f);
            }
        });
        
        const finalFormats = Array.from(unique.values()).sort((a, b) => {
            const sizeA = a.filesize || a.filesize_approx || 0;
            const sizeB = b.filesize || b.filesize_approx || 0;
            return sizeB - sizeA;
        });
        
        if (finalFormats.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Best Available';
            selectElement.appendChild(option);
            return;
        }
        
        finalFormats.forEach(f => {
            const option = document.createElement('option');
            option.value = f.format_id;
            let sizeStr = '';
            if (f.filesize) {
                sizeStr = ` (${Utils.formatBytes(f.filesize)})`;
            } else if (f.filesize_approx) {
                sizeStr = ` (≈ ${Utils.formatBytes(f.filesize_approx)})`;
            } else {
                sizeStr = ` (Unknown Size)`;
            }
            
            const resStr = f.resolution !== 'audio only' ? f.resolution : f.quality_label;
            
            let label = `${resStr}${sizeStr} - ${f.ext}`;
            
            // FFmpeg limitation logic
            if (window.ffmpegMissing) {
                if (type === 'video') {
                    const highResRegex = /1080p|1440p|2160p|4320p|4k|8k/i;
                    const highResNumberRegex = /1080|1440|2160|4320/;
                    
                    if (highResRegex.test(resStr) || highResNumberRegex.test(resStr) || 
                        (f.quality_label && highResRegex.test(f.quality_label))) {
                        option.disabled = true;
                        label += ' (Requires FFmpeg)';
                    }
                } else if (type === 'audio') {
                    // yt-dlp audio extraction strictly requires ffmpeg
                    option.disabled = true;
                    label += ' (Requires FFmpeg)';
                }
            }
            
            option.textContent = label;
            selectElement.appendChild(option);
        });
    }
};
