function getForcedView() {
  const params = new URLSearchParams(window.location.search);
  const view = (params.get("view") || params.get("ui") || "").toLowerCase();
  if (["pc", "desktop"].includes(view)) return "pc";
  if (["m", "mobile"].includes(view)) return "mobile";
  return "";
}

function isMobileDevice() {
  const ua = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|iphone|ipod|ipad|windows phone|mobile/.test(ua);
  const isNarrowViewport = window.matchMedia("(max-width: 767px)").matches;
  const isCoarseNarrow = window.matchMedia("(pointer: coarse) and (max-width: 1023px)").matches;

  return isMobileUA || isNarrowViewport || isCoarseNarrow;
}

function redirectToEntry() {
  const forcedView = getForcedView();
  const target = forcedView === "pc"
    ? "/index-p.html"
    : forcedView === "mobile"
      ? "/index-m.html"
      : isMobileDevice()
        ? "/index-m.html"
        : "/index-p.html";

  window.location.replace(target + window.location.search + window.location.hash);
}

redirectToEntry();
