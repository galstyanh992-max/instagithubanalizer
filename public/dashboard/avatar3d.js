import * as THREE from "three";

const canvas = document.getElementById("avatarWebgl");
const host = document.getElementById("avatarStage");
const emit = (name, detail = {}) => window.dispatchEvent(new CustomEvent(name, { detail }));
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const damp = (current, target, speed, delta) => THREE.MathUtils.lerp(current, target, 1 - Math.exp(-speed * delta));

const texturePaths = {
  neutral: "./assets/model/emotions/neutral.webp?v=16",
  blink: "./assets/model/emotions/blink-sleep.webp?v=16",
  talk: "./assets/model/emotions/talk-surprise.webp?v=16",
  smile: "./assets/model/emotions/smile.webp?v=16",
  laugh: "./assets/model/emotions/laugh.webp?v=16",
  think: "./assets/model/emotions/think-profile.webp?v=16",
  sad: "./assets/model/emotions/sad.webp?v=16",
};

const stateTexture = {
  talking: "talk",
  smiling: "smile",
  laughing: "laugh",
  thinking: "think",
  sleeping: "blink",
  sad: "sad",
  surprised: "talk",
};

function fail(error) {
  host?.classList.remove("is-loading", "is-ready");
  host?.classList.add("model-error");
  emit("jarvis:model-error", { message: error?.message || "Volumetric avatar failed" });
  console.error("JARVIS volumetric avatar failed", error);
}

function createTube(points, radius, material, segments = 32) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 8, false), material);
}

