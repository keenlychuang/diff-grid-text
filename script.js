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
        this.onCycleComplete = null;
        this.recordingStartLine = null;
        this.convergencePattern = 'random';
        this.animationState = 'converging';
        this.stateTimer = null;
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
            if (this.textLines.length === 0) this.textLines = ["Enter some text"];
            this.currentLineIndex = 0;
            this.targetText = this.textLines[0];
            this.reset();
        });
        document.addEventListener('DOMContentLoaded', () => {
            const sections = document.querySelectorAll('.control-section');
            for (let i = 1; i < sections.length; i++) sections[i].classList.add('collapsed');
        });
        document.getElementById('fontWeight').addEventListener('change', (e) => this.textDisplay.style.fontWeight = e.target.value);
        document.getElementById('fontColor').addEventListener('input', (e) => this.textDisplay.style.color = e.target.value);
        document.getElementById('bgColor').addEventListener('input', (e) => document.querySelector('.animation-container').style.background = e.target.value);
        document.getElementById('fieldType').addEventListener('change', (e) => gridBackground.fieldType = e.target.value);
        document.getElementById('waveAmplitude').addEventListener('input', (e) => gridBackground.waveAmplitude = parseFloat(e.target.value));
        document.getElementById('waveFrequency').addEventListener('input', (e) => gridBackground.waveFrequency = parseFloat(e.target.value));
        document.getElementById('gridThickness').addEventListener('input', (e) => gridBackground.lineThickness = parseFloat(e.target.value));
        document.getElementById('convergencePattern').addEventListener('change', (e) => this.convergencePattern = e.target.value);
        document.getElementById('gridSpeed').addEventListener('input', (e) => gridBackground.speed = parseFloat(e.target.value));
        document.getElementById('gridDensity').addEventListener('input', (e) => gridBackground.gridSize = 60 - parseInt(e.target.value));
        document.getElementById('gridColor').addEventListener('input', (e) => { gridBackground.gridColor = e.target.value; gridBackground.draw(); });
        document.getElementById('convergenceEffect').addEventListener('change', (e) => this.convergenceEffectType = e.target.value);
        document.getElementById('convergenceColor').addEventListener('input', (e) => document.documentElement.style.setProperty('--convergence-color', e.target.value));
        document.getElementById('fontSelect').addEventListener('change', (e) => this.textDisplay.style.fontFamily = e.target.value);
        document.getElementById('animationWidth').addEventListener('input', () => this.updateAnimationSize());
        document.getElementById('animationHeight').addEventListener('input', () => this.updateAnimationSize());
        document.getElementById('speedSlider').addEventListener('input', (e) => this.speed = parseInt(e.target.value));
        document.getElementById('convergenceDelay').addEventListener('input', (e) => this.convergenceDelay = parseInt(e.target.value));
        document.getElementById('holdDuration').addEventListener('input', (e) => this.holdDuration = parseInt(e.target.value));
        document.getElementById('diffuseOutSpeed').addEventListener('input', (e) => this.diffuseOutSpeed = parseInt(e.target.value));
        document.getElementById('fontSize').addEventListener('input', (e) => { this.fontSize = parseInt(e.target.value); this.textDisplay.style.fontSize = this.fontSize + 'px'; });
    }
    
    updateAnimationSize() {
        const width = document.getElementById('animationWidth').value;
        const height = document.getElementById('animationHeight').value;
        const container = document.querySelector('.animation-container');
        container.style.width = width + 'px';
        container.style.height = height + 'px';
        if (window.gridBackground) gridBackground.updateSize(width, height);
        if (this.particleCanvas) this.resizeParticleCanvas();
    }
    
    reset() {
        this.stopAnimation();
        this.convergedChars.clear();
        this.charTimers.clear();
        this.animationState = 'converging';
        this.currentText = this.targetText.split('').map(char => char === ' ' ? ' ' : this.getRandomChar()).join('');
        this.render();
    }
    
    getRandomChar() { return this.activeCharSet[Math.floor(Math.random() * this.activeCharSet.length)]; }

    initParticleSystem() {
        this.particles = [];
        this.particleCanvas = document.createElement('canvas');
        this.particleCtx = this.particleCanvas.getContext('2d');
        const container = document.querySelector('.animation-container');
        const textDisplay = document.getElementById('textDisplay');
        container.insertBefore(this.particleCanvas, textDisplay);
        this.particleCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:1';
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
        const charWidth = this.fontSize * 0.6;
        const totalWidth = this.targetText.length * charWidth;
        const startX = (container.offsetWidth - totalWidth) / 2;
        const charX = startX + (charIndex * charWidth);
        const charY = container.offsetHeight / 2;
        const particleCount = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({ x: charX + (Math.random() - 0.5) * 20, y: charY + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 1.0, decay: 0.02 + Math.random() * 0.01, size: 2 + Math.random() * 3 });
        }
    }

    animateParticles() {
        if (!this.particleCtx) return;
        this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--convergence-color') || '#4a90e2';
        this.particles = this.particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.life -= p.decay; p.vy += 0.1;
            if (p.life > 0) {
                this.particleCtx.save(); this.particleCtx.globalAlpha = p.life; this.particleCtx.fillStyle = accentColor;
                this.particleCtx.beginPath(); this.particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2); this.particleCtx.fill(); this.particleCtx.restore();
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
        this.recordingStartLine = this.currentLineIndex;
        this.animate();
        this.scheduleConvergence();
    }
    
    scheduleConvergence() {
        this.charTimers.forEach(timer => clearTimeout(timer));
        this.charTimers.clear();
        this.targetText.split('').forEach((char, index) => {
            if (char === ' ') { this.convergedChars.add(index); return; }
            let delay = this.convergencePattern === 'wave' ? index * 100 : Math.random() * this.convergenceDelay * this.targetText.length;
            const timer = setTimeout(() => {
                if (this.animationState === 'converging' && this.isAnimating) {
                    this.convergedChars.add(index);
                    this.showConvergenceEffect(index);
                    const nonSpaceChars = this.targetText.replace(/ /g, '').length;
                    if (this.convergedChars.size >= nonSpaceChars + this.targetText.split('').filter(c => c === ' ').length) this.startHoldPhase();
                }
            }, delay);
            this.charTimers.set(index, timer);
        });
    }
    
    showConvergenceEffect(convergedIndex) {
        if (this.convergenceEffectType === 'none') return;
        if (this.convergenceEffectType === 'particles') { this.createConvergenceParticles(convergedIndex); return; }
        this.highlightedChar = convergedIndex;
        this.highlightEndTime = Date.now() + 200;
        this.renderWithHighlight();
        const cssClass = this.convergenceEffectType === 'underline' ? 'converged-char-underline' : 'converged-char-highlight';
        let html = '';
        this.currentText.split('').forEach((char, index) => {
            html += index === convergedIndex ? `<span class="${cssClass}">${this.targetText[index]}</span>` : char;
        });
        this.textDisplay.innerHTML = html;
        setTimeout(() => { if (this.isAnimating) this.render(); }, 2200);
    }
    
    startHoldPhase() {
        this.animationState = 'holding';
        this.stateTimer = setTimeout(() => this.startDiffuseOut(), this.holdDuration);
    }
    
    startDiffuseOut() {
        this.animationState = 'diffusing';
        this.charTimers.forEach(timer => clearTimeout(timer));
        this.charTimers.clear();
        const diffusedChars = new Set();
        this.targetText.split('').forEach((char, index) => {
            if (char === ' ') { diffusedChars.add(index); return; }
            const delay = Math.random() * this.convergenceDelay * this.targetText.length * 0.5;
            const timer = setTimeout(() => {
                if (this.animationState === 'diffusing' && this.isAnimating) {
                    this.convergedChars.delete(index);
                    diffusedChars.add(index);
                    if (diffusedChars.size >= this.targetText.length) this.nextLine();
                }
            }, delay);
            this.charTimers.set(index, timer);
        });
    }
    
    nextLine() {
        this.currentLineIndex = (this.currentLineIndex + 1) % this.textLines.length;
        this.targetText = this.textLines[this.currentLineIndex];
        this.currentText = this.targetText.split('').map(char => char === ' ' ? ' ' : this.getRandomChar()).join('');
        this.convergedChars.clear();
        this.animationState = 'converging';
        this.scheduleConvergence();
        if (this.recordingStartLine !== null && this.currentLineIndex === this.recordingStartLine) {
            if (this.onCycleComplete) setTimeout(() => this.onCycleComplete(), 500);
            this.recordingStartLine = null;
        }
    }
    
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.stateTimer) clearTimeout(this.stateTimer);
        this.charTimers.forEach(timer => clearTimeout(timer));
        this.charTimers.clear();
    }

    render() {
        if (this.highlightedChar !== undefined && Date.now() < this.highlightEndTime) this.renderWithHighlight();
        else { this.highlightedChar = undefined; this.textDisplay.textContent = this.currentText; }
    }

    renderWithHighlight() {
        if (this.highlightedChar === undefined) { this.textDisplay.textContent = this.currentText; return; }
        const cssClass = this.convergenceEffectType === 'underline' ? 'converged-char-underline' : 'converged-char-highlight';
        let html = '';
        this.currentText.split('').forEach((char, index) => {
            html += index === this.highlightedChar ? `<span class="${cssClass}">${this.targetText[index]}</span>` : char;
        });
        this.textDisplay.innerHTML = html;
    }
    
    animate() {
        if (!this.isAnimating) return;
        if (this.animationState === 'holding') this.currentText = this.targetText;
        else {
            this.currentText = this.targetText.split('').map((targetChar, index) => {
                if (this.convergedChars.has(index)) return targetChar;
                if (targetChar === ' ') return ' ';
                return this.getRandomChar();
            }).join('');
        }
        this.render();
        const currentSpeed = this.animationState === 'diffusing' ? this.diffuseOutSpeed : this.speed;
        setTimeout(() => { this.animationId = requestAnimationFrame(() => this.animate()); }, 200 - (currentSpeed * 15));
    }
}

