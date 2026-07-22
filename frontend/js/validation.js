export const Validation = {
    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) {
            return false;
        }
    },
    
    getPlatformFromUrl(urlStr) {
        if (!this.isValidUrl(urlStr)) return 'Unknown';
        
        const url = new URL(urlStr);
        const host = url.hostname.toLowerCase();
        
        if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YouTube';
        if (host.includes('instagram.com')) return 'Instagram';
        if (host.includes('tiktok.com')) return 'TikTok';
        if (host.includes('twitter.com') || host.includes('x.com')) return 'Twitter / X';
        if (host.includes('facebook.com')) return 'Facebook';
        if (host.includes('vimeo.com')) return 'Vimeo';
        
        return 'Other/Supported';
    }
};
