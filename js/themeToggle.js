
        // Theme toggle functionality
        document.addEventListener('DOMContentLoaded', function() {
            
            const themeToggle = document.getElementById('theme-toggle');
            const sidebar = document.getElementById('sidebar');
            const toggleSidebarBtn = document.getElementById('toggle-sidebar');
            
            // Theme toggle
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('theme-dark');
                
                // Change icon based on theme
                const icon = themeToggle.querySelector('i');
                if (document.body.classList.contains('theme-dark')) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
                
                // Animate the icon
                gsap.from(icon, {rotation: 360, duration: 0.5, ease: "power2.out"});
            });
            
            // Sidebar toggle
            toggleSidebarBtn.addEventListener('click', () => {
                sidebar.classList.toggle('sidebar-collapsed');
                
                // Change icon based on sidebar state
                const icon = toggleSidebarBtn.querySelector('i');
                if (sidebar.classList.contains('sidebar-collapsed')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-chevron-right');
                } else {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-bars');
                }
            });
            
            // Form input animations
            const inputs = document.querySelectorAll('.form-control');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    gsap.to(input, {scale: 1.02, duration: 0.2, ease: "power1.out"});
                });
                
                input.addEventListener('blur', () => {
                    gsap.to(input, {scale: 1, duration: 0.2, ease: "power1.in"});
                });
            });
            
            // Button hover animations
            const buttons = document.querySelectorAll('.btn');
            buttons.forEach(button => {
                button.addEventListener('mouseenter', () => {
                    gsap.to(button, {y: -2, boxShadow: "0 4px 8px rgba(0,0,0,0.2)", duration: 0.2});
                });
                
                button.addEventListener('mouseleave', () => {
                    gsap.to(button, {y: 0, boxShadow: "0 0 0 rgba(0,0,0,0)", duration: 0.2});
                });
                
                button.addEventListener('click', () => {
                    gsap.fromTo(button, 
                        {scale: 0.95}, 
                        {scale: 1, duration: 0.3, ease: "elastic.out(1, 0.3)"}
                    );
                });
            });
            
            // Results animation when they change
            const resultElements = document.querySelectorAll('.result-value');
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        const element = mutation.target;
                        gsap.fromTo(element, 
                            {color: "#10b981", scale: 1.1}, 
                            {color: "", scale: 1, duration: 0.5, ease: "power1.out"}
                        );
                    }
                });
            });
            
            resultElements.forEach(el => {
                observer.observe(el, { 
                    childList: true, 
                    characterData: true,
                    subtree: true
                });
            });
        });
    