class WaveEffect {
    constructor(element) {
        if (!element) {
            throw new Error('Element is required for WaveEffect');
        }
        this.element = element;
        this.isHolding = false;
        this.currentWave = null;
        this.touchIdentifier = null;
        this.boundHandleRelease = this.handleRelease.bind(this);
        this.init();
    }

    init() {
        // รองรับทั้ง pointer และ touch events
        this.element.addEventListener('pointerdown', this.handleStart.bind(this), { passive: true });
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        
        // ป้องกัน ghost clicks
        this.element.addEventListener('click', (e) => {
            if (e.pointerType === 'touch') {
                e.preventDefault();
            }
        });
    }

    handleStart(event) {
        if (event.button !== 0) return; // เฉพาะคลิกซ้ายเท่านั้น
        
        this.createWave(event);
        this.attachReleaseListeners();
    }

    handleTouchStart(event) {
        if (this.touchIdentifier !== null) return;
        
        const touch = event.changedTouches[0];
        this.touchIdentifier = touch.identifier;
        this.createWave(touch);
        this.attachReleaseListeners(true);
    }

    attachReleaseListeners(isTouch = false) {
        if (isTouch) {
            document.addEventListener('touchend', this.boundHandleRelease, { once: true });
            document.addEventListener('touchcancel', this.boundHandleRelease, { once: true });
        } else {
            document.addEventListener('pointerup', this.boundHandleRelease, { once: true });
            document.addEventListener('pointercancel', this.boundHandleRelease, { once: true });
        }
    }

    createWave(event) {
        this.cleanupCurrentWave();
        
        const rect = this.element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2.2;
        const position = this.calculateWavePosition(event, rect, size);
        
        const wave = this.createWaveElement(size, position);
        this.setupWaveAnimationHandlers(wave);
        
        this.element.appendChild(wave);
        this.currentWave = wave;
        this.isHolding = true;
    }

    calculateWavePosition(event, rect, size) {
        const x = event.clientX ?? event.pageX;
        const y = event.clientY ?? event.pageY;
        return {
            x: x - rect.left - size / 2,
            y: y - rect.top - size / 2
        };
    }

    createWaveElement(size, position) {
        const wave = document.createElement('span');
        wave.className = 'wave animating';
        
        Object.assign(wave.style, {
            width: `${size}px`,
            height: `${size}px`,
            left: `${position.x}px`,
            top: `${position.y}px`,
            backgroundColor: this.getWaveColor()
        });

        return wave;
    }

    setupWaveAnimationHandlers(wave) {
        wave.addEventListener('animationend', (event) => {
            if (event.animationName === 'wave-expand') {
                if (this.isHolding && wave === this.currentWave) {
                    wave.classList.remove('animating');
                    wave.classList.add('holding');
                }
            } else if (event.animationName === 'wave-fade-out') {
                this.cleanupWave(wave);
            }
        });
    }

    handleRelease(event) {
        if (this.validateTouchRelease(event)) {
            return;
        }

        this.isHolding = false;
        this.releaseCurrent();
    }

    validateTouchRelease(event) {
        if (event.type.startsWith('touch')) {
            const touch = Array.from(event.changedTouches)
                .find(t => t.identifier === this.touchIdentifier);
            if (!touch) return true;
            this.touchIdentifier = null;
        }
        return false;
    }

    releaseCurrent() {
        if (!this.currentWave) return;

        const wave = this.currentWave;
        if (wave.classList.contains('animating')) {
            wave.addEventListener('animationend', () => this.startFadeOut(wave), { once: true });
        } else {
            this.startFadeOut(wave);
        }
    }

    startFadeOut(wave) {
        requestAnimationFrame(() => {
            wave.classList.remove('holding');
            wave.classList.add('fade-out');
        });
    }

    cleanupWave(wave) {
        if (wave?.parentNode === this.element) {
            wave.remove();
            if (this.currentWave === wave) {
                this.currentWave = null;
            }
        }
    }

    cleanupCurrentWave() {
        this.currentWave?.remove();
        this.currentWave = null;
    }

    getWaveColor() {
        const waveColor = this.element.getAttribute('wake');
        if (waveColor) return waveColor;
        
        const style = getComputedStyle(this.element);
        return style.getPropertyValue('--wave-color').trim() || 'rgba(0, 0, 0, 0.25)';
    }

    destroy() {
        this.cleanupCurrentWave();
        document.removeEventListener('pointerup', this.boundHandleRelease);
        document.removeEventListener('pointercancel', this.boundHandleRelease);
        document.removeEventListener('touchend', this.boundHandleRelease);
        document.removeEventListener('touchcancel', this.boundHandleRelease);
    }
}

// ติดตั้ง Wave Effect สำหรับทุก element ที่มี attribute 'wake'
(() => {
    const waveEffects = new WeakMap();
    
    document.querySelectorAll('[wake]').forEach(element => {
        element.classList.add('wave-effect');
        const waveEffect = new WaveEffect(element);
        waveEffects.set(element, waveEffect);
    });
})();