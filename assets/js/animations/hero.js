// Hero 第一屏入场动画（标题独占屏，轮播在第二屏单独初始化）
export function playHero() {
  const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 1 } });

  tl.from(".hero-eyebrow", { y: 20, opacity: 0, duration: 0.6 })
    .from(".hero-title-line", {
      y: 80,
      opacity: 0,
      duration: 1.1,
      stagger: 0.1,
    }, "-=0.3")
    .from(".hero-sub", { y: 20, opacity: 0, duration: 0.8 }, "-=0.5")
    .from(".hero-tags .tag", {
      y: 14,
      opacity: 0,
      duration: 0.5,
      stagger: 0.08,
    }, "-=0.4")
    .from(".hero-scroll-hint", { opacity: 0, duration: 0.8 }, "-=0.2");

  return tl;
}
