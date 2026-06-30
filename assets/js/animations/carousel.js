// 3D 透视轮播
// 关键修复：窗口尺寸变化时完整销毁并重建轮播实例，
// 避免旧半径、旧拖拽距离、旧倾斜动画和旧 transform 状态残留

function createCarouselInstance() {
  const wrap = document.querySelector(".carousel-wrap");
  const list = document.querySelector(".carousel-list");
  const panels = gsap.utils.toArray(".carousel-panel");
  if (!wrap || !list || panels.length === 0) return null;

  let radius = 0;
  let spin;
  let draggableInstance;
  let tiltTween;
  let dragVelocity = 0;
  let blurTickerActive = true;

  const calcRadius = () => {
    radius = window.innerWidth * 0.6;
  };

  const applyPanelOrigins = () => {
    panels.forEach((panel) => {
      panel.style.transformOrigin = `50% 50% ${-radius}px`;
    });
    gsap.set(panels, { xPercent: -50, yPercent: -50 });
  };

  const clearZone = 55;
  let lastBlurUpdate = 0;
  const blurUpdateInterval = 50;

  const blurTicker = () => {
    if (!blurTickerActive) return;

    const now = Date.now();
    if (now - lastBlurUpdate < blurUpdateInterval) return;
    lastBlurUpdate = now;

    panels.forEach((panel) => {
      const rotation = gsap.getProperty(panel, "rotationY");
      const normalized = ((rotation % 360) + 360) % 360;

      let blurAmount = 0;
      const isFrontFacing =
        normalized <= clearZone || normalized >= 360 - clearZone;

      if (!isFrontFacing) {
        const distanceFrom180 = Math.abs(180 - normalized);
        const maxDistance = 180 - clearZone;
        blurAmount = Math.max(0, (1 - distanceFrom180 / maxDistance) * 30);
      }

      panel.querySelectorAll(".carousel-screen").forEach((screen) => {
        screen.style.filter = `blur(${blurAmount.toFixed(2)}px)`;
      });
    });
  };

  calcRadius();
  applyPanelOrigins();

  spin = gsap.fromTo(
    panels,
    { rotationY: (i) => (i * 360) / panels.length, xPercent: -50, yPercent: -50 },
    {
      rotationY: "-=360",
      xPercent: -50,
      yPercent: -50,
      duration: 120,
      ease: "none",
      repeat: -1,
    }
  );

  spin.progress(1000);
  gsap.ticker.add(blurTicker);

  const proxy = document.createElement("div");
  const wrapProgress = gsap.utils.wrap(0, 1);
  let startProg = 0;

  const getDragDistance = () => window.innerWidth * 3;

  draggableInstance = Draggable.create(proxy, {
    trigger: wrap,
    type: "x",
    inertia: true,
    allowNativeTouchScrolling: true,
    onPress() {
      if (tiltTween) tiltTween.pause();
      gsap.killTweensOf(spin);
      spin.timeScale(0);
      startProg = spin.progress();
    },
    onDrag() {
      const p = startProg + (this.startX - this.x) / getDragDistance();
      spin.progress(wrapProgress(p));
      dragVelocity = (this.startX - this.x) / getDragDistance();
    },
    onThrowUpdate() {
      const p = startProg + (this.startX - this.x) / getDragDistance();
      spin.progress(wrapProgress(p));
    },
    onRelease() {
      if (!this.tween || !this.tween.isActive()) {
        gsap.to(spin, { timeScale: 1, duration: 0.1 });
        if (tiltTween) tiltTween.resume();
      }
    },
    onThrowComplete() {
      const direction = dragVelocity > 0 ? 1 : -1;
      const speed = Math.abs(dragVelocity) * 20;
      const clampedSpeed = gsap.utils.clamp(1, 5, speed);

      gsap.fromTo(
        spin,
        { timeScale: direction * clampedSpeed },
        {
          timeScale: direction,
          duration: 1.2,
          ease: "power2.out",
          onComplete: () => {
            if (tiltTween) tiltTween.resume();
          },
        }
      );
    },
  })[0];

  const startTilt = () => {
    tiltTween = gsap.fromTo(
      list,
      { rotation: gsap.getProperty(list, "rotation") || -1 },
      { rotation: 1, duration: 8, ease: "sine.inOut", repeat: -1, yoyo: true }
    );
  };

  const intro = gsap
    .timeline({ defaults: { ease: "expo.inOut" } })
    .fromTo(spin, { timeScale: 26 }, { timeScale: 1, duration: 2 })
    .fromTo(
      list,
      { scale: 0.5, rotation: 2 },
      { scale: 1, rotation: -1, duration: 1.2 },
      "<"
    )
    .fromTo(
      panels,
      { autoAlpha: 0 },
      { autoAlpha: 1, stagger: { amount: 0.8, from: "random" } },
      "<"
    );

  intro.then(startTilt);

  return {
    destroy() {
      blurTickerActive = false;
      gsap.ticker.remove(blurTicker);

      if (draggableInstance) {
        draggableInstance.kill();
      }

      if (spin) {
        spin.kill();
      }

      if (tiltTween) {
        tiltTween.kill();
      }

      if (intro) {
        intro.kill();
      }
      gsap.killTweensOf(panels);
      gsap.killTweensOf(list);

      panels.forEach((panel) => {
        panel.style.transformOrigin = "";
        panel.style.opacity = "";
        panel.style.visibility = "";
      });

      panelReset();
    },
  };

  function panelReset() {
    gsap.set(list, { clearProps: "transform" });
    gsap.set(panels, { clearProps: "transform,opacity,visibility" });

    panels.forEach((panel) => {
      panel.querySelectorAll(".carousel-screen").forEach((screen) => {
        screen.style.filter = "";
      });
    });
  }
}

export function initCarousel() {
  let instance = createCarouselInstance();
  if (!instance) return null;

  let resizeTimer = null;
  let lastKey = `${window.innerWidth}x${window.innerHeight}`;

  const rebuild = () => {
    const nextKey = `${window.innerWidth}x${window.innerHeight}`;
    if (nextKey === lastKey) return;

    lastKey = nextKey;

    if (instance) {
      instance.destroy();
    }

    instance = createCarouselInstance();
  };

  const handleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, 180);
  };

  window.addEventListener("resize", handleResize);

  return {
    destroy() {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      if (instance) {
        instance.destroy();
        instance = null;
      }
    },
  };
}