class GridBackground {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.speed = 1; this.gridSize = 30; this.gridColor = '#ffffff';
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        this.time = 0; this.waveAmplitude = 20; this.waveFrequency = 0.01;
        this.isAnimating = true; this.fieldType = 'lines'; this.lineThickness = 1;
        this.animate();
    }
    
    setupCanvas() {
        const container = document.querySelector('.animation-container');
        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid-background';
        gridContainer.appendChild(this.canvas);
        container.appendChild(gridContainer);
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    draw() { this.fieldType === 'dots' ? this.drawDotField() : this.drawGridLines(); }

    getEffectiveColor() {
        const isLight = document.body.classList.contains('light');
        return (isLight && this.gridColor.toLowerCase() === '#ffffff') ? '#333333' : this.gridColor;
    }

    drawDotField() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        const horizon = height * 0.05 - 100;
        const dotSpacing = this.gridSize;
        const offset = (this.time * this.speed * 0.1) % dotSpacing;
        const effectiveColor = this.getEffectiveColor();
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
                this.ctx.fillStyle = effectiveColor;
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
        const effectiveColor = this.getEffectiveColor();
        this.ctx.strokeStyle = effectiveColor + '60';
        const offset = (this.time * this.speed) % this.gridSize;
        for (let i = 0; i < 50; i++) {
            const distance = i * this.gridSize + offset;
            const perspective = 200 / (200 + distance);
            const baseY = horizon + (height - horizon) * perspective;
            if (baseY > height) continue;
            this.ctx.globalAlpha = perspective * 1.2;
            this.ctx.lineWidth = Math.max(0.5, perspective * 2 * this.lineThickness);
            this.ctx.beginPath();
            for (let x = 0; x <= width; x += 5) {
                const waveOffset = Math.sin((x * this.waveFrequency) + (this.time * 0.05)) * this.waveAmplitude;
                const y = baseY + waveOffset;
                x === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();
        }
        const verticalSpacing = 30 / this.gridSize * 20;
        for (let i = -100; i <= 100; i++) {
            const xAtBottom = (i / verticalSpacing) * width;
            const vanishX = width / 2;
            this.ctx.globalAlpha = 0.4;
            this.ctx.lineWidth = 1.5 * this.lineThickness;
            this.ctx.beginPath();
            let hasStarted = false;
            for (let step = 0; step <= 100; step++) {
                const distance = step * this.gridSize * 0.5;
                const perspective = 200 / (200 + distance);
                if (perspective <= 0.01) break;
                const x = xAtBottom + (vanishX - xAtBottom) * (1 - perspective);
                const baseY = horizon + (height - horizon) * perspective;
                const waveOffset = Math.sin((x * this.waveFrequency) + (this.time * 0.05)) * this.waveAmplitude;
                const y = Math.max(0, Math.min(height, baseY + waveOffset));
                if (baseY > height + 50) { if (hasStarted) break; continue; }
                if (!hasStarted) { this.ctx.moveTo(x, y); hasStarted = true; } else this.ctx.lineTo(x, y);
            }
            if (hasStarted) this.ctx.stroke();
        }
    }
    
    animate() { if (!this.isAnimating) return; this.time++; this.draw(); requestAnimationFrame(() => this.animate()); }
    stop() { this.isAnimating = false; }
    start() { this.isAnimating = true; this.animate(); }
    resize() { const container = document.querySelector('.animation-container'); this.canvas.width = container.offsetWidth; this.canvas.height = container.offsetHeight; }
    updateSize(width, height) { this.canvas.width = parseInt(width); this.canvas.height = parseInt(height); }
}

function toggleSection(header) { header.parentElement.classList.toggle('collapsed'); }

function randomizeSettings() {
    document.getElementById('speedSlider').value = Math.floor(Math.random() * 10) + 1;
    document.getElementById('convergenceDelay').value = Math.floor(Math.random() * 500);
    document.getElementById('holdDuration').value = Math.floor(Math.random() * 4000) + 1000;
    document.getElementById('fontSize').value = Math.floor(Math.random() * 32) + 16;
    document.getElementById('gridSpeed').value = (Math.random() * 2.5).toFixed(1);
    document.getElementById('gridDensity').value = Math.floor(Math.random() * 40);
    const fonts = document.getElementById('fontSelect').options;
    document.getElementById('fontSelect').selectedIndex = Math.floor(Math.random() * fonts.length);
    const weights = document.getElementById('fontWeight').options;
    document.getElementById('fontWeight').selectedIndex = Math.floor(Math.random() * weights.length);
    document.getElementById('fontColor').value = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    document.getElementById('convergenceColor').value = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    document.getElementById('gridColor').value = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    const effects = document.getElementById('convergenceEffect').options;
    document.getElementById('convergenceEffect').selectedIndex = Math.floor(Math.random() * effects.length);
    const patterns = document.getElementById('convergencePattern').options;
    document.getElementById('convergencePattern').selectedIndex = Math.floor(Math.random() * patterns.length);
    const fieldTypes = document.getElementById('fieldType').options;
    document.getElementById('fieldType').selectedIndex = Math.floor(Math.random() * fieldTypes.length);
    ['speedSlider', 'convergenceDelay', 'holdDuration', 'fontSize', 'gridSpeed', 'gridDensity'].forEach(id => document.getElementById(id).dispatchEvent(new Event('input')));
    ['fontSelect', 'fontWeight', 'convergenceEffect', 'convergencePattern', 'fieldType'].forEach(id => document.getElementById(id).dispatchEvent(new Event('change')));
    ['fontColor', 'convergenceColor', 'gridColor'].forEach(id => document.getElementById(id).dispatchEvent(new Event('input')));
}

