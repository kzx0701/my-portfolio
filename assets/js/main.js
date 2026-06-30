import { registerReveals } from "./utils/reveal.js";
import { playHero } from "./animations/hero.js";
import { initCarousel } from "./animations/carousel.js";

let carouselController = null;

function init() {
  gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin);

  // Hero 入场（首屏，立即播放）
  playHero();

  // 3D 轮播初始化（等 Hero 入场后启动）
  gsap.delayedCall(0.6, () => {
    if (carouselController) {
      carouselController.destroy();
    }
    carouselController = initCarousel();
  });

  // 其余 section 滚动揭示
  registerReveals();
}

if (window.gsap) {
  init();
} else {
  window.addEventListener("load", init);
}
