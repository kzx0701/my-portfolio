// 通用滚动揭示工具：注册 .reveal / .reveal-y 元素的入场动画
// 由 main.js 在 GSAP 加载后调用

export function registerReveals(scope = document) {
  const els = scope.querySelectorAll(".reveal, .reveal-y");

  els.forEach((el) => {
    const hasY = el.classList.contains("reveal-y");
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        toggleActions: "play none none none",
      },
      onStart: () => {
        if (!hasY) el.style.transform = "none";
      },
    });
  });
}