['animationWidth', 'animationHeight', 'speedSlider', 'convergenceEffect'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateSectionPreviews);
    document.getElementById(id).addEventListener('change', updateSectionPreviews);
});

function updateSectionPreviews() {
    const width = document.getElementById('animationWidth').value;
    const height = document.getElementById('animationHeight').value;
    const speed = document.getElementById('speedSlider').value;
    const effect = document.getElementById('convergenceEffect').value;
    const animationPreview = document.querySelector('.control-section .section-preview');
    if (animationPreview) animationPreview.textContent = `${width}×${height}px, Speed: ${speed}, ${effect} effect`;
}

const gridBackground = new GridBackground();
gridBackground.speed = parseFloat(document.getElementById('gridSpeed').value);
gridBackground.gridSize = 60 - parseInt(document.getElementById('gridDensity').value);
gridBackground.gridColor = document.getElementById('gridColor').value;
gridBackground.lineThickness = parseFloat(document.getElementById('gridThickness').value);
gridBackground.waveAmplitude = parseFloat(document.getElementById('waveAmplitude').value);
gridBackground.waveFrequency = parseFloat(document.getElementById('waveFrequency').value);

const animator = new DiffusionTextAnimator();

function stopAnimation() { animator.stopAnimation(); gridBackground.stop(); }
function startAnimation() { animator.startAnimation(); gridBackground.start(); }
function resetAnimation() { animator.reset(); }

function toggleTheme() {
    document.body.classList.toggle('light');
    const isLight = document.body.classList.contains('light');
    const bgColorInput = document.getElementById('bgColor');
    bgColorInput.value = isLight ? '#f5f5f5' : '#0a0a0a';
    document.querySelector('.animation-container').style.background = bgColorInput.value;
    gridBackground.draw();
}

function showExportModal(title = 'Creating GIF') {
    const modal = document.getElementById('exportModal');
    modal.querySelector('.export-modal-content').classList.remove('complete');
    modal.classList.add('visible');
    document.getElementById('exportModalTitle').textContent = title;
    document.getElementById('totalLines').textContent = animator.textLines.length;
    document.getElementById('currentLine').textContent = '1';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('exportStatus').textContent = 'Capturing...';
    document.getElementById('exportTip').textContent = title.includes('WebM') ? 'WebM is fast — just a few seconds' : 'This may take 10-30 seconds';
}

function hideExportModal() { document.getElementById('exportModal').classList.remove('visible'); }

function updateExportProgress(currentLine, totalLines, progress, status) {
    document.getElementById('currentLine').textContent = currentLine;
    document.getElementById('totalLines').textContent = totalLines;
    document.getElementById('progressFill').style.width = `${progress}%`;
    if (status) document.getElementById('exportStatus').textContent = status;
}

function showExportSuccess(format = 'GIF') {
    document.querySelector('.export-modal-content').classList.add('complete');
    document.getElementById('exportStatus').innerHTML = `<span class="success">✅ ${format} downloaded!</span>`;
    document.getElementById('exportTip').textContent = '';
    setTimeout(hideExportModal, 2000);
}

function drawGridBackground(ctx, width, height, time) {
    gridBackground.fieldType === 'dots' ? drawDotFieldBackground(ctx, width, height, time) : drawGridLinesBackground(ctx, width, height, time);
}

function drawDotFieldBackground(ctx, width, height, time) {
    const horizon = height * 0.05 - 100;
    const dotSpacing = gridBackground.gridSize;
    const offset = (time * gridBackground.speed * 0.1) % dotSpacing;
    const isLight = document.body.classList.contains('light');
    let effectiveColor = (isLight && gridBackground.gridColor.toLowerCase() === '#ffffff') ? '#333333' : gridBackground.gridColor;
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
            ctx.fillStyle = effectiveColor;
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
    let effectiveColor = (isLight && gridBackground.gridColor.toLowerCase() === '#ffffff') ? '#333333' : gridBackground.gridColor;
    const opacity = isLight ? '30' : '60';
    ctx.strokeStyle = effectiveColor + opacity;
    const offset = (time * speed) % gridSize;
    for (let i = 0; i < 50; i++) {
        const distance = i * gridSize + offset;
        const perspective = 200 / (200 + distance);
        const baseY = horizon + (height - horizon) * perspective;
        if (baseY > height) continue;
        ctx.globalAlpha = perspective * 1.2;
        ctx.lineWidth = Math.max(0.5, perspective * 2 * gridBackground.lineThickness);
        ctx.beginPath();
        for (let x = 0; x <= width; x += 5) {
            const waveOffset = Math.sin((x * gridBackground.waveFrequency) + (time * 0.05)) * gridBackground.waveAmplitude;
            const y = baseY + waveOffset;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    const verticalSpacing = 30 / gridBackground.gridSize * 20;
    for (let i = -100; i <= 100; i++) {
        const xAtBottom = (i / verticalSpacing) * width;
        const vanishX = width / 2;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.5 * gridBackground.lineThickness;
        ctx.beginPath();
        let hasStarted = false;
        for (let step = 0; step <= 100; step++) {
            const distance = step * gridBackground.gridSize * 0.5;
            const perspective = 200 / (200 + distance);
            if (perspective <= 0.01) break;
            const x = xAtBottom + (vanishX - xAtBottom) * (1 - perspective);
            const baseY = horizon + (height - horizon) * perspective;
            const waveOffset = Math.sin((x * gridBackground.waveFrequency) + (time * 0.05)) * gridBackground.waveAmplitude;
            const y = Math.max(0, Math.min(height, baseY + waveOffset));
            if (baseY > height + 50) { if (hasStarted) break; continue; }
            if (!hasStarted) { ctx.moveTo(x, y); hasStarted = true; } else ctx.lineTo(x, y);
        }
        if (hasStarted) ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

let exportInProgress = false;

// Helper function to get the best supported WebM codec
function getSupportedWebMType() {
    const types = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm;codecs=h264',
        'video/webm'
    ];
    
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            return type;
        }
    }
    return null;
}

// Helper to measure text for per-character rendering
function measureCharPositions(ctx, text, fontSize, fontFamily, fontWeight, width) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    const totalWidth = metrics.width;
    const startX = (width - totalWidth) / 2;
    
    const positions = [];
    let currentX = startX;
    
    for (let i = 0; i < text.length; i++) {
        const charWidth = ctx.measureText(text[i]).width;
        positions.push({
            x: currentX,
            width: charWidth,
            char: text[i]
        });
        currentX += charWidth;
    }
    
    return positions;
}

// Render text with convergence effects to canvas
function renderTextWithEffects(ctx, text, displayText, charPositions, height, fontSize, fontColor, convergenceColor, convergenceEffect, charConvergeFrames, charConvergedAtFrame, phaseFrame, phase) {
    const effectDurationFrames = 6; // Quick flash - about 0.2 seconds at 30fps
    
    for (let i = 0; i < text.length; i++) {
        const pos = charPositions[i];
        const displayChar = displayText[i];
        const justConverged = phase === 'converging' && 
                              charConvergedAtFrame[i] !== undefined && 
                              (phaseFrame - charConvergedAtFrame[i]) < effectDurationFrames;
        
        // Calculate effect intensity - quick flash then gone
        let effectIntensity = 0;
        if (justConverged && convergenceEffect !== 'none') {
            const framesSinceConverge = phaseFrame - charConvergedAtFrame[i];
            // Sharp falloff: full intensity for first 2 frames, then quick drop
            if (framesSinceConverge < 2) {
                effectIntensity = 1;
            } else {
                effectIntensity = 1 - ((framesSinceConverge - 2) / (effectDurationFrames - 2));
                effectIntensity = Math.max(0, effectIntensity * effectIntensity); // Quadratic falloff for snappier feel
            }
        }
        
        // Draw highlight background
        if (effectIntensity > 0 && convergenceEffect === 'highlight') {
            ctx.globalAlpha = effectIntensity;
            ctx.fillStyle = convergenceColor;
            const padding = fontSize * 0.15;
            ctx.fillRect(
                pos.x - padding,
                height / 2 - fontSize / 2 - padding,
                pos.width + padding * 2,
                fontSize + padding * 2
            );
        }
        
        // Draw underline
        if (effectIntensity > 0 && convergenceEffect === 'underline') {
            ctx.globalAlpha = effectIntensity;
            ctx.strokeStyle = convergenceColor;
            ctx.lineWidth = 2 + effectIntensity;
            ctx.beginPath();
            ctx.moveTo(pos.x, height / 2 + fontSize / 2 + 2);
            ctx.lineTo(pos.x + pos.width, height / 2 + fontSize / 2 + 2);
            ctx.stroke();
        }
        
        // Draw character
        ctx.globalAlpha = 1;
        ctx.fillStyle = fontColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayChar, pos.x, height / 2);
    }
}

