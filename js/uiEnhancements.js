/**
 * UI Enhancements for Solar Panel Array Planner
 */

document.addEventListener('DOMContentLoaded', function() {
    // Make sidebar sections collapsible
    const sections = document.querySelectorAll('.collapsible-section');
    
    sections.forEach(section => {
        const title = section.querySelector('.section-title');
        
        title.addEventListener('click', () => {
            section.classList.toggle('section-collapsed');
            
            // Save section state to localStorage
            const sectionId = section.id || section.querySelector('h2').textContent.trim();
            localStorage.setItem('section_' + sectionId, 
                section.classList.contains('section-collapsed') ? 'collapsed' : 'expanded');
        });
        
        // Restore section state from localStorage if available
        const sectionId = section.id || section.querySelector('h2').textContent.trim();
        const savedState = localStorage.getItem('section_' + sectionId);
        
        if (savedState === 'collapsed') {
            section.classList.add('section-collapsed');
        }
    });
    
    // Enhanced tooltips for better user guidance
    const addEnhancedTooltips = () => {
        // Update all buttons to have enhanced class
        document.querySelectorAll('.btn').forEach(btn => {
            if (!btn.classList.contains('enhanced-btn')) {
                btn.classList.add('enhanced-btn');
            }
            
            // Add tooltips if missing
            if (!btn.hasAttribute('data-tooltip')) {
                const buttonText = btn.textContent.trim();
                if (buttonText) {
                    btn.setAttribute('data-tooltip', buttonText);
                }
            }
        });
        
        // Add input field tooltips
        document.querySelectorAll('.form-control').forEach(input => {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label && !input.hasAttribute('data-tooltip')) {
                input.setAttribute('data-tooltip', 
                    label.textContent + ': Enter a value between ' + 
                    (input.min || '0') + ' and ' + (input.max || '∞'));
            }
        });
    };
    
    addEnhancedTooltips();
    
    // Add ripple effect to buttons
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add CSS for ripple effect if not already in style.css
    if (!document.querySelector('style#ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `
            .btn {
                position: relative;
                overflow: hidden;
            }
            .ripple {
                position: absolute;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
                width: 100px;
                height: 100px;
                margin-left: -50px;
                margin-top: -50px;
            }
            @keyframes ripple {
                to {
                    transform: scale(3);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Make all other sections collapsible that weren't marked initially
    document.querySelectorAll('.section:not(.collapsible-section)').forEach(section => {
        const title = section.querySelector('.section-title');
        
        if (title) {
            section.classList.add('collapsible-section');
            
            // Add toggle icon
            const toggleIcon = document.createElement('i');
            toggleIcon.className = 'fas fa-chevron-down section-toggle';
            title.appendChild(toggleIcon);
            
            // Wrap content
            const content = document.createElement('div');
            content.className = 'section-content';
            
            // Move all elements after title into content
            let nextEl = title.nextElementSibling;
            while (nextEl) {
                const temp = nextEl.nextElementSibling;
                content.appendChild(nextEl);
                nextEl = temp;
            }
            
            section.appendChild(content);
            
            // Add click event
            title.addEventListener('click', () => {
                section.classList.toggle('section-collapsed');
            });
        }
    });
});
