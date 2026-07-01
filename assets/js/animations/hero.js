// Hero 第一屏入场动画与鼠标视差，尽量贴近 Franz 原站
export function playHero() {
  const hero = document.querySelector("[data-hero-parallax]");
  const parallax = hero?.querySelector(".hero-parallax");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!hero) return null;

  if (hero._heroParallaxHandler) {
    window.removeEventListener("mousemove", hero._heroParallaxHandler);
    hero._heroParallaxHandler = null;
  }

  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

  tl.to(".hero-content", { opacity: 1, duration: 0.1 })
    .from(".hero-parallax-wrapper", { scale: 0.9, opacity: 0, duration: 1.5, ease: "expo.out" }, 0.1)
    .from(".hero-meta--left, .hero-meta--right", { y: 24, opacity: 0, duration: 0.65, stagger: 0.08 }, 0.12)
    .from(".hero-text", { y: 20, opacity: 0, duration: 0.8 }, 0.2)
    .from(".hero-title", { y: 30, opacity: 0, duration: 0.8 }, 0.3)
    .from(".hero-subtitle", { y: 20, opacity: 0, duration: 0.8 }, 0.4)
    .from(".hero-link", { y: 15, opacity: 0, duration: 0.6 }, 0.5)
    .from(".hero-scroll-anchor", { opacity: 0, duration: 0.8 }, 0.6);

  if (prefersReducedMotion || !parallax) {
    return tl;
  }

  gsap.to(".hero-parallax-float", {
    y: "-=20",
    duration: 3,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
  });

  if (window.innerWidth > 768) {
    const handler = (event) => {
      const rect = hero.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const mouseX = (event.clientX - centerX) / (rect.width / 2);
      const mouseY = (event.clientY - centerY) / (rect.height / 2);
      const speedX = parseFloat(parallax.dataset.speedX || "20");
      const speedY = parseFloat(parallax.dataset.speedY || parallax.dataset.speedX || "20");
      const rotation = parseFloat(parallax.dataset.rotation || "5");

      gsap.to(parallax, {
        x: mouseX * speedX,
        y: mouseY * speedY,
        rotateY: mouseX * rotation,
        rotateX: -mouseY * rotation,
        duration: 1.2,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    hero._heroParallaxHandler = handler;
    window.addEventListener("mousemove", handler);
  }

  return tl;
}