// Particle system for export
class ExportParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    createParticles(x, y, color) {
        const particleCount = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.01,
                size: 2 + Math.random() * 3,
                color: color
            });
        }
    }
    
    update() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.life -= p.decay;
            return p.life > 0;
        });
    }
    
    render(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// WebM Export - Uses native MediaRecorder for fast hardware-accelerated encoding
function exportAsWebM() {
    if (exportInProgress) return;
    
    // Check for MediaRecorder support
    if (typeof MediaRecorder === 'undefined') {
        alert('WebM export is not supported in this browser. Please use the GIF export option instead.');
        return;
    }
    
    // Find supported codec
    const mimeType = getSupportedWebMType();
    if (!mimeType) {
        alert('WebM export is not supported in this browser. Please use the GIF export option instead.');
        return;
    }
    
    exportInProgress = true;
    showExportModal('Creating WebM');
    
    const container = document.querySelector('.animation-container');
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const totalLines = animator.textLines.length;
    
    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Get styles
    const bgColor = document.getElementById('bgColor').value;
    const fontColor = document.getElementById('fontColor').value;
    const convergenceColor = document.getElementById('convergenceColor').value;
    const fontFamily = document.getElementById('fontSelect').value.replace(/'/g, '');
    const fontWeight = document.getElementById('fontWeight').value;
    const fontSize = animator.fontSize;
    const convergenceEffect = document.getElementById('convergenceEffect').value;
    
    // Get current animation settings
    const convergenceDelay = animator.convergenceDelay;
    const convergencePattern = animator.convergencePattern;
    const holdDuration = animator.holdDuration;
    
    // Setup MediaRecorder with detected codec
    const stream = canvas.captureStream(30);
    let mediaRecorder;
    
    try {
        mediaRecorder = new MediaRecorder(stream, { 
            mimeType: mimeType, 
            videoBitsPerSecond: 5000000 
        });
    } catch (e) {
        // Fallback without specific options
        try {
            mediaRecorder = new MediaRecorder(stream);
        } catch (e2) {
            alert('WebM export failed. Please use the GIF export option instead.');
            exportInProgress = false;
            hideExportModal();
            return;
        }
    }
    
    const chunks = [];
    
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diffusion-animation.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        exportInProgress = false;
        showExportSuccess('WebM');
    };
    
    mediaRecorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        alert('WebM export failed. Please use the GIF export option instead.');
        exportInProgress = false;
        hideExportModal();
    };
    
    // Animation state - match the live preview timing
    const fps = 30;
    const frameDelay = 1000 / fps;
    
    // Calculate convergence duration based on actual settings
    const maxTextLength = Math.max(...animator.textLines.map(l => l.length));
    const convergenceDurationMs = convergencePattern === 'wave' 
        ? maxTextLength * 100
        : convergenceDelay * maxTextLength;
    
    const diffuseDurationMs = convergenceDelay * maxTextLength * 0.5;
    
    const framesPerPhase = {
        converging: Math.max(30, Math.ceil(convergenceDurationMs / frameDelay)),
        holding: Math.ceil(holdDuration / frameDelay),
        diffusing: Math.max(20, Math.ceil(diffuseDurationMs / frameDelay))
    };
    
    // Time scaling factor
    const timeScale = 2;
    
    let frameCounter = 0;
    let currentLineIdx = 0;
    let phase = 'converging';
    let phaseFrame = 0;
    let charConvergeFrames = [];
    let charConvergedAtFrame = []; // Track when each char actually converged
    let charPositions = [];
    
    // Particle system for export
    const particleSystem = new ExportParticleSystem();
    
    function initLineConvergence(text) {
        charConvergeFrames = text.split('').map((char, idx) => {
            if (char === ' ') return 0;
            if (convergencePattern === 'wave') {
                return Math.floor((idx * 100) / frameDelay);
            } else {
                const maxDelayMs = convergenceDelay * text.length;
                const randomDelayMs = Math.random() * maxDelayMs;
                return Math.floor(randomDelayMs / frameDelay);
            }
        });
        charConvergedAtFrame = new Array(text.length).fill(undefined);
        
        // Pre-calculate character positions
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        charPositions = measureCharPositions(ctx, text, fontSize, fontFamily, fontWeight, width);
    }
    
    function getRandomChar() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
        return chars[Math.floor(Math.random() * chars.length)];
    }
    
    function renderFrame() {
        const currentText = animator.textLines[currentLineIdx];
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        
        const scaledTime = frameCounter * timeScale;
        drawGridBackground(ctx, width, height, scaledTime);
        
        // Build display text and track convergence
        let displayText = '';
        if (phase === 'holding') {
            displayText = currentText;
        } else {
            currentText.split('').forEach((char, idx) => {
                if (char === ' ') {
                    displayText += ' ';
                } else if (phase === 'converging') {
                    const isConverged = phaseFrame >= charConvergeFrames[idx];
                    if (isConverged) {
                        // Track when this char converged
                        if (charConvergedAtFrame[idx] === undefined) {
                            charConvergedAtFrame[idx] = phaseFrame;
                            // Create particles if using particle effect
                            if (convergenceEffect === 'particles' && charPositions[idx]) {
                                particleSystem.createParticles(
                                    charPositions[idx].x + charPositions[idx].width / 2,
                                    height / 2,
                                    convergenceColor
                                );
                            }
                        }
                        displayText += char;
                    } else {
                        displayText += getRandomChar();
                    }
                } else {
                    // Diffusing
                    const diffuseFrame = framesPerPhase.diffusing - charConvergeFrames[idx] * 0.5;
                    displayText += phaseFrame >= diffuseFrame ? getRandomChar() : char;
                }
            });
        }
        
        // Update and render particles
        particleSystem.update();
        particleSystem.render(ctx);
        
        // Render text with effects
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        
        if (convergenceEffect === 'none' || convergenceEffect === 'particles') {
            // Simple text rendering for no effect or particles (particles are separate)
            ctx.fillStyle = fontColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 1;
            ctx.fillText(displayText, width / 2, height / 2);
        } else {
            // Render with highlight/underline effects
            renderTextWithEffects(
                ctx, currentText, displayText, charPositions,
                height, fontSize, fontColor, convergenceColor,
                convergenceEffect, charConvergeFrames, charConvergedAtFrame,
                phaseFrame, phase
            );
        }
    }
    
    mediaRecorder.start();
    initLineConvergence(animator.textLines[0]);
    
    const totalFrames = totalLines * (framesPerPhase.converging + framesPerPhase.holding + framesPerPhase.diffusing);
    let capturedFrames = 0;
    
    function captureFrame() {
        if (currentLineIdx >= totalLines) {
            mediaRecorder.stop();
            return;
        }
        
        renderFrame();
        capturedFrames++;
        frameCounter++;
        phaseFrame++;
        
        const progress = Math.floor((capturedFrames / totalFrames) * 100);
        updateExportProgress(currentLineIdx + 1, totalLines, progress, 'Recording...');
        
        if (phase === 'converging' && phaseFrame >= framesPerPhase.converging) { 
            phase = 'holding'; 
            phaseFrame = 0; 
        }
        else if (phase === 'holding' && phaseFrame >= framesPerPhase.holding) { 
            phase = 'diffusing'; 
            phaseFrame = 0; 
        }
        else if (phase === 'diffusing' && phaseFrame >= framesPerPhase.diffusing) {
            currentLineIdx++;
            phase = 'converging';
            phaseFrame = 0;
            if (currentLineIdx < totalLines) initLineConvergence(animator.textLines[currentLineIdx]);
        }
        
        setTimeout(captureFrame, frameDelay);
    }
    
    captureFrame();
}

