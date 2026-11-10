// ================= REGLA PARA LIMPIAR LA URL (INDEX Y .HTML) =================
// 1. Si la URL termina en index.html, lo remueve por completo de la barra
if (window.location.pathname.endsWith('index.html')) {
  const cleanUrl = window.location.pathname.replace(/index\.html$/, '') + window.location.search + window.location.hash;
  window.history.replaceState(null, '', cleanUrl);
} 
// 2. Para las demás páginas, remueve el .html visualmente apenas carga la página
else if (window.location.pathname.endsWith('.html')) {
  const cleanUrl = window.location.pathname.replace(/\.html$/, '') + window.location.search + window.location.hash;
  window.history.replaceState(null, '', cleanUrl);
} 

// ================= CONFIGURACIÓN DE WHATSAPP =================
const phone = "527779393985";

function wa(msg) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function setLink(id, msg) {
  const el = document.getElementById(id);
  if (el) {
    el.setAttribute("href", wa(msg));
  }
}

function initWA() {
  setLink("waHero", "Hola, quiero información de Kronox Gym");
  setLink("waMensual", "Hola, me interesa la mensualidad ($350)");
  setLink("waAnual", "Hola, me interesa la anualidad ($3000)");
  setLink("waFooter", "Hola, quiero información general");
  setLink("waNav", "Hola, quiero información de Kronox Gym");
}

// ================= INICIALIZACIÓN DEL SITIO =================
document.addEventListener("DOMContentLoaded", () => {

  // Links de WhatsApp
  initWA();

  // ===== Menú responsive (Optimizado para Celulares y Táctil) =====
  const menuBtn = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav nav");

  if (menuBtn && nav) {
    // Usar click con prevención de propagación para evitar bloqueos
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      nav.classList.toggle("active");

      if (nav.classList.contains("active")) {
        menuBtn.innerHTML = "✕";
      } else {
        menuBtn.innerHTML = "☰";
      }
    });

    // Cerrar el menú al tocar un enlace dentro de la navegación
    nav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("active");
        menuBtn.innerHTML = "☰";
      });
    });

    // Cerrar automáticamente si el usuario toca cualquier otra parte de la pantalla fuera del menú
    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !menuBtn.contains(e.target) && nav.classList.contains("active")) {
        nav.classList.remove("active");
        menuBtn.innerHTML = "☰";
      }
    });
  }

});
