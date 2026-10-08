/**
 * SIGNWELL BIO / Public Motion V12 — 2K Adaptive GPU / Silhouette Outline
 * Three.js 0.180.0 + GSAP ScrollTrigger 3.13.0
 * Static GitHub Pages-compatible progressive enhancement.
 * Rendering happens only on scroll/resize; CSS figure stays as fallback.
 * No backend, cookies, analytics, camera access or network APIs other than the
 * pinned public ES-module dependency.
 */
(async () => {
  "use strict";
  const root = document.getElementById("swMotionHomeHost")?.shadowRoot;
  const stage = root?.getElementById("motionStage");
  const rail = root?.getElementById("motionStory");
  const status = root?.getElementById("webglStatus");
  if (!stage || !rail) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  // The host is mounted only on the Public home route; hide gracefully elsewhere.
  const mobile = matchMedia("(max-width: 720px)");
  const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
  const gpuProfile = () => {
    const profile = document.documentElement.dataset.swGpuProfile || "balanced";
    return /lite/.test(profile) ? "lite" : profile === "high" ? "high" : "balanced";
  };
  const adaptiveRatio = (width, height) => {
    // 2K-class cap is for the actual GPU draw surface, not the whole page.
    // High-end desktop deliberately supersamples above the screen DPR when safe.
    const profile = gpuProfile();
    const handheld = mobile.matches;
    const qualityCap = profile === "lite" ? 1.1
      : handheld ? 1.55
      : profile === "high" ? 2.7 : 1.85;
    const pixelBudget = profile === "lite" ? 850000
      : handheld ? 1350000
      : profile === "high" ? 4200000 : 2400000;
    const deviceRatio = Math.max(1, Number(window.devicePixelRatio) || 1);
    const requested = profile === "high" && !handheld
      ? Math.max(deviceRatio, 2.55) : deviceRatio;
    const pixelLimit = Math.sqrt(pixelBudget / Math.max(1, width * height));
    const edgeLimit = Math.min(2048 / width, 2048 / height);
    return Math.max(0.8, Math.min(requested, qualityCap, pixelLimit, edgeLimit));
  };
  const setStatus = (t, mode) => {
    if (status) status.textContent = t;
    stage.dataset.renderer = mode;
  };
  const fallback = (message) => {
    stage.classList.remove("is-webgl-ready");
    setStatus(message || "2D COMPATIBILITY MODE", "css");
  };

  if (reduced.matches) {
    fallback("靜態閱讀模式");
    return;
  }
  if (!window.WebGL2RenderingContext) {
    fallback("2D COMPATIBILITY MODE");
    return;
  }

  // Import only after the motion section approaches the viewport. This avoids
  // delaying the homepage typography and improves initial mobile responsiveness.
  let started = false;
  const initialize = async () => {
    if (started) return;
    started = true;
    if (reduced.matches) return fallback("靜態閱讀模式");
    setStatus("載入即時 3D 場景…", "loading");
    let THREE;
    try {
      THREE = await import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js");
    } catch (error) {
      console.warn("[SIGNWELL] Three.js unavailable; CSS scene retained.", error);
      fallback("2D COMPATIBILITY MODE");
      return;
    }

    const host = document.createElement("div");
    host.className = "webgl-figure-host";
    host.setAttribute("aria-hidden", "true");
    const canvas = document.createElement("canvas");
    canvas.className = "webgl-figure-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    stage.appendChild(host);

    let renderer, scene, camera, artifact, metal, lens, ring, gold, stroke, fill, bodyOutline;
    let trigger = null, timeline = null, resizeObserver = null, qualityObserver = null;
    let active = true;
    let lastProgress = -1;
    let width = 0, height = 0;

    const disposeAll = () => {
      if (!active) return;
      active = false;
      trigger?.kill?.();
      timeline?.kill?.();
      resizeObserver?.disconnect();
      qualityObserver?.disconnect();
      if (scene) {
        scene.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
          }
        });
      }
      renderer?.dispose?.();
      host.remove();
    };

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true, // MSAA at all breakpoints; crop the framebuffer instead.
        powerPreference: mobile.matches || gpuProfile() === "lite" ? "default" : "high-performance",
        preserveDrawingBuffer: false,
        stencil: false
      });
      // Three.js r180 already requires WebGL2; successful renderer creation is the capability check.
      renderer.setPixelRatio(1); // Adaptive ratio is set after the viewport is measured.
      renderer.shadowMap.enabled = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.5;
      renderer.setClearColor(0x000000, 0);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.HemisphereLight(0xe4eef3, 0x253844, 2.5));
      const key = new THREE.DirectionalLight(0xf9f2e0, 5.1);
      key.position.set(-3, 5, 8); scene.add(key);
      const rim = new THREE.DirectionalLight(0x98bdd5, 3.3);
      rim.position.set(4, 1, -4); scene.add(rim);
      const warm = new THREE.PointLight(0xf7dbaa, 15, 20, 2);
      warm.position.set(-4, -3, 6); scene.add(warm);

      artifact = new THREE.Group();
      scene.add(artifact);

      // Soft rectangular extrusion; a genuine volume, not a CSS pseudo-3D plane.
      function roundedShape(w, h, r) {
        const shape = new THREE.Shape();
        const x = -w / 2, y = -h / 2;
        shape.moveTo(x + r, y);
        shape.lineTo(x + w - r, y);
        shape.quadraticCurveTo(x + w, y, x + w, y + r);
        shape.lineTo(x + w, y + h - r);
        shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        shape.lineTo(x + r, y + h);
        shape.quadraticCurveTo(x, y + h, x, y + h - r);
        shape.lineTo(x, y + r);
        shape.quadraticCurveTo(x, y, x + r, y);
        return shape;
      }

      const bodyGeo = new THREE.ExtrudeGeometry(roundedShape(2.55, 3.24, 0.08), {
        steps: 1, depth: 0.29, bevelEnabled: true,
        bevelThickness: 0.056, bevelSize: 0.05,
        bevelSegments: mobile.matches ? 5 : 7, curveSegments: mobile.matches ? 12 : 16
      });
      bodyGeo.center();

      metal = new THREE.MeshPhysicalMaterial({
        color: 0xa9b6ba, metalness: 0.48, roughness: 0.21,
        clearcoat: 0.8, clearcoatRoughness: 0.12,
        side: THREE.FrontSide
      });
      const body = new THREE.Mesh(bodyGeo, metal);
      // Back-face hull produces a solid art-directed outer silhouette.
      // Unlike WebGL lineWidth it is hardware-independent and MSAA smooths it.
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: 0x25343b, side: THREE.BackSide, depthWrite: true
      });
      bodyOutline = new THREE.Mesh(bodyGeo, outlineMaterial);
      bodyOutline.scale.setScalar(mobile.matches ? 1.034 : 1.022);
      artifact.add(bodyOutline);
      artifact.add(body);

      const inset = new THREE.Mesh(
        new THREE.PlaneGeometry(2.23, 2.9),
        new THREE.MeshPhysicalMaterial({
          color: 0xc1c6c3, metalness: 0.25, roughness: 0.28,
          clearcoat: 0.7, clearcoatRoughness: 0.15
        })
      );
      inset.position.z = 0.213;
      artifact.add(inset);

      const lightDiskMat = new THREE.MeshPhysicalMaterial({
        color: 0x859da5, metalness: 0.55, roughness: 0.11,
        clearcoat: 1, clearcoatRoughness: 0.07
      });
      lens = new THREE.Mesh(new THREE.SphereGeometry(
        0.79, mobile.matches ? 56 : 88, mobile.matches ? 40 : 64
      ), lightDiskMat);
      lens.scale.z = 0.28;
      lens.position.set(0, 0.44, 0.37);
      artifact.add(lens);

      ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.824, 0.032, mobile.matches ? 12 : 20, mobile.matches ? 80 : 128),
        new THREE.MeshStandardMaterial({ color: 0xe9e3d5, metalness: 0.75, roughness: 0.19 })
      );
      ring.position.set(0, 0.44, 0.47);
      artifact.add(ring);

      gold = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.021, 0.018),
        new THREE.MeshStandardMaterial({ color: 0xe6d7ac, metalness: 0.8, roughness: 0.25 })
      );
      gold.position.set(-0.25, -0.62, 0.258);
      artifact.add(gold);

      // Text is printed onto the 3D object using a local CanvasTexture.
      // No image download; improves consistency with editorial typography.
      const c = document.createElement("canvas");
      // 2K texture for editorial lettering; no low-resolution bitmap enlargement.
      c.width = 2048; c.height = 620;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D unavailable");
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#182933";
      ctx.textBaseline = "alphabetic";
      ctx.font = "800 320px Arial, sans-serif";
      ctx.fillText("SIGNWELL.", 48, 332);
      ctx.font = "600 66px Arial, sans-serif";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "10px";
      ctx.fillText("BIO  /  THE HUMAN CONDITION", 60, 476);
      const texture = new THREE.CanvasTexture(c);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
      fill = new THREE.Mesh(
        new THREE.PlaneGeometry(1.98, 0.6),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide })
      );
      fill.position.set(-0.01, -1.06, 0.27);
      artifact.add(fill);

      const microLines = new THREE.Group();
      stroke = new THREE.MeshBasicMaterial({ color: 0xe6e4da, transparent: true, opacity: 0.6 });
      for (let i = 0; i < 4; i++) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.008, 0.007), stroke);
        line.position.set(0, 1.32 - i * 0.085, 0.266);
        microLines.add(line);
      }
      artifact.add(microLines);

      const pose = { rx: -0.11, ry: -0.34, rz: -0.12, y: 0, scale: 1 };
      const cool = new THREE.Color(0xa9b6ba);
      const warmColor = new THREE.Color(0xd6cfb8);
      const blue = new THREE.Color(0x9db9b9);
      const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
      const useGSAP = !!(gsap && ScrollTrigger);
      const sample = (p) => {
        const t = clamp(p);
        const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
        if (t < 0.31) {
          const e = ease(t / 0.31);
          return { rx: -0.11 + e * 0.11, ry: -0.34 + e * 0.72, rz: -0.12 + e * 0.18, y: e * 0.13, scale: 1 + e * 0.15 };
        }
        if (t < 0.67) {
          const e = ease((t - 0.31) / 0.36);
          return { rx: 0.0 - e * 0.11, ry: 0.38 + e * 1.14, rz: 0.06 - e * 0.08, y: 0.13 - e * 0.17, scale: 1.15 - e * 0.13 };
        }
        const e = ease((t - 0.67) / 0.33);
        return { rx: -0.11 + e * 0.2, ry: 1.52 + e * 1.07, rz: -0.02 + e * 0.13, y: -0.04 + e * 0.17, scale: 1.02 + e * 0.14 };
      };

      let pixelRatio = 0;
      function resize() {
        if (!active) return;
        const w = Math.max(1, Math.round(host.clientWidth));
        const h = Math.max(1, Math.round(host.clientHeight));
        const ratio = adaptiveRatio(w, h);
        if (w === width && h === height && Math.abs(pixelRatio - ratio) < 0.01) return;
        width = w; height = h; pixelRatio = ratio;
        renderer.setPixelRatio(ratio);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // Cropped render surface: same model footprint for far fewer GPU pixels.
        camera.position.z = mobile.matches ? 5.85 : 8.25;
        camera.updateProjectionMatrix();
        canvas.dataset.pixelRatio = ratio.toFixed(2);
        canvas.dataset.resolution = canvas.width + "x" + canvas.height;
        canvas.dataset.quality = gpuProfile();
      }
      function paint(p) {
        if (!active || document.hidden) return;
        const t = clamp(p);
        resize();
        const v = useGSAP ? pose : sample(t);
        artifact.rotation.set(v.rx, v.ry, v.rz);
        // On portrait screens the stage heading/description occupy the upper
        // reading zone. Keep the real 3D artifact in the lower-right area.
        // Camera x/y use world units, not CSS pixels; perspective still works.
        if (mobile.matches) {
          const shortScreen = innerHeight < 730;
          // Canvas itself sits in the phone's lower-right reading-safe zone.
          artifact.position.set(0, v.y * 0.25, 0);
          artifact.scale.setScalar(v.scale * (shortScreen ? 0.53 : 0.57));
        } else {
          artifact.position.set(0, v.y, 0);
          artifact.scale.setScalar(v.scale * 1.07);
        }
        const alpha = Math.min(1, Math.max(0, (t - 0.16) / 0.31));
        const beta = Math.min(1, Math.max(0, (t - 0.57) / 0.3));
        metal.color.copy(cool).lerp(warmColor, alpha).lerp(blue, beta);
        lightDiskMat.color.set(t < 0.52 ? 0x859da5 : (t < 0.72 ? 0x8a9686 : 0x77949b));
        renderer.render(scene, camera);
        lastProgress = t;
      }
      function scrollProgress() {
        const r = rail.getBoundingClientRect();
        return clamp(-r.top / Math.max(1, rail.offsetHeight - innerHeight));
      }
      if (useGSAP) {
        gsap.registerPlugin(ScrollTrigger);
        // GSAP timeline owns 3D pose, ScrollTrigger scrubs through its progress.
        timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
        timeline
          .to(pose, { rx: 0.0, ry: 0.38, rz: 0.06, y: 0.13, scale: 1.15, duration: 0.31 })
          .to(pose, { rx: -0.11, ry: 1.52, rz: -0.02, y: -0.04, scale: 1.02, duration: 0.36 })
          .to(pose, { rx: 0.09, ry: 2.59, rz: 0.11, y: 0.13, scale: 1.16, duration: 0.33 });
        trigger = ScrollTrigger.create({
          trigger: rail, start: "top top", end: "bottom bottom",
          invalidateOnRefresh: true,
          onUpdate: (self) => { timeline.progress(self.progress); paint(self.progress); },
          onRefresh: (self) => { timeline.progress(self.progress); paint(self.progress); }
        });
      } else {
        // CDN/GSAP fallback still provides a real Three.js mesh on native scroll.
        let scheduled = false;
        const doScroll = () => { scheduled = false; if (active) paint(scrollProgress()); };
        const onScroll = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(doScroll); } };
        addEventListener("scroll", onScroll, { passive: true });
      }

      const onResize = () => { if (active) paint(scrollProgress()); };
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(host);
      addEventListener("resize", onResize, { passive: true });
      // Respect the existing governor when it downgrades quality after long tasks.
      qualityObserver = new MutationObserver(() => {
        if (active) paint(lastProgress < 0 ? scrollProgress() : lastProgress);
      });
      qualityObserver.observe(document.documentElement, {
        attributes: true, attributeFilter: ["data-sw-gpu-profile"]
      });
      // disposeAll handles the profile observer on context-loss and pagehide.

      canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        disposeAll();
        fallback("2D COMPATIBILITY MODE");
      }, { once: true });

      // First successful frame before hiding the fallback prevents blank scenes.
      if (useGSAP) timeline.progress(scrollProgress());
      paint(scrollProgress());
      stage.classList.add("is-webgl-ready");
      stage.dataset.renderer = useGSAP ? "three-gsap" : "three";
      setStatus(useGSAP ? "THREE.JS + GSAP / OUTLINE 3D" : "THREE.JS / OUTLINE 3D", useGSAP ? "three-gsap" : "three");

      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && active) paint(lastProgress < 0 ? scrollProgress() : lastProgress);
      }, { passive: true });

      window.addEventListener("pagehide", (event) => {
        // Back/forward cache may restore this document without rerunning scripts.
        if (!event.persisted) disposeAll();
      }, { once: true });
      reduced.addEventListener?.("change", () => {
        if (reduced.matches) {
          disposeAll();
          fallback("靜態閱讀模式");
        }
      }, { once: true });

      console.info("[SIGNWELL] WebGL scene ready:", stage.dataset.renderer);
    } catch (error) {
      console.warn("[SIGNWELL] WebGL init failed; CSS fallback remains.", error);
      disposeAll();
      fallback("2D COMPATIBILITY MODE");
    }
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((item) => item.isIntersecting)) {
        observer.disconnect();
        initialize();
      }
    }, { rootMargin: "550px 0px" });
    observer.observe(rail);
  } else {
    initialize();
  }
})();
