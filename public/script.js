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

// ================= ACCESIBILIDAD UNIVERSAL GLOBAL (OPTIMIZADA) =================
function toggleAccessibilityPanel() {
  const panel = document.getElementById('accessibility-panel');
  if (panel) {
    panel.classList.toggle('hidden');
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

// Funciones de accesibilidad ligera para evitar bloqueos en móvil
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
  // Limpiar filtros anteriores de forma rápida
  ['protanopia', 'deuteranopia', 'tritanopia'].forEach(t => {
    document.body.classList.remove(`daltonism-${t}`);
  });
  
  if (type !== 'none') {
    document.body.classList.add(`daltonism-${type}`);
  }
  localStorage.setItem('kronox_daltonism', type);
}

// ================= LECTOR DE VOZ ULTRA-LIGERO (ANTISATURACIÓN) =================
let speechActive = false;
let speechTimeout = null;

function toggleSpeechReader() {
  speechActive = !speechActive;
  localStorage.setItem('kronox_speech_active', speechActive ? 'enabled' : 'disabled');
  actualizarEstadoLectorUI();
}

function actualizarEstadoLectorUI() {
  const btn = document.getElementById('btn-speech-toggle');
  const subtitleBox = document.getElementById('speech-subtitle-box');
  
  let avisoFlotante = document.getElementById('toast-aviso-accesibilidad');
  if (!avisoFlotante) {
    avisoFlotante = document.createElement('div');
    avisoFlotante.id = 'toast-aviso-accesibilidad';
    avisoFlotante.style.cssText = "position:fixed; top:20px; right:20px; background:#091122; border:2px solid #00d2ff; color:#fff; padding:12px 20px; border-radius:12px; font-size:13px; z-index:99999; box-shadow:0 0 20px rgba(0,210,255,0.4); transition: opacity 0.5s ease;";
    document.body.appendChild(avisoFlotante);
  }

  if (speechActive) {
    if (btn) {
      btn.innerHTML = `<i class="fas fa-volume-xmark"></i> Desactivar Lector`;
      btn.classList.replace('bg-cyan-600', 'bg-red-600');
    }
    const mensaje = "Lector interactivo activado.";
    
    avisoFlotante.innerHTML = `<i class="fas fa-info-circle text-cyan-400 mr-2"></i> ${mensaje}`;
    avisoFlotante.style.opacity = '1';
    setTimeout(() => { avisoFlotante.style.opacity = '0'; }, 3000);

    window.speechSynthesis.cancel();
    const utteranceInicio = new SpeechSynthesisUtterance(mensaje);
    utteranceInicio.lang = 'es-MX';
    window.speechSynthesis.speak(utteranceInicio);

  } else {
    if (btn) {
      btn.innerHTML = `<i class="fas fa-volume-high"></i> Activar Lector Interactivo`;
      btn.classList.replace('bg-red-600', 'bg-cyan-600');
    }
    window.speechSynthesis.cancel();
    if (subtitleBox) subtitleBox.style.display = 'none';

    avisoFlotante.innerHTML = `<i class="fas fa-info-circle text-red-400 mr-2"></i> Lector desactivado.`;
    avisoFlotante.style.opacity = '1';
    setTimeout(() => { avisoFlotante.style.opacity = '0'; }, 2000);
  }
}

function leerTextoSeleccionado(e) {
  if (!speechActive) return;

  // Si toca botones, menús o paneles, ignorar de inmediato para proteger los clics
  if (e && e.target && (e.target.closest('button') || e.target.closest('a') || e.target.closest('nav') || e.target.closest('#accessibility-panel'))) {
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
      utterance.onerror = () => { if (subtitleBox) subtitleBox.style.display = 'none'; };

      window.speechSynthesis.speak(utterance);
    }
  }, 350); // Un pequeño respiro de 350ms para que el teléfono procese con soltura
}

// ================= INICIALIZACIÓN DEL SITIO =================
document.addEventListener("DOMContentLoaded", () => {

  // Links de WhatsApp
  initWA();

  // Cargar preferencias globales de accesibilidad
  loadAccessibilityPreferences();

  // Sincronizar estado inicial del lector si estaba activo en localStorage
  if (localStorage.getItem('kronox_speech_active') === 'enabled') {
    speechActive = true;
    actualizarEstadoLectorUI();
  }

  // ===== MENÚ HAMBURGUESA BLINDADO Y SINCRONIZADO =====
  let mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuBtn && mobileMenu) {
    const freshBtn = mobileMenuBtn.cloneNode(true);
    mobileMenuBtn.parentNode.replaceChild(freshBtn, mobileMenuBtn);
    mobileMenuBtn = document.getElementById('mobile-menu-btn');

    const mobileMenuIcon = document.getElementById('mobile-menu-icon');

    const toggleMenu = (e) => {
      e.stopPropagation();
      const isHidden = mobileMenu.classList.toggle('hidden');
      if (mobileMenuIcon) {
        mobileMenuIcon.className = isHidden ? "fas fa-bars" : "fas fa-times";
      }
    };

    mobileMenuBtn.addEventListener('click', toggleMenu);

    mobileMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        mobileMenu.classList.add('hidden');
        if (mobileMenuIcon) mobileMenuIcon.className = "fas fa-bars";
      });
    });

    document.addEventListener('click', (e) => {
      const btnRef = document.getElementById('mobile-menu-btn');
      const iconRef = document.getElementById('mobile-menu-icon');
      if (mobileMenu && btnRef && !mobileMenu.contains(e.target) && !btnRef.contains(e.target) && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
        if (iconRef) iconRef.className = "fas fa-bars";
      }
    });
  }

  // Eventos de selección aislados para proteger los clics de la interfaz
  document.addEventListener('mouseup', leerTextoSeleccionado);
  document.addEventListener('selectionchange', () => {
    if (speechActive) leerTextoSeleccionado();
  });

});
