import * as THREE from 'three';

// Render at full window resolution — CRT shader provides the retro aesthetic.
// 320x240 looked terrible on modern monitors. Scanlines are now resolution-independent.
function getRenderSize() {
  return {
    w: window.innerWidth  || 1280,
    h: window.innerHeight || 720,
  };
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;

    const { w, h } = getRenderSize();

    // Scene & camera
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 12, 45);

    this.camera = new THREE.PerspectiveCamera(75, w / h, 0.05, 100);

    // Weapon viewmodel scene
    this.weaponScene  = new THREE.Scene();
    this.weaponCamera = new THREE.PerspectiveCamera(75, w / h, 0.01, 10);

    // WebGL renderer at window resolution
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setSize(w, h, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Render target for post-processing
    this.renderTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
    });

    // Post-process scene
    this._initPostProcess(w, h);

    window.addEventListener('resize', () => this.onResize());
  }

  _initPostProcess(w, h) {
    this.postScene  = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const crtMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse:             { value: this.renderTarget.texture },
        uTime:                { value: 0 },
        // Fixed scanline count — independent of render resolution
        // 240 lines gives a visible retro CRT feel at any display size
        uScanlineCount:       { value: 240.0 },
        uScanlineIntensity:   { value: 0.10 },
        uChromaticAberration: { value: 0.002 },
        uVignette:            { value: 0.18 },
        uFlicker:             { value: 0.006 },
        uNoise:               { value: 0.012 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uScanlineCount;
        uniform float uScanlineIntensity;
        uniform float uChromaticAberration;
        uniform float uVignette;
        uniform float uFlicker;
        uniform float uNoise;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        vec2 barrel(vec2 uv) {
          vec2 cc = uv - 0.5;
          float dist = dot(cc, cc);
          return uv + cc * dist * 0.03;
        }

        void main() {
          vec2 uv = barrel(vUv);

          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }

          // Chromatic aberration
          float ca  = uChromaticAberration;
          vec2  dir = (uv - 0.5);
          float r   = texture2D(tDiffuse, uv + dir * ca).r;
          float g   = texture2D(tDiffuse, uv).g;
          float b   = texture2D(tDiffuse, uv - dir * ca).b;
          vec3 color = vec3(r, g, b);

          // Scanlines — fixed count, resolution-independent
          float scanline = sin(uv.y * uScanlineCount * 3.14159) * 0.5 + 0.5;
          scanline = pow(scanline, 0.8);
          color *= 1.0 - uScanlineIntensity * (1.0 - scanline);

          // Screen flicker
          color *= 1.0 - uFlicker * hash(vec2(uTime * 0.1, 0.5));

          // Film grain
          float noise = hash(uv + vec2(uTime * 0.01)) * uNoise;
          color += noise - uNoise * 0.5;

          // Vignette
          vec2  vigUv = uv * (1.0 - uv.yx);
          float vig   = vigUv.x * vigUv.y * 15.0;
          vig = pow(vig, uVignette);
          color *= vig;

          // Subtle phosphor green tint
          color.g *= 1.02;

          gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
        }
      `,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), crtMaterial);
    this.postScene.add(quad);
    this.crtMaterial = crtMaterial;
  }

  render() {
    this.crtMaterial.uniforms.uTime.value = performance.now() * 0.001;

    // Sync weapon camera
    this.weaponCamera.position.copy(this.camera.position);
    this.weaponCamera.quaternion.copy(this.camera.quaternion);

    // Pass 1: game scene to offscreen target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);

    // Pass 1b: weapon viewmodels — depth cleared so they never clip walls
    this.renderer.autoClear = false;
    try {
      this.renderer.clearDepth();
      this.renderer.render(this.weaponScene, this.weaponCamera);
    } finally {
      this.renderer.autoClear = true;
    }

    // Pass 2: CRT post-process to screen
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }

  onResize() {
    const { w, h } = getRenderSize();

    this.renderer.setSize(w, h, false);

    // Recreate render target at new size
    this.renderTarget.dispose();
    this.renderTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format:    THREE.RGBAFormat,
    });
    this.crtMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;

    // Update camera aspects
    this.camera.aspect       = w / h;
    this.weaponCamera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.weaponCamera.updateProjectionMatrix();

    // Fill canvas
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '0px';
    this.canvas.style.top  = '0px';
  }
}
