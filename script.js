
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
        this.lineThickness = 1; 
        this.convergenceDelay = 100;
        this.fontSize = 24;
        this.holdDuration = 1000;
        this.diffuseOutSpeed = 7;
        this.highlightedChar = undefined;
        this.highlightEndTime = 0;
        this.onCycleComplete = null; // Callback for when full cycle completes
        this.recordingStartLine = null;
        this.convergencePattern = 'random';
        
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
        this.initParticleSystem();
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
        document.getElementById('fontWeight').addEventListener('change', (e) => {
            this.textDisplay.style.fontWeight = e.target.value;
        });

        document.getElementById('fontColor').addEventListener('input', (e) => {
            this.textDisplay.style.color = e.target.value;
        });
        document.getElementById('fieldType').addEventListener('change', (e) => {
            gridBackground.fieldType = e.target.value;
        });

        document.getElementById('waveAmplitude').addEventListener('input', (e) => {
            gridBackground.waveAmplitude = parseFloat(e.target.value);
        });

        document.getElementById('waveFrequency').addEventListener('input', (e) => {
            gridBackground.waveFrequency = parseFloat(e.target.value);
        });
        document.getElementById('gridThickness').addEventListener('input', (e) => {
            gridBackground.lineThickness = parseFloat(e.target.value);
        });
        document.getElementById('convergencePattern').addEventListener('change', (e) => {
        this.convergencePattern = e.target.value;
        });

        document.getElementById('gridSpeed').addEventListener('input', (e) => {
            gridBackground.speed = parseFloat(e.target.value);
        });

        document.getElementById('gridDensity').addEventListener('input', (e) => {
            gridBackground.gridSize = 60 - parseInt(e.target.value); // Invert: 50→10, 10→50
        });

        document.getElementById('gridColor').addEventListener('input', (e) => {
            gridBackground.gridColor = e.target.value;
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
        if (this.particleCanvas) {
        this.resizeParticleCanvas();
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

    initParticleSystem() {
        this.particles = [];
        this.particleCanvas = document.createElement('canvas');
        this.particleCtx = this.particleCanvas.getContext('2d');
        
        // Insert particle canvas before text display
        const container = document.querySelector('.animation-container');
        const textDisplay = document.getElementById('textDisplay');
        container.insertBefore(this.particleCanvas, textDisplay);
        
        // Style the particle canvas
        this.particleCanvas.style.position = 'absolute';
        this.particleCanvas.style.top = '0';
        this.particleCanvas.style.left = '0';
        this.particleCanvas.style.pointerEvents = 'none';
        this.particleCanvas.style.zIndex = '1';
        
        this.resizeParticleCanvas();
        this.animateParticles();
    }

    resizeParticleCanvas() {
        const container = document.querySelector('.animation-container');
        this.particleCanvas.width = container.offsetWidth;
        this.particleCanvas.height = container.offsetHeight;
    }

    createConvergenceParticles(charIndex) {
        const container = document.querySelector('.animation-container');
        // const textDisplay = document.getElementById('textDisplay');
        
        // Get character position (approximate)
        const charWidth = this.fontSize * 0.6; // Monospace approximation
        // const lineHeight = this.fontSize * 1.4;
        // const lines = this.textLines[this.currentLineIndex].split('\n');
        const totalWidth = this.targetText.length * charWidth;
        const startX = (container.offsetWidth - totalWidth) / 2;
        
        const charX = startX + (charIndex * charWidth);
        const charY = container.offsetHeight / 2;
        
        // Create 8-12 particles around the character
        const particleCount = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: charX + (Math.random() - 0.5) * 20,
                y: charY + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.01,
                size: 2 + Math.random() * 3
            });
        }
    }

    animateParticles() {
        if (!this.particleCtx) return;
        
        // Clear canvas
        this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
        
        // Get accent color
        const accentColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--convergence-color') || '#4a90e2';
        
        // Update and draw particles
        this.particles = this.particles.filter(particle => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            
            // Apply slight gravity
            particle.vy += 0.1;
            
            // Draw particle
            if (particle.life > 0) {
                this.particleCtx.save();
                this.particleCtx.globalAlpha = particle.life;
                this.particleCtx.fillStyle = accentColor;
                this.particleCtx.beginPath();
                this.particleCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.particleCtx.fill();
                this.particleCtx.restore();
                return true;
            }
            return false;
        });
        
        requestAnimationFrame(() => this.animateParticles());
    }
    
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.animationState = 'converging';
        this.recordingStartLine = this.currentLineIndex; // Track starting point
        this.animate();
        this.scheduleConvergence();
    }
    
    scheduleConvergence() {
        this.charTimers.forEach(timer => clearTimeout(timer));
        this.charTimers.clear();
        
        this.targetText.split('').forEach((char, index) => {
            if (char === ' ') {
                this.convergedChars.add(index);
                return;
            }
            
            let delay;
            if (this.convergencePattern === 'wave') {
                // Wave: delay based on position, left to right
                delay = index * 100; // 100ms between each character
            } else {
                // Random: existing behavior
                delay = Math.random() * this.convergenceDelay * this.targetText.length;
            }
            
            const timer = setTimeout(() => {
                if (this.animationState === 'converging' && this.isAnimating) {
                    this.convergedChars.add(index);
                    this.showConvergenceEffect(index);
                    
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
        if (this.convergenceEffectType === 'particles') {
            this.createConvergenceParticles(convergedIndex);
            return; // Exit early for particles-only effect
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

        // Check if we've completed a full cycle
         if (this.recordingStartLine !== null && 
        this.currentLineIndex === this.recordingStartLine) {
        // We're back to the starting line - cycle complete!
        if (this.onCycleComplete) {
            setTimeout(() => this.onCycleComplete(), 500); // Small delay after diffusion
        }
        this.recordingStartLine = null;
    }
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
        this.speed = 1;           // Make dynamic
        this.gridSize = 30;       // Make dynamic  
        this.gridColor = '#ffffff'; // Make dynamic
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        this.time = 0;
        this.waveAmplitude = 20;
        this.waveFrequency = 0.01;
        this.isAnimating = true;
        this.fieldType = 'lines';
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
        if (this.fieldType === 'dots') {
            this.drawDotField();
        } else {
            this.drawGridLines();
        }
    }

    drawDotField() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        
        const horizon = height * 0.05 - 100;
        const dotSpacing = this.gridSize;
        const offset = (this.time * this.speed * 0.1) % dotSpacing; 
        
        for (let row = 0; row < 50; row++) {
            for (let col = -75; col <= 75; col++) {
                const distance = row * dotSpacing + offset; 
                const perspective = 200 / (200 + distance);
                
                if (perspective <= 0.01) continue;
                
                const baseY = horizon + (height - horizon) * perspective;
                const x = width/2 + (col * dotSpacing * perspective);
                const waveOffset = Math.sin((x * this.waveFrequency) + (this.time * 0.05)) * this.waveAmplitude;
                const y = baseY + waveOffset;
                
                this.ctx.globalAlpha = perspective * 0.8;
                this.ctx.fillStyle = this.gridColor;
                this.ctx.beginPath();
                this.ctx.arc(x, y, perspective * 2 * this.lineThickness, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    drawGridLines() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        
        const horizon = height * 0.05 - 100;
        
        // Fix color logic
        const isLight = document.body.classList.contains('light');
        this.ctx.strokeStyle = this.gridColor + '60';
        
        const offset = (this.time * this.speed) % this.gridSize;
        
        for (let i = 0; i < 50; i++) {
            const distance = i * this.gridSize + offset;
            const perspective = 200 / (200 + distance);
            const baseY = horizon + (height - horizon) * perspective;
            
            if (baseY > height) continue;
            
            this.ctx.globalAlpha = perspective * 1.2;
            this.ctx.lineWidth = Math.max(0.5, perspective * 2 * this.lineThickness);
            
            this.ctx.beginPath();
            // Create wave by varying Y position across the width
            for (let x = 0; x <= width; x += 5) {
                // Remove the perspective multiplier from wave amplitude
                const waveOffset = Math.sin((x * this.waveFrequency) + (this.time * 0.05)) * this.waveAmplitude;
                const y = baseY + waveOffset;
                
                if (x === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }
        
    // Vertical perspective lines that follow the wave contours
    const verticalSpacing = 30 / this.gridSize * 20;
    for (let i = -100; i <= 100; i++) {
        const xAtBottom = (i / verticalSpacing) * width;
        const vanishX = width / 2;
        
        this.ctx.globalAlpha = 0.4;
        this.ctx.lineWidth = 1.5 * this.lineThickness;
        
        this.ctx.beginPath();
        
        let hasStarted = false;
        
        // Draw vertical lines by sampling wave at fixed X positions
        for (let step = 0; step <= 100; step++) { // Increased steps for better coverage
            const distance = step * this.gridSize * 0.5; // Smaller step size
            const perspective = 200 / (200 + distance);
            
            if (perspective <= 0.01) break; // Stop when too small
            
            // Keep X position constant for this vertical line
            const x = xAtBottom + (vanishX - xAtBottom) * (1 - perspective);
            
            // Sample the wave at this X position
            const baseY = horizon + (height - horizon) * perspective;
            const waveOffset = Math.sin((x * this.waveFrequency) + (this.time * 0.05)) * this.waveAmplitude;
            // Fix: clamp Y values to canvas bounds instead of breaking the line
            const y = Math.max(0, Math.min(height, baseY + waveOffset));

            // Only break if we're way past the bottom and have been drawing
            if (baseY > height + 50) {
                if (hasStarted) break;
                continue;
            }
            
            if (!hasStarted) {
                this.ctx.moveTo(x, y);
                hasStarted = true;
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        if (hasStarted) {
            this.ctx.stroke();
        }
    }
    }
    
    animate() {
        if (!this.isAnimating) return; 
        this.time++;
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
    stop() { 
        this.isAnimating = false;
    }
    start() { 
        this.isAnimating = true;
        this.animate();
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
gridBackground.speed = parseFloat(document.getElementById('gridSpeed').value);
gridBackground.gridSize = 60 - parseInt(document.getElementById('gridDensity').value);
gridBackground.gridColor = document.getElementById('gridColor').value;
gridBackground.lineThickness = parseFloat(document.getElementById('gridThickness').value);
gridBackground.waveAmplitude = parseFloat(document.getElementById('waveAmplitude').value);
gridBackground.waveFrequency = parseFloat(document.getElementById('waveFrequency').value);

// Initialize animator
const animator = new DiffusionTextAnimator();

// Control functions
function stopAnimation() {
    animator.stopAnimation();
    gridBackground.stop(); 
}

function startAnimation() {
    animator.startAnimation();
    gridBackground.start(); 
}

function resetAnimation() {
    animator.reset();
}

function toggleTheme() {
    document.body.classList.toggle('light');
}

let mediaRecorder = null;
let recordedChunks = [];

function drawGridBackground(ctx, width, height, time) {
    if (gridBackground.fieldType === 'dots') {
        drawDotFieldBackground(ctx, width, height, time);
    } else {
        drawGridLinesBackground(ctx, width, height, time);
    }
}

function drawDotFieldBackground(ctx, width, height, time) {
    // Remove: const { width, height } = canvas;  
    ctx.clearRect(0, 0, width, height);
    
    const horizon = height * 0.05 - 100;
    const dotSpacing = gridBackground.gridSize; // Add gridBackground.
    const offset = (time * gridBackground.speed * 0.1) % dotSpacing; // Add gridBackground.
    
    for (let row = 0; row < 50; row++) {
        for (let col = -75; col <= 75; col++) {
            const distance = row * dotSpacing + offset; 
            const perspective = 200 / (200 + distance);
            
            if (perspective <= 0.01) continue;
            
            const baseY = horizon + (height - horizon) * perspective;
            const x = width/2 + (col * dotSpacing * perspective);
            const waveOffset = Math.sin((x * gridBackground.waveFrequency) + (time * 0.05)) * gridBackground.waveAmplitude;
            const y = baseY + waveOffset;
            
            ctx.globalAlpha = perspective * 0.8;
            ctx.fillStyle = gridBackground.gridColor;
            ctx.beginPath();    
            ctx.arc(x, y, perspective * 2 * gridBackground.lineThickness, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawGridLinesBackground(ctx, width, height, time) {
    const gridSize = gridBackground.gridSize;
    const speed = gridBackground.speed;
    const horizon = height * 0.05 - 100;
    
    const isLight = document.body.classList.contains('light');
    ctx.strokeStyle = isLight ? '#00000060' : '#ffffff60';
    
    const offset = (time * speed) % gridSize; // Now uses frame counter
    
    for (let i = 0; i < 50; i++) {
        const distance = i * gridSize + offset;
        const perspective = 200 / (200 + distance);
        const baseY = horizon + (height - horizon) * perspective;
        
        if (baseY > height) continue;
        
        ctx.globalAlpha = perspective * 1.2;
        ctx.lineWidth = Math.max(0.5, perspective * 2 * gridBackground.lineThickness);
        
        ctx.beginPath();
        for (let x = 0; x <= width; x += 5) {
            // Use consistent wave amplitude regardless of perspective
            const waveOffset = Math.sin((x * gridBackground.waveFrequency) + (time * 0.05)) * gridBackground.waveAmplitude;
            const y = baseY + waveOffset;
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
    
    // Vertical perspective lines that follow the wave contours
    const verticalSpacing = 30 / gridBackground.gridSize * 20;
    for (let i = -100; i <= 100; i++) {
        const xAtBottom = (i / verticalSpacing) * width;
        const vanishX = width / 2;
        
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.5 * gridBackground.lineThickness;
        
        ctx.beginPath();
        
        let hasStarted = false;
        
        // Draw vertical lines by sampling wave at fixed X positions
        for (let step = 0; step <= 100; step++) { // Increased steps for better coverage
            const distance = step * this.gridSize * 0.5; // Smaller step size
            const perspective = 200 / (200 + distance);
            
            if (perspective <= 0.01) break; // Stop when too small
            
            // Keep X position constant for this vertical line
            const x = xAtBottom + (vanishX - xAtBottom) * (1 - perspective);
            
            // Sample the wave at this X position
            const baseY = horizon + (height - horizon) * perspective;
            const waveOffset = Math.sin((x * waveFrequency) + (time * 0.05)) * waveAmplitude;
            const y = Math.max(0, Math.min(height, baseY + waveOffset));

            // Only break if we're way past the bottom and have been drawing
            if (baseY > height + 50) {
                if (hasStarted) break;
                continue;
            }
            
            if (!hasStarted) {
                ctx.moveTo(x, y);
                hasStarted = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        if (hasStarted) {
            ctx.stroke();
        }
    }
    
    ctx.globalAlpha = 1;
}

let frameCounter = 0; 
function exportAsWebM() {
    if (mediaRecorder && mediaRecorder.state === 'recording') return;
    
    // Show progress indicator immediately
    const progressIndicator = document.getElementById('progressIndicator');
    progressIndicator.style.display = 'inline-flex';
    document.getElementById('currentLine').textContent = `Line 1 of ${animator.textLines.length}`;
    document.getElementById('progressFill').style.width = '0%';
    
    // Set up canvas and recording
    const canvas = document.createElement('canvas');
    const container = document.querySelector('.animation-container');
    canvas.width = container.offsetWidth * 2;
    canvas.height = container.offsetHeight * 2;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const stream = canvas.captureStream(30);
    
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
    }
    
    mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        videoBitsPerSecond: 10000000
    });
    recordedChunks = [];
    
    // Track progress
    let startLine = animator.currentLineIndex;
    let totalLines = animator.textLines.length;
    let progressInterval;
    
    const updateProgress = () => {
        let currentLine = animator.currentLineIndex;
        let linesCompleted = (currentLine - startLine + totalLines) % totalLines;
        let progress = Math.min((linesCompleted / totalLines) * 100, 100);
        
        document.getElementById('currentLine').textContent = 
            `Line ${currentLine + 1} of ${totalLines}`;
        document.getElementById('progressFill').style.width = `${progress}%`;
    };
    
    // Start progress updates
    progressInterval = setInterval(updateProgress, 100);
    
    // Set up recording event handlers
    mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
        // Clear interval if still running
        if (progressInterval) clearInterval(progressInterval);
        
        const blob = new Blob(recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `intro-animation.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Hide progress and show success
        progressIndicator.style.display = 'none';
        document.getElementById('exportStatus').innerHTML = 
            '<div class="status success">✅ Video downloaded!</div>';
    };
    
    // Set up cycle completion callback
    animator.onCycleComplete = () => {
        // Stop progress updates first
        clearInterval(progressInterval);
        
        // Show completion
        document.getElementById('currentLine').textContent = 'Complete!';
        document.getElementById('progressFill').style.width = '100%';
        
        setTimeout(() => {
            mediaRecorder.stop();
            animator.stopAnimation();
        }, 500);
    };
    
    // Start recording and animation
    mediaRecorder.start();
    updateProgress();
    
    // Draw to canvas loop
    frameCounter = 0;
    function drawLoop() {
        if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
        
        ctx.fillStyle = document.getElementById('fontColor').value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        drawGridBackground(ctx, canvas.width, canvas.height, frameCounter++);
        
        ctx.fillStyle = getComputedStyle(document.body).color;
        ctx.font = `${animator.fontSize * 2}px monospace`;
        const fontWeight = document.getElementById('fontWeight').value;
        ctx.font = `${fontWeight} ${animator.fontSize * 2}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(animator.currentText, canvas.width/2, canvas.height/2);
        
        requestAnimationFrame(drawLoop);
    }
    
    drawLoop();
    animator.startAnimation();
}

// Auto-start animation on load
setTimeout(() => {
    animator.startAnimation();
}, 500);