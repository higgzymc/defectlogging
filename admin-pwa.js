if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw-admin.js").catch((error) => {
      console.error("Admin PWA service worker registration failed:", error);
    });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const installHint = document.getElementById("adminInstallHint");
  if (!installHint) return;

  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isIos && !isStandalone) {
    installHint.hidden = false;
  }
});