// GIF Export - Uses gif.js library (slower but universal format)
function exportAsGIF() {
    if (exportInProgress) return;
    exportInProgress = true;
    showExportModal('Creating GIF');
    
    const container = document.querySelector('.animation-container');
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const totalLines = animator.textLines.length;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    const bgColor = document.getElementById('bgColor').value;
    const fontColor = document.getElementById('fontColor').value;
    const convergenceColor = document.getElementById('convergenceColor').value;
    const fontFamily = document.getElementById('fontSelect').value.replace(/'/g, '');
    const fontWeight = document.getElementById('fontWeight').value;
    const fontSize = animator.fontSize;
    const convergenceEffect = document.getElementById('convergenceEffect').value;
    
    // Get current animation settings
    const convergenceDelay = animator.convergenceDelay;
    const convergencePattern = animator.convergencePattern;
    const holdDuration = animator.holdDuration;
    
    const gif = new GIF({ workers: 2, quality: 10, width, height, workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js' });
    
    const fps = 15;
    const frameDelay = 1000 / fps;
    
    // Calculate convergence duration based on actual settings
    const maxTextLength = Math.max(...animator.textLines.map(l => l.length));
    const convergenceDurationMs = convergencePattern === 'wave' 
        ? maxTextLength * 100
        : convergenceDelay * maxTextLength;
    
    const diffuseDurationMs = convergenceDelay * maxTextLength * 0.5;
    
    const framesPerPhase = { 
        converging: Math.max(15, Math.ceil(convergenceDurationMs / frameDelay)), 
        holding: Math.ceil(holdDuration / frameDelay), 
        diffusing: Math.max(10, Math.ceil(diffuseDurationMs / frameDelay)) 
    };
    
    // Time scaling for GIF (15fps vs 60fps live)
    const timeScale = 4;
    
    let frameCounter = 0, currentLineIdx = 0, phase = 'converging', phaseFrame = 0;
    let charConvergeFrames = [];
    let charConvergedAtFrame = [];
    let charPositions = [];
    
    // Particle system for export
    const particleSystem = new ExportParticleSystem();
    
    function initLineConvergence(text) {
        charConvergeFrames = text.split('').map((char, idx) => {
            if (char === ' ') return 0;
            if (convergencePattern === 'wave') {
                return Math.floor((idx * 100) / frameDelay);
            } else {
                const maxDelayMs = convergenceDelay * text.length;
                const randomDelayMs = Math.random() * maxDelayMs;
                return Math.floor(randomDelayMs / frameDelay);
            }
        });
        charConvergedAtFrame = new Array(text.length).fill(undefined);
        
        // Pre-calculate character positions
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        charPositions = measureCharPositions(ctx, text, fontSize, fontFamily, fontWeight, width);
    }
    
    function getRandomChar() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
        return chars[Math.floor(Math.random() * chars.length)];
    }
    
    function renderFrame() {
        const currentText = animator.textLines[currentLineIdx];
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        
        const scaledTime = frameCounter * timeScale;
        drawGridBackground(ctx, width, height, scaledTime);
        
        // Build display text and track convergence
        let displayText = '';
        if (phase === 'holding') {
            displayText = currentText;
        } else {
            currentText.split('').forEach((char, idx) => {
                if (char === ' ') {
                    displayText += ' ';
                } else if (phase === 'converging') {
                    const isConverged = phaseFrame >= charConvergeFrames[idx];
                    if (isConverged) {
                        if (charConvergedAtFrame[idx] === undefined) {
                            charConvergedAtFrame[idx] = phaseFrame;
                            if (convergenceEffect === 'particles' && charPositions[idx]) {
                                particleSystem.createParticles(
                                    charPositions[idx].x + charPositions[idx].width / 2,
                                    height / 2,
                                    convergenceColor
                                );
                            }
                        }
                        displayText += char;
                    } else {
                        displayText += getRandomChar();
                    }
                } else {
                    const diffuseFrame = framesPerPhase.diffusing - charConvergeFrames[idx] * 0.5;
                    displayText += phaseFrame >= diffuseFrame ? getRandomChar() : char;
                }
            });
        }
        
        // Update and render particles
        particleSystem.update();
        particleSystem.render(ctx);
        
        // Render text with effects
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        
        if (convergenceEffect === 'none' || convergenceEffect === 'particles') {
            ctx.fillStyle = fontColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 1;
            ctx.fillText(displayText, width / 2, height / 2);
        } else {
            renderTextWithEffects(
                ctx, currentText, displayText, charPositions,
                height, fontSize, fontColor, convergenceColor,
                convergenceEffect, charConvergeFrames, charConvergedAtFrame,
                phaseFrame, phase
            );
        }
    }
    
    initLineConvergence(animator.textLines[0]);
    const totalFrames = totalLines * (framesPerPhase.converging + framesPerPhase.holding + framesPerPhase.diffusing);
    let capturedFrames = 0;
    
    function captureNext() {
        if (currentLineIdx >= totalLines) {
            updateExportProgress(totalLines, totalLines, 90, 'Encoding GIF...');
            document.getElementById('exportTip').textContent = 'Encoding — almost there!';
            gif.on('finished', (blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'diffusion-animation.gif';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                exportInProgress = false;
                showExportSuccess('GIF');
            });
            gif.on('progress', (p) => updateExportProgress(totalLines, totalLines, 90 + (p * 10), 'Encoding GIF...'));
            gif.render();
            return;
        }
        
        renderFrame();
        gif.addFrame(ctx, { copy: true, delay: Math.round(frameDelay) });
        capturedFrames++;
        frameCounter++;
        phaseFrame++;
        
        updateExportProgress(currentLineIdx + 1, totalLines, Math.floor((capturedFrames / totalFrames) * 85), 'Capturing frames...');
        
        if (phase === 'converging' && phaseFrame >= framesPerPhase.converging) { phase = 'holding'; phaseFrame = 0; }
        else if (phase === 'holding' && phaseFrame >= framesPerPhase.holding) { phase = 'diffusing'; phaseFrame = 0; }
        else if (phase === 'diffusing' && phaseFrame >= framesPerPhase.diffusing) {
            currentLineIdx++;
            phase = 'converging';
            phaseFrame = 0;
            if (currentLineIdx < totalLines) initLineConvergence(animator.textLines[currentLineIdx]);
        }
        
        setTimeout(captureNext, 0);
    }
    
    captureNext();
}

setTimeout(() => animator.startAnimation(), 500);