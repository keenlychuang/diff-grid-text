class DiffusionTextAnimator {
    constructor() {
        this.textLines = ["K. Simon Chuang", "Software Engineer", "AI Enthusiast"];
        this.currentLineIndex = 0;
        this.targetText = this.textLines[0];
        this.currentText = "";
        this.isAnimating = false;
        this.animationId = null;
        this.speed = 5;
        this.convergenceDelay = 100;
        this.fontSize = 24;
        this.holdDuration = 2000;
        this.diffuseOutSpeed = 7;
        
        // Animation state
        this.animationState = 'converging'; // 'converging', 'holding', 'diffusing'
        this.stateTimer = null;
        
        // Character sets for diffusion
        this.charSets = {
            alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
            symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
            mixed: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
        };
        
        this.activeCharSet = this.charSets.mixed;
        this.convergedChars = new Set();
        this.charTimers = new Map();
        
        this.textDisplay = document.getElementById('textDisplay');
        this.setupEventListeners();
        this.reset();
    }
    
    setupEventListeners() {
        document.getElementById('textInput').addEventListener('input', (e) => {
            this.textLines = e.target.value.split('\n').filter(line => line.trim() !== '');
            if (this.textLines.length === 0) {
                this.textLines = ["Enter some text"];
            }
            this.currentLineIndex = 0;
            this.targetText = this.textLines[0];
            this.reset();
        });
        
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
        });
        
        document.getElementById('convergenceDelay').addEventListener('input', (e) => {
            this.convergenceDelay = parseInt(e.target.value);
        });
        
        document.getElementById('holdDuration').addEventListener('input', (e) => {
            this.holdDuration = parseInt(e.target.value);
        });
        
        document.getElementById('diffuseOutSpeed').addEventListener('input', (e) => {
            this.diffuseOutSpeed = parseInt(e.target.value);
        });
        
        document.getElementById('fontSize').addEventListener('input', (e) => {
            this.fontSize = parseInt(e.target.value);
            this.textDisplay.style.fontSize = this.fontSize + 'px';
        });
    }
    
    reset() {
        this.stopAnimation();
        this.convergedChars.clear();
        this.charTimers.clear();
        this.animationState = 'converging';
        this.currentText = this.targetText.split('').map(char => 
            char === ' ' ? ' ' : this.getRandomChar()
        ).join('');
        this.render();
    }
    
    getRandomChar() {
        return this.activeCharSet[Math.floor(Math.random() * this.activeCharSet.length)];
    }
    
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.animationState = 'converging';
        this.animate();
        this.scheduleConvergence();
    }
    
    scheduleConvergence() {
        // Clear any existing timers
        this.charTimers.forEach(timer => clearTimeout(timer));
        this.charTimers.clear();
        
        // Schedule convergence for each character
        this.targetText.split('').forEach((char, index) => {
            if (char === ' ') {
                this.convergedChars.add(index);
                return;
            }
            
            const delay = Math.random() * this.convergenceDelay * this.targetText.length;
            const timer = setTimeout(() => {
                if (this.animationState === 'converging' && this.isAnimating) {
                    this.convergedChars.add(index);
                    
                    // Check if all non-space characters have converged
                    const nonSpaceChars = this.targetText.replace(/ /g, '').length;
                    if (this.convergedChars.size >= nonSpaceChars + this.targetText.split('').filter(c => c === ' ').length) {
                        this.startHoldPhase();
                    }
                }
            }, delay);
            
            this.charTimers.set(index, timer);
        });
    }
    
    startHoldPhase() {
        this.animationState = 'holding';
        this.stateTimer = setTimeout(() => {
            this.startDiffuseOut();
        }, this.holdDuration);
    }
    
    startDiffuseOut() {
        this.animationState = 'diffusing';
        
        // Clear any existing timers
        this.charTimers.forEach(timer => clearTimeout(timer));
        this.charTimers.clear();
        
        // Schedule diffusion out for each character
        const diffusedChars = new Set();
        this.targetText.split('').forEach((char, index) => {
            if (char === ' ') {
                diffusedChars.add(index);
                return;
            }
            
            const delay = Math.random() * this.convergenceDelay * this.targetText.length * 0.5; // Faster diffusion
            const timer = setTimeout(() => {
                if (this.animationState === 'diffusing' && this.isAnimating) {
                    this.convergedChars.delete(index);
                    diffusedChars.add(index);
                    
                    // Check if all characters have diffused out
                    if (diffusedChars.size >= this.targetText.length) {
                        this.nextLine();
                    }
                }
            }, delay);
            
            this.charTimers.set(index, timer);
        });
    }
    
    nextLine() {
        // Move to next line
        this.currentLineIndex = (this.currentLineIndex + 1) % this.textLines.length;
        this.targetText = this.textLines[this.currentLineIndex];
        
        // Reset the display to random characters for new line
        this.currentText = this.targetText.split('').map(char => 
            char === ' ' ? ' ' : this.getRandomChar()
        ).join('');
        
        // Reset for next line
        this.convergedChars.clear();
        this.animationState = 'converging';
        
        // Start convergence for new line immediately
        this.scheduleConvergence();
    }
    
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.stateTimer) {
            clearTimeout(this.stateTimer);
        }
        // Clear all character timers
        this.charTimers.forEach(timer => clearTimeout(timer));
        this.charTimers.clear();
    }
    
    animate() {
        if (!this.isAnimating) return;
        
        // Update characters based on animation state
        if (this.animationState === 'holding') {
            // During holding, keep the converged text
            this.currentText = this.targetText;
        } else {
            // During converging or diffusing, update characters
            this.currentText = this.targetText.split('').map((targetChar, index) => {
                if (this.convergedChars.has(index)) {
                    return targetChar;
                }
                
                if (targetChar === ' ') {
                    return ' ';
                }
                
                return this.getRandomChar();
            }).join('');
        }
        
        this.render();
        
        // Control animation speed (faster during diffusing)
        const currentSpeed = this.animationState === 'diffusing' ? this.diffuseOutSpeed : this.speed;
        setTimeout(() => {
            this.animationId = requestAnimationFrame(() => this.animate());
        }, 200 - (currentSpeed * 15));
    }
    
    render() {
        this.textDisplay.textContent = this.currentText;
    }
}

// Initialize animator
const animator = new DiffusionTextAnimator();

// Control functions
function startAnimation() {
    animator.startAnimation();
}

function stopAnimation() {
    animator.stopAnimation();
}

function resetAnimation() {
    animator.reset();
}

function toggleTheme() {
    document.body.classList.toggle('light');
}

// Export functions (placeholder implementations)
function exportAsGif() {
    const status = document.getElementById('exportStatus');
    status.innerHTML = '<div class="status success">GIF export feature coming soon! For now, use screen recording software.</div>';
}

function exportAsMP4() {
    const status = document.getElementById('exportStatus');
    status.innerHTML = '<div class="status success">MP4 export feature coming soon! For now, use screen recording software.</div>';
}

// Auto-start animation on load
setTimeout(() => {
    animator.startAnimation();
}, 500);