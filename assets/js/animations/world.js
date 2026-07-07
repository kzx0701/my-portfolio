// 第四屏 What my world looks like — 严格复刻原站 Framer 动画
// 原站初始态：will-change:transform; opacity:0; transform:translateY(56px)
// 滚动进入视口后：opacity:1; transform:none（无 stagger、无 parallax、无 scale）

export function initWorld() {
  const section = document.querySelector("#world");
  if (!section) return null;

  const reveals = section.querySelectorAll(".world-reveal");
  if (!reveals.length) return null;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 减少动效：直接显示
  if (prefersReducedMotion) {
    gsap.set(reveals, { opacity: 1, y: 0 });
    return null;
  }

  // 初始态（对应原站 inline style: opacity:0; transform:translateY(56px)）
  gsap.set(reveals, { opacity: 0, y: 56 });

  // 每个元素进入视口时独立播放（对应 Framer 的 whileInView 行为）
  reveals.forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        toggleActions: "play none none none",
        once: true,
      },
    });
  });

  return { reveals };
}
