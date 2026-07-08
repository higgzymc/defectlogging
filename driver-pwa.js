if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw-driver.js").catch((error) => {
      console.error("Driver PWA service worker registration failed:", error);
    });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const installHint = document.getElementById("driverInstallHint");
  if (!installHint) return;

  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isIos && !isStandalone) {
    installHint.hidden = false;
  }
});
