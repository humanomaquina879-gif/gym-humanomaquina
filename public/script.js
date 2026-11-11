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

// ================= PROTECCIÓN DEL LECTOR DE VOZ (CAMBIO DE PESTAÑA) =================
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

// ================= ACCESIBILIDAD UNIVERSAL GLOBAL =================
function toggleAccessibilityPanel() {
  // ROMPER CUALQUIER BLOQUEO DE AUDIO ANTES DE ABRIR EL PANEL
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  const panel = document.getElementById('accessibility-panel');
  if (panel) {
    const isHidden = panel.classList.toggle('hidden');
    if (!isHidden) {
      panel.style.zIndex = '999999';
    }
  }
}

function loadAccessibilityPreferences() {
  const savedSize = localStorage.getItem('kronox_font_size');
  if (savedSize) {
    document.documentElement.style.fontSize = `${savedSize}%`;
  }

  const savedContrast = localStorage.getItem('kronox_high_contrast');
  if (savedContrast === 'enabled') {
    document.body.classList.add('high-contrast');
  }

  const savedDaltonism = localStorage.getItem('kronox_daltonism');
  if (savedDaltonism && savedDaltonism !== 'none') {
    document.body.classList.add(`daltonism-${savedDaltonism}`);
  }
}

function adjustFontSize(amount) {
  let currentSize = parseInt(localStorage.getItem('kronox_font_size') || '100');
  currentSize = Math.max(85, Math.min(130, currentSize + amount));
  localStorage.setItem('kronox_font_size', currentSize);
  document.documentElement.style.fontSize = `${currentSize}%`;
}

function resetFontSize() {
  localStorage.setItem('kronox_font_size', '100');
  document.documentElement.style.fontSize = '100%';
}

function toggleHighContrast() {
  const isEnabled = document.body.classList.toggle('high-contrast');
  localStorage.setItem('kronox_high_contrast', isEnabled ? 'enabled' : 'disabled');
}

function setDaltonism(type) {
  ['protanopia', 'deuteranopia', 'tritanopia'].forEach(t => {
    document.body.classList.remove(`daltonism-${t}`);
  });
  if (type !== 'none') {
    document.body.classList.add(`daltonism-${type}`);
  }
  localStorage.setItem('kronox_daltonism', type);
}

// ================= LECTOR DE VOZ ULTRA-LIGERO =================
let speechActive = false;
let speechTimeout = null;

function toggleSpeechReader() {
  speechActive = !speechActive;
  actualizarEstadoLectorUI();
}

function actualizarEstadoLectorUI() {
  const btn = document.getElementById('btn-speech-toggle');
  const subtitleBox = document.getElementById('speech-subtitle-box');
  
  if (speechActive) {
    if (btn) {
      btn.innerHTML = `<i class="fas fa-volume-xmark"></i> Desactivar Lector`;
      btn.classList.replace('bg-cyan-600', 'bg-red-600');
    }
    window.speechSynthesis.cancel();
    const utteranceInicio = new SpeechSynthesisUtterance("Lector activado.");
    utteranceInicio.lang = 'es-MX';
    window.speechSynthesis.speak(utteranceInicio);
  } else {
    if (btn) {
      btn.innerHTML = `<i class="fas fa-volume-high"></i> Activar Lector Interactivo`;
      btn.classList.replace('bg-red-600', 'bg-cyan-600');
    }
    window.speechSynthesis.cancel();
    if (subtitleBox) subtitleBox.style.display = 'none';
  }
}

function leerTextoSeleccionado(e) {
  if (!speechActive) return;

  if (e && e.target && (e.target.closest('button') || e.target.closest('a') || e.target.closest('nav') || e.target.closest('#accessibility-panel') || e.target.closest('#mobile-menu'))) {
    return;
  }

  if (speechTimeout) clearTimeout(speechTimeout);

  speechTimeout = setTimeout(() => {
    const seleccion = window.getSelection();
    const textoSeleccionado = seleccion ? seleccion.toString().trim() : "";

    if (textoSeleccionado && textoSeleccionado.length > 2) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textoSeleccionado);
      utterance.lang = 'es-MX';
      
      const subtitleBox = document.getElementById('speech-subtitle-box');
      const subtitleText = document.getElementById('subtitle-text');
      if (subtitleText && subtitleBox) {
        subtitleText.innerText = textoSeleccionado;
        subtitleBox.style.display = 'block';
      }

      utterance.onend = () => { if (subtitleBox) subtitleBox.style.display = 'none'; };
      window.speechSynthesis.speak(utterance);
    }
  }, 300);
}

// ================= INICIALIZACIÓN DEL SITIO =================
document.addEventListener("DOMContentLoaded", () => {

  // Links de WhatsApp
  initWA();

  // Cargar preferencias globales de accesibilidad
  loadAccessibilityPreferences();

  // ===== MENÚ HAMBURGUESA BLINDADO CON LIBERACIÓN DE AUDIO =====
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuIcon = document.getElementById('mobile-menu-icon');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.onclick = (e) => {
      e.stopPropagation();
      
      // Matar cualquier síntesis de voz en curso para liberar el hilo principal del celular
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      const isHidden = mobileMenu.classList.toggle('hidden');
      if (mobileMenuIcon) {
        mobileMenuIcon.className = isHidden ? "fas fa-bars" : "fas fa-times";
      }
    };

    mobileMenu.querySelectorAll("a").forEach(link => {
      link.onclick = () => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        mobileMenu.classList.add('hidden');
        if (mobileMenuIcon) mobileMenuIcon.className = "fas fa-bars";
      };
    });
  }

  // ===== VINCULACIÓN DIRECTA DEL BOTÓN DE ACCESIBILIDAD =====
  const accessibilityBtn = document.querySelector("button[onclick*='toggleAccessibilityPanel']") || document.getElementById('btn-accessibility-toggle');
  if (accessibilityBtn) {
    accessibilityBtn.onclick = (e) => {
      e.stopPropagation();
      toggleAccessibilityPanel();
    };
  }

  // Cerrar menú o panel al tocar fuera de forma segura
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('accessibility-panel');
    const btnPanel = document.querySelector("button[onclick*='toggleAccessibilityPanel']") || document.getElementById('btn-accessibility-toggle');

    if (mobileMenu && mobileMenuBtn && !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target) && !mobileMenu.classList.contains('hidden')) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      mobileMenu.classList.add('hidden');
      if (mobileMenuIcon) mobileMenuIcon.className = "fas fa-bars";
    }

    if (panel && btnPanel && !panel.contains(e.target) && !btnPanel.contains(e.target) && !panel.classList.contains('hidden')) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      panel.classList.add('hidden');
    }
  });

  // Eventos de lectura seguros
  document.addEventListener('mouseup', leerTextoSeleccionado);
  document.addEventListener('touchend', leerTextoSeleccionado);

});
