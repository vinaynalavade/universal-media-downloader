import { UI } from './ui.js';
import { QueueManager } from './queue.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI components and event listeners
    UI.init();
    QueueManager.init();
    
    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if(target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