function createPortraitGeometry() {
  const size = 2.76;
  const geometry = new THREE.PlaneGeometry(size, size, 168, 168);
  const positions = geometry.attributes.position;

  const gauss = (u, v, cu, cv, ru, rv, k = 1) =>
    Math.exp(-((((u - cu) / ru) ** 2) * k + (((v - cv) / rv) ** 2) * k));

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const u = x / size + .5;
    const v = y / size + .5;

    const skull     = gauss(u, v, .5, .655, .235, .335, 1.15);
    const face      = gauss(u, v, .5, .615, .150, .240, 1.35);
    const brow      = gauss(u, v, .5, .690, .120, .038, 1.6) * .55;
    const nose      = gauss(u, v, .5, .606, .030, .085, 1.7);
    const noseTip   = gauss(u, v, .5, .572, .022, .026, 2.0);
    const cheekL    = gauss(u, v, .392, .612, .062, .072, 1.4) * .5;
    const cheekR    = gauss(u, v, .608, .612, .062, .072, 1.4) * .5;
    const lips      = gauss(u, v, .5, .534, .052, .026, 1.6) * .45;
    const chin      = gauss(u, v, .5, .492, .056, .050, 1.5) * .5;
    const neck      = gauss(u, v, .5, .372, .092, .105, 1.4) * .4;
    const shoulders = gauss(u, v, .5, .175, .430, .200, 1.45);
    const clavicle  = gauss(u, v, .5, .268, .190, .045, 1.5) * .35;
    const hairL     = gauss(u, v, .310, .690, .105, .230, 1.2) * .55;
    const hairR     = gauss(u, v, .690, .690, .105, .230, 1.2) * .55;

    const z =
      skull * .190 + face * .080 + brow * .030 + nose * .070 + noseTip * .050 +
      (cheekL + cheekR) * .030 + lips * .026 + chin * .028 +
      neck * .034 + shoulders * .050 + clavicle * .018 -
      (hairL + hairR) * .020;

    positions.setZ(index, z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

async function start3D() {
  if (!canvas || !host) return;
  host.classList.add("is-loading");

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, .01, 100);
  camera.position.set(0, 0, 5);

  const loader = new THREE.TextureLoader();
  const textures = {};
  const entries = Object.entries(texturePaths);
  let loaded = 0;
  await Promise.all(entries.map(async ([name, path]) => {
    const texture = await loader.loadAsync(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    textures[name] = texture;
    loaded += 1;
    emit("jarvis:model-progress", { percent: Math.round(loaded / entries.length * 100) });
  }));

  const sceneRoot = new THREE.Group();
  sceneRoot.position.y = .015;
  sceneRoot.scale.setScalar(.774);
  scene.add(sceneRoot);

  const portraitRoot = new THREE.Group();
  sceneRoot.add(portraitRoot);

  const portraitGeometry = createPortraitGeometry();
  const portraitMaterial = new THREE.ShaderMaterial({
    uniforms: {
      baseMap: { value: textures.neutral },
      emotionMap: { value: textures.neutral },
      blinkMap: { value: textures.blink },
      emotionMix: { value: 0 },
      blinkMix: { value: 0 },
      hologramPulse: { value: 0 },
      lookShift: { value: new THREE.Vector2() },
      reliefAmount: { value: .085 },
      breathe: { value: 0 },
      parallax: { value: .030 },
      voice: { value: 0 },
      headTurn: { value: new THREE.Vector2() },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying float vRelief;
      uniform sampler2D baseMap;
      uniform vec2 lookShift;
      uniform float reliefAmount;
      uniform float breathe;

      void main() {
        vUv = uv + lookShift;
        // рельеф из яркости портрета — настоящая геометрическая глубина
        vec3 tex = texture2D(baseMap, vUv).rgb;
        float lum = dot(tex, vec3(.299, .587, .114));
        float relief = smoothstep(.05, .78, lum);
        vRelief = relief;

        vec3 pos = position;
        pos.z += relief * reliefAmount;
        pos.z += sin(uv.y * 5.5 + breathe) * .004 * relief;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D baseMap;
      uniform sampler2D emotionMap;
      uniform sampler2D blinkMap;
      uniform float emotionMix;
      uniform float blinkMix;
      uniform float hologramPulse;
      uniform float parallax;
      uniform float voice;
      uniform vec2 headTurn;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying float vRelief;

      float ellipseMask(vec2 uv, vec2 center, vec2 radius, float feather) {
        float d = length((uv - center) / radius);
        return 1.0 - smoothstep(1.0, 1.0 + feather, d);
      }
      float lumAt(sampler2D m, vec2 uv) {
        vec3 c = texture2D(m, uv).rgb;
        return dot(c, vec3(.299, .587, .114));
      }

      void main() {
        // параллакс по высоте — лицо «поворачивается» вместе с головой
        float h0 = lumAt(baseMap, vUv);
        vec2 par = headTurn * parallax * (h0 - .42);
        vec2 uv = vUv + par;

        vec4 base = texture2D(baseMap, uv);
        vec4 emotion = texture2D(emotionMap, uv);
        vec4 closedEyes = texture2D(blinkMap, uv);
        float emotionEase = emotionMix * emotionMix * (3.0 - 2.0 * emotionMix);
        float blinkEase = blinkMix * blinkMix * (3.0 - 2.0 * blinkMix);
        vec3 color = mix(base.rgb, emotion.rgb, emotionEase);
        color = mix(color, closedEyes.rgb, blinkEase);
        float brightness = max(max(color.r, color.g), color.b);

        // нормаль из карты высот (Sobel) — объёмная светотень
        float e = .0022;
        float hL = lumAt(baseMap, uv - vec2(e, 0.0));
        float hR = lumAt(baseMap, uv + vec2(e, 0.0));
        float hD = lumAt(baseMap, uv - vec2(0.0, e));
        float hU = lumAt(baseMap, uv + vec2(0.0, e));
        vec3 n = normalize(vec3((hL - hR) * 2.6, (hD - hU) * 2.6, 1.0));
        n = normalize(mix(normalize(vNormal), n, .72));

        vec3 keyDir  = normalize(vec3(-.42, .52, .84));
        vec3 fillDir = normalize(vec3(.58, .12, .72));
        float key  = max(dot(n, keyDir), 0.0);
        float fill = max(dot(n, fillDir), 0.0);
        float spec = pow(max(dot(reflect(-keyDir, n), normalize(vViewDir)), 0.0), 26.0);
        float fres = pow(1.0 - max(dot(n, normalize(vViewDir)), 0.0), 2.4);

        float headMask = ellipseMask(vUv, vec2(.5, .64), vec2(.33, .43), .17);
        float neckMask = ellipseMask(vUv, vec2(.5, .34), vec2(.205, .26), .17);
        float bustMask = ellipseMask(vUv, vec2(.5, .12), vec2(.59, .205), .18);
        float faceCore = ellipseMask(vUv, vec2(.5, .615), vec2(.178, .255), .13);
        float figureMask = max(headMask, max(neckMask, bustMask));
        float keyedAlpha = smoothstep(.065, .19, brightness);
        float alpha = figureMask * max(keyedAlpha, faceCore * .965);

        float edgeGlow = (1.0 - faceCore) * smoothstep(.055, .17, brightness) * (1.0 - smoothstep(.2, .38, brightness));
        color += vec3(0.0, .085, .235) * edgeGlow;
        color = pow(max(color, vec3(0.0)), vec3(.82));

        // объёмный свет
        color *= (.72 + .40 * key + .18 * fill);
        color += vec3(.20, .58, .92) * spec * .38;
        color += vec3(0.0, .12, .27) * fres;

        // дыхание голограммы + мягкий скан
        float scan = .994 + .006 * sin(vUv.y * 900.0 - hologramPulse * 1.6);
        color *= scan;
        color += vec3(.024, .05, .092);
        color += vec3(0.0, .03, .07) * (.5 + .5 * sin(hologramPulse * .8));

        // речь подсвечивает нижнюю треть лица
        float mouth = ellipseMask(vUv, vec2(.5, .545), vec2(.085, .055), .35);
        color += vec3(.05, .16, .26) * mouth * voice;

        gl_FragColor = vec4(color, alpha * .995);
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  });

  const portrait = new THREE.Mesh(portraitGeometry, portraitMaterial);
  portrait.scale.setScalar(1.08);
  portrait.position.z = .08;
  portrait.renderOrder = 5;
  portraitRoot.add(portrait);

  const headVolumeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x05265d,
    emissive: 0x005dc7,
    emissiveIntensity: .72,
    roughness: .38,
    metalness: .22,
    transparent: true,
    opacity: .34,
    side: THREE.DoubleSide,
  });
  const volume = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), headVolumeMaterial);
  volume.position.set(0, .34, -.52);
  volume.scale.set(.69, .95, .45);
  volume.renderOrder = 1;
  portraitRoot.add(volume);

  const volumeWire = new THREE.Mesh(volume.geometry, new THREE.MeshBasicMaterial({ color: 0x23bfff, wireframe: true, transparent: true, opacity: .075, depthWrite: false }));
  volumeWire.position.copy(volume.position);
  volumeWire.scale.copy(volume.scale).multiplyScalar(1.012);
  volumeWire.renderOrder = 2;
  portraitRoot.add(volumeWire);

  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x52e6ff, transparent: true, opacity: .48, depthWrite: false });
  const hairDepth = new THREE.Group();
  for (const side of [-1, 1]) {
    for (let index = 0; index < 5; index += 1) {
      const offset = index * .025;
      const strand = createTube([
        [side * (.12 + offset), 1.24 - offset, -.02 - offset],
        [side * (.46 + offset), .96 - offset, .04 - offset],
        [side * (.68 + offset), .48 - offset, -.04 - offset],
        [side * (.65 + offset), -.18 - offset, -.16 - offset],
        [side * (.55 + offset), -.69 - offset, -.2 - offset],
      ], .0065, glowMaterial, 30);
      hairDepth.add(strand);
    }
  }
  hairDepth.renderOrder = 3;
  portraitRoot.add(hairDepth);

  const particleCount = 380;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = .62 + Math.random() * .85;
    particlePositions[index * 3] = Math.cos(angle) * radius;
    particlePositions[index * 3 + 1] = (Math.random() - .43) * 2.55;
    particlePositions[index * 3 + 2] = -.25 + Math.sin(angle) * .12 + Math.random() * .28;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const faceParticles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0x62e7ff, size: .014, transparent: true, opacity: .48, depthWrite: false }));
  portraitRoot.add(faceParticles);

  let state = "idle";
  let emotionKey = "neutral";
  let emotionBlend = 0;
  let lookX = 0;
  let lookY = 0;
  let threeEnabled = true;
  let demoSpinUntil = performance.now() + 2600;
  let nextBlinkAt = performance.now() + 1800 + Math.random() * 1200;
  let blinkStartedAt = -1;
  let doubleBlinkQueued = false;
  let voicePulse = 0;
  const clock = new THREE.Clock();

  function triggerBlink() {
    if (state === "sleeping") return;
    blinkStartedAt = performance.now();
  }

  function blinkWave(now) {
    if (blinkStartedAt < 0) return 0;
    const elapsed = (now - blinkStartedAt) / 1000;
    if (elapsed < .09) return elapsed / .09;
    if (elapsed < .17) return 1;
    if (elapsed < .34) return 1 - (elapsed - .17) / .17;
    blinkStartedAt = -1;
    if (!doubleBlinkQueued && Math.random() < .18) {
      doubleBlinkQueued = true;
      nextBlinkAt = now + 135 + Math.random() * 105;
    } else {
      doubleBlinkQueued = false;
      nextBlinkAt = now + 2500 + Math.random() * 3500;
    }
    return 0;
  }

  function setState(next) {
    const nextState = next === "idle" || stateTexture[next] ? next : "idle";
    const nextTextureKey = stateTexture[nextState] || "neutral";
    if (nextTextureKey !== emotionKey) {
      emotionKey = nextTextureKey;
      portraitMaterial.uniforms.emotionMap.value = textures[emotionKey];
      emotionBlend = Math.min(emotionBlend, .12);
    }
    state = nextState;
    if (state !== "sleeping") nextBlinkAt = Math.min(nextBlinkAt, performance.now() + 1800);
  }

  function set3DEnabled(enabled) {
    threeEnabled = Boolean(enabled);
    host.classList.toggle("is-3d-disabled", !threeEnabled);
    if (threeEnabled) demoSpinUntil = performance.now() + 2200;
    emit("jarvis:model-toggle-result", { enabled: threeEnabled });
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("jarvis:avatar-state", (event) => setState(event.detail.state));
  window.addEventListener("jarvis:avatar-blink", triggerBlink);
  window.addEventListener("jarvis:voice-pulse", (event) => {
    voicePulse = Math.max(voicePulse, clamp01(event.detail?.level ?? .82));
  });
  window.addEventListener("jarvis:look", (event) => {
    lookX = event.detail.x;
    lookY = event.detail.y;
  });
  window.addEventListener("jarvis:toggle-3d", (event) => set3DEnabled(event.detail.enabled));
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    fail(new Error("WebGL context lost"));
  });

  new ResizeObserver(resize).observe(host);
  resize();
  host.classList.remove("is-loading", "model-error");
  host.classList.add("is-ready");
  setTimeout(() => emit("jarvis:model-ready", {
    clips: ["Idle", "Blink", "Talk", "Smile", "Laugh", "Think", "Sleep", "Sad", "Surprise"],
    rig: "volumetric-emotion-rig-v16",
  }), 0);
  window.JarvisFaceRig = Object.freeze({ setState, blink: triggerBlink, set3DEnabled });

  function render(now = performance.now()) {
    const delta = Math.min(clock.getDelta(), .05);
    if (threeEnabled) {
      if (now >= nextBlinkAt && blinkStartedAt < 0 && state !== "sleeping") triggerBlink();
      const blink = state === "sleeping" ? 0 : blinkWave(now);
      const emotionTarget = state === "idle" ? 0 : 1;
      emotionBlend = damp(emotionBlend, emotionTarget, state === "sleeping" ? 5.4 : 4.15, delta);
      voicePulse = damp(voicePulse, 0, 6.8, delta);
      const proceduralSpeech = clamp01(.54 + Math.sin(now * .017) * .3 + Math.sin(now * .039 + 1.4) * .16);
      const talkPulse = .28 + .72 * Math.max(proceduralSpeech, voicePulse);
      const visibleEmotion = state === "talking" ? emotionBlend * talkPulse : emotionBlend;
      portraitMaterial.uniforms.emotionMix.value = visibleEmotion;
      portraitMaterial.uniforms.blinkMix.value = blink;
      portraitMaterial.uniforms.hologramPulse.value = now * .001;
      portraitMaterial.uniforms.lookShift.value.set(-lookX * .0025, lookY * .0018);

      const demoYaw = now < demoSpinUntil ? Math.sin(now * .0031) * .14 : 0;
      const profileAssist = state === "thinking" ? -.045 : 0;
      const laughBob = state === "laughing" ? Math.sin(now * .013) * .014 : 0;
      const sleepNod = state === "sleeping" ? .075 : 0;
      portraitRoot.rotation.y = damp(portraitRoot.rotation.y, lookX * .115 + demoYaw + profileAssist, 5.5, delta);
      portraitRoot.rotation.x = damp(portraitRoot.rotation.x, -lookY * .05 + sleepNod + laughBob, 5.5, delta);
      portraitRoot.rotation.z = damp(portraitRoot.rotation.z, state === "thinking" ? -.018 : laughBob, 5.8, delta);
      portraitRoot.position.y = Math.sin(now * .00165) * .012 - (state === "sleeping" ? .025 : 0);
      const breath = 1 + Math.sin(now * .00165) * .004;
      portraitRoot.scale.set(breath, breath, 1);
      faceParticles.rotation.y += delta * .025;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

start3D().catch(fail);
