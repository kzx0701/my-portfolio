import { registerReveals } from "./utils/reveal.js";
import { playHero } from "./animations/hero.js";
import { initCarousel } from "./animations/carousel.js";
import { initWorld } from "./animations/world.js";

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

  // 第三屏：What my world looks like 卡片批次入场 + 图片视差
  initWorld();

  // 其余 section 滚动揭示（world 卡片已由 initWorld 接管，但仍保留 reveal-y 供兜底）
  registerReveals();
}

if (window.gsap) {
  init();
} else {
  window.addEventListener("load", init);
}
