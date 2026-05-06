const resetGlobalInteractionLocks = (source: string) => {
  if (typeof document === "undefined") return;

  const root = document.getElementById("root");
  const targets = [document.documentElement, document.body, root].filter(
    (target): target is HTMLElement => Boolean(target),
  );

  targets.forEach((target) => {
    target.style.pointerEvents = "";
    target.style.touchAction = "";
    target.removeAttribute("inert");
  });

  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";

  console.log(`[InteractionReset] ${source}`, {
    bodyPointerEvents: document.body.style.pointerEvents || "cleared",
    bodyOverflow: document.body.style.overflow || "cleared",
    htmlOverflow: document.documentElement.style.overflow || "cleared",
    rootPointerEvents: root?.style.pointerEvents || "cleared",
    activeElement: document.activeElement?.tagName ?? null,
  });
};

export const clearGlobalInteractionLocks = (source: string) => {
  resetGlobalInteractionLocks(source);
};

export const scheduleGlobalInteractionUnlock = (source: string) => {
  resetGlobalInteractionLocks(`${source}: immediate`);

  const timeoutIds = [50, 250, 750, 1500].map((delay) =>
    window.setTimeout(() => resetGlobalInteractionLocks(`${source}: +${delay}ms`), delay),
  );

  const frameId = window.requestAnimationFrame(() => {
    resetGlobalInteractionLocks(`${source}: animation-frame`);
  });

  return () => {
    timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    window.cancelAnimationFrame(frameId);
  };
};