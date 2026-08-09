/* JARVIS — 3D-ядро системной панели (three.js) */
import * as THREE from "three";

const canvas = document.getElementById("coreCanvas");
if (canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 4.2);

  const group = new THREE.Group();
  scene.add(group);

  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.28, 1)),
    new THREE.LineBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0.55 })
  );
  const inner = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.72, 0)),
    new THREE.LineBasicMaterial({ color: 0x9fe9ff, transparent: true, opacity: 0.9 })
  );
  const dust = new THREE.Points(
    new THREE.IcosahedronGeometry(1.62, 2),
    new THREE.PointsMaterial({ color: 0x2b8fb0, size: 0.03, transparent: true, opacity: 0.75 })
  );
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.72, 1.74, 96),
    new THREE.MeshBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
  );
  ring.rotation.x = Math.PI / 2.35;
  group.add(shell, inner, dust, ring);

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  let load = 0.12;
  let tick = 0;
  window.addEventListener("jarvis:core-load", (e) => { load = Math.max(0.05, Math.min(1, e.detail.load)); });

  (function loop() {
    requestAnimationFrame(loop);
    tick += 0.016;
    const speed = 0.12 + load * 0.85;
    group.rotation.y += 0.0035 * speed;
    group.rotation.x = Math.sin(tick * 0.35) * 0.18;
    inner.rotation.y -= 0.011 * speed;
    inner.rotation.z += 0.006 * speed;
    dust.rotation.y -= 0.0016;
    const pulse = 1 + Math.sin(tick * 1.8) * 0.02 * (0.4 + load);
    shell.scale.setScalar(pulse);
    ring.material.opacity = 0.18 + load * 0.34;
    renderer.render(scene, camera);
  })();
}
