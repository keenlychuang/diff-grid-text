class DiffusionTextAnimator {
    constructor() {
        this.convergenceEffectType = 'highlight';
        this.textLines = ["K. Simon Chuang", "Software Engineer", "AI Enthusiast"];
        this.currentLineIndex = 0;
        this.targetText = this.textLines[0];
        this.currentText = "";
        this.isAnimating = false;
        this.animationId = null;
        this.speed = 5;
        this.convergenceDelay = 100;
        this.fontSize = 24;
        this.holdDuration = 1000;
        this.diffuseOutSpeed = 7;
        this.highlightedChar = undefined;
        this.highlightEndTime = 0;
        
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

        document.getElementById('convergenceEffect').addEventListener('change', (e) => {
            this.convergenceEffectType = e.target.value;
        });
        document.getElementById('convergenceColor').addEventListener('input', (e) => {
            document.documentElement.style.setProperty('--convergence-color', e.target.value);
        });
        document.getElementById('fontSelect').addEventListener('change', (e) => {
            this.textDisplay.style.fontFamily = e.target.value;
        });
        document.getElementById('animationWidth').addEventListener('input', (e) => {
            this.updateAnimationSize();
        });

        document.getElementById('animationHeight').addEventListener('input', (e) => {
            this.updateAnimationSize();
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
    updateAnimationSize() {
        const width = document.getElementById('animationWidth').value;
        const height = document.getElementById('animationHeight').value;
        const container = document.querySelector('.animation-container');
        
        container.style.width = width + 'px';
        container.style.height = height + 'px';
        
        // Update grid background to match
        if (window.gridBackground) {
            gridBackground.updateSize(width, height);
        }
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
                    this.showConvergenceEffect(index);
                    
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
    showConvergenceEffect(convergedIndex) {
        if (this.convergenceEffectType === 'none') {
            return;
        }

        this.highlightedChar = convergedIndex;
        this.highlightEndTime = Date.now() + 200; 
        this.renderWithHighlight();
        
        let html = '';
        const cssClass = this.convergenceEffectType === 'underline' ? 
            'converged-char-underline' : 'converged-char-highlight';
        
        this.currentText.split('').forEach((char, index) => {
            if (index === convergedIndex) {
                html += `<span class="${cssClass}">${this.targetText[index]}</span>`;
            } else {
                html += char;
            }
        });
        this.textDisplay.innerHTML = html;
        
        setTimeout(() => {
            if (this.isAnimating) {
                this.render();
            }
        }, 2200);
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

    render() {
        // Check if we should show highlight
        if (this.highlightedChar !== undefined && Date.now() < this.highlightEndTime) {
            this.renderWithHighlight();
        } else {
            this.highlightedChar = undefined;
            this.textDisplay.textContent = this.currentText;
        }
    }

    renderWithHighlight() {
        if (this.highlightedChar === undefined) {
            this.textDisplay.textContent = this.currentText;
            return;
        }
        
        const cssClass = this.convergenceEffectType === 'underline' ? 
            'converged-char-underline' : 'converged-char-highlight';
        
        let html = '';
        this.currentText.split('').forEach((char, index) => {
            if (index === this.highlightedChar) {
                html += `<span class="${cssClass}">${this.targetText[index]}</span>`;
            } else {
                html += char;
            }
        });
        this.textDisplay.innerHTML = html;
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
    

}

class GridBackground {
    constructor() {
        console.log('GridBackground initializing...');
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        this.time = 0;
        this.animate();
    }
    
    setupCanvas() {
        const container = document.querySelector('.animation-container');
        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid-background';
        gridContainer.appendChild(this.canvas);
        container.appendChild(gridContainer); // Changed: append to animation container, not body
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    draw() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        
        const gridSize = 30;
        const speed = 1;
        const horizon = height * 0.05 - 100;
        
        const isLight = document.body.classList.contains('light');
        this.ctx.strokeStyle = isLight ? '#00000060' : '#ffffff60'; 

        
        const offset = (this.time * speed) % gridSize;
        
        // Horizontal lines receding into distance
        for (let i = 0; i < 50; i++) {
            const distance = i * gridSize + offset;
            const perspective = 200 / (200 + distance);
            const y = horizon + (height - horizon) * perspective; // Fixed: removed (1 - perspective)
            
            if (y > height) continue;
            
            this.ctx.globalAlpha = perspective * 1.2; // Increased from 0.8
            this.ctx.lineWidth = Math.max(0.5, perspective * 2); // Added minimum width
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
        
        // Vertical perspective lines 
        for (let i = -100; i <= 100; i++) {
            const x = (i / 20) * width;
            const vanishX = width / 2;
            
            this.ctx.globalAlpha = 0.4; // Increased from 0.2
            this.ctx.lineWidth = 1.5; // Increased from 1
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, height);
            this.ctx.lineTo(vanishX, horizon);
            this.ctx.stroke();
        }
    }
    
    animate() {
        this.time++;
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
    
    resize() {
        const container = document.querySelector('.animation-container');
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
    }
    updateSize(width, height) {
        this.canvas.width = parseInt(width);
        this.canvas.height = parseInt(height);
    }
}

// Initialize grid background
const gridBackground = new GridBackground();

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