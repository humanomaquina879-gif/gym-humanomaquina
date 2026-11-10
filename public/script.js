// ================= REGLA PARA LIMPIAR LA URL (INDEX Y .HTML) =================
if (window.location.pathname.endsWith('index.html')) {
  const cleanUrl = window.location.pathname.replace(/index\.html$/, '') + window.location.search + window.location.hash;
  window.history.replaceState(null, '', cleanUrl);
} else if (window.location.pathname.endsWith('.html')) {
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

// ================= PROTECCIÓN DEL LECTOR DE VOZ (CAMBIO DE PESTAÑA / NAVEGACIÓN) =================
let synth = window.speechSynthesis;
let estaPausadoPorCambioDeVentana = false;

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (synth && synth.speaking && !synth.paused) {
      synth.pause();
      estaPausadoPorCambioDeVentana = true;
    }
  } else {
    if (estaPausadoPorCambioDeVentana && synth && synth.paused) {
      synth.resume();
      estaPausadoPorCambioDeVentana = false;
    }
  }
});

// ================= INICIALIZACIÓN DEL SITIO =================
document.addEventListener("DOMContentLoaded", () => {

  // Links de WhatsApp
  initWA();

  // ===== Persistencia del Lector de Accesibilidad entre páginas =====
  const btnLector = document.querySelector("#btnActivarLector, .lector-voz-btn, [id*='Lector']"); // Ajusta el selector si tu botón tiene un ID específico
  const lectorActivoEstado = localStorage.getItem("kronox_lector_activo") === "true";

  // Función global o lógica para tu lector interactivo
  if (lectorActivoEstado) {
    // Si estaba activo antes de cambiar de página, lo re-activamos de forma automática
    console.log("Lector restaurado por localStorage");
    // Aquí puedes disparar la función que enciende los eventos de lectura de tu widget si es necesario
  }

  // ===== Menú responsive (Optimizado para Celulares y Táctil) =====
  const menuBtn = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav nav");

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      nav.classList.toggle("active");

      if (nav.classList.contains("active")) {
        menuBtn.innerHTML = "✕";
      } else {
        menuBtn.innerHTML = "☰";
      }
    });

    nav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("active");
        menuBtn.innerHTML = "☰";
      });
    });

    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !menuBtn.contains(e.target) && nav.classList.contains("active")) {
        nav.classList.remove("active");
        menuBtn.innerHTML = "☰";
      }
    });
  }

});
