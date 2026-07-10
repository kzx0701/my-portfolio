// 第四屏 What my world looks like — 严格复刻原站 Framer 动画
//
// 源码分析（来自 Framer page chunk + framer.B7DkdXwa.mjs + motion.CWHTrZms.mjs 运行时）：
//
// 1. 标题 framer-1b8ro3z（入场动画）：
//    __framer__enter: _p
//    初始态 inline: will-change:transform; opacity:0; transform:translateY(56px)
//    进入视口后: opacity:1; transform:none
//    __framer__threshold: 0（一进入就触发）
//
// 2. 外层 framer-11wzbkc（入场动画，包裹图片行）：
//    __framer__enter: _p（同标题）
//    __framer__animateOnce: true（只播一次）
//
// 3. 三列滚动视差（onScrollTarget）：
//    ol() 函数中，il(n, threshold * containerLength) 调用 Xc() 计算 inputRange：
//      c = elementOffsetTop - yS(1) - offset(220) - threshold * viewportHeight
//      inputRange = [max(c, 0), max(c + elementHeight, 0)]
//    动画将 scrollY 从 inputRange[0] → [1] 映射，y 从 0 → 目标值
//    ★ 滚动距离 = 元素自身 clientHeight，NOT offset！offset 只偏移触发位置。
//    rl(values, spring) 对 MotionValue 附加 spring 平滑（duration:1s, ease:[0.44,0,0.56,1]）
//    → 对应 GSAP scrub:1 + ease:none（线性插值 + spring 平滑）
//
//    三列参数（来自 page chunk）：
//      col-1 (framer-87wfsd): y:0→-200, offset:220, threshold:0
//      col-2 (framer-v3y5vu): y:0→-200, offset:220, threshold:1
//      col-3 (framer-dehvaw): y:0→-400, offset:220, threshold:0.5
//
//    threshold 含义：动画开始时元素顶部距视口顶部的距离 = 221 + threshold * viewportHeight
//      threshold:0   → 元素顶部在视口顶部下方 221px（较晚触发）
//      threshold:0.5 → 元素顶部在视口中线下方 221px
//      threshold:1   → 元素顶部在视口底部下方 221px（较早触发，元素尚未进入视口）

export function initWorld() {
  const section = document.querySelector("#world");
  if (!section) return null;

  const reveals = section.querySelectorAll(".world-reveal");
  const parallaxEls = section.querySelectorAll("[data-world-parallax]");
  if (!reveals.length) return null;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 减少动效：直接显示，无视差
  if (prefersReducedMotion) {
    gsap.set(reveals, { opacity: 1, y: 0, clearProps: "transform" });
    return null;
  }

  // ========== 1. 入场动画（标题 + 外层图片行） ==========
  // 对应 __framer__enter: _p
  // 初始态: opacity:0, translateY(56px) → 目标: opacity:1, y:0
  // threshold:0 → 一进入视口就触发
  gsap.set(reveals, { opacity: 0, y: 56 });

  reveals.forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out", // 近似 Framer 的默认入场缓动
      scrollTrigger: {
        trigger: el,
        start: "top 90%", // threshold:0 → 几乎一进入底部就触发
        toggleActions: "play none none none",
        once: true, // __framer__animateOnce: true
      },
    });
  });

  // ========== 2. 三列各自滚动视差（onScrollTarget） ==========
  // 基于 Framer 运行时分析（ol/il/Xc/rl 函数）：
  //   - inputRange 基于 elementOffsetTop - 221 - threshold*vh，宽度 = elementHeight
  //   - 动画滚动距离 = 列自身 clientHeight（约 2000px），而非 offset 的 220px
  //   - spring(duration:1s) 平滑 → GSAP scrub:1
  const OFFSET_PLUS_YS = 221; // offset(220) + yS(1)

  const colConfigs = [
    { y: -200, threshold: 0 },   // col-1
    { y: -200, threshold: 1 },   // col-2
    { y: -400, threshold: 0.5 }, // col-3
  ];

  if (parallaxEls.length) {
    parallaxEls.forEach((col, i) => {
      const cfg = colConfigs[i] || colConfigs[0];
      // start: 元素顶部距视口顶部 (221 + threshold * vh) px
      // end: 滚动距离 = 元素自身 clientHeight
      const startPx = OFFSET_PLUS_YS + cfg.threshold * window.innerHeight;
      gsap.fromTo(
        col,
        { y: 0 },
        {
          y: cfg.y,
          ease: "none",
          scrollTrigger: {
            trigger: col,
            start: `top ${startPx}px`,
            end: () => `+=${col.clientHeight}`,
            scrub: 1,
          },
        }
      );
    });
  }

  return { reveals, parallaxEls };
}
