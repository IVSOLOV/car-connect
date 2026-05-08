const describeElement = (element: Element | null) => {
  if (!element) return "null";
  const id = element.id ? `#${element.id}` : "";
  const classes = element instanceof HTMLElement && element.className
    ? `.${String(element.className).trim().split(/\s+/).slice(0, 3).join(".")}`
    : "";
  const role = element.getAttribute("role") ? `[role=${element.getAttribute("role")}]` : "";
  const state = element.getAttribute("data-state") ? `[data-state=${element.getAttribute("data-state")}]` : "";
  return `${element.tagName.toLowerCase()}${id}${classes}${role}${state}`;
};

export const getInteractionSnapshot = () => {
  if (typeof document === "undefined") {
    return {
      route: "unknown",
      bodyPointerEvents: "unknown",
      htmlPointerEvents: "unknown",
      rootPointerEvents: "unknown",
      bodyOverflow: "unknown",
      activeOverlays: [] as string[],
      elementStack: [] as string[],
    };
  }

  const root = document.getElementById("root");
  const viewportX = Math.floor(window.innerWidth / 2);
  const viewportY = Math.floor(window.innerHeight / 2);
  const candidates = new Set<HTMLElement>();

  [
    "[data-radix-portal]",
    "[data-radix-popper-content-wrapper]",
    "[role='dialog']",
    "[data-state='open']",
    "[data-listing-success-overlay]",
    ".fixed.inset-0",
  ].forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => candidates.add(element));
  });

  const activeOverlays = Array.from(candidates)
    .map((element) => {
      const styles = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const visible = styles.display !== "none" && styles.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      if (!visible) return null;
      return `${describeElement(element)} pos=${styles.position} z=${styles.zIndex} pe=${styles.pointerEvents} ${Math.round(rect.width)}x${Math.round(rect.height)}`;
    })
    .filter((value): value is string => Boolean(value));

  return {
    route: `${window.location.pathname}${window.location.search}`,
    bodyPointerEvents: document.body.style.pointerEvents || window.getComputedStyle(document.body).pointerEvents,
    htmlPointerEvents: document.documentElement.style.pointerEvents || window.getComputedStyle(document.documentElement).pointerEvents,
    rootPointerEvents: root?.style.pointerEvents || (root ? window.getComputedStyle(root).pointerEvents : "missing"),
    bodyOverflow: document.body.style.overflow || window.getComputedStyle(document.body).overflow,
    htmlOverflow: document.documentElement.style.overflow || window.getComputedStyle(document.documentElement).overflow,
    bodyTouchAction: document.body.style.touchAction || window.getComputedStyle(document.body).touchAction,
    rootInert: root?.hasAttribute("inert") ?? false,
    activeOverlays,
    elementStack: document.elementsFromPoint(viewportX, viewportY).slice(0, 8).map(describeElement),
  };
};

const resetGlobalInteractionLocks = (source: string) => {
  if (typeof document === "undefined") return;

  const root = document.getElementById("root");
  const targets = [document.documentElement, document.body, root].filter(
    (target): target is HTMLElement => Boolean(target),
  );

  targets.forEach((target) => {
    target.style.removeProperty("pointer-events");
    target.style.removeProperty("touch-action");
    target.removeAttribute("inert");
    if ("inert" in target) {
      (target as HTMLElement & { inert: boolean }).inert = false;
    }
  });

  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";

  console.log(`[InteractionReset] ${source}`, getInteractionSnapshot());
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