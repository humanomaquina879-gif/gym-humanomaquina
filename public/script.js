// ================= ACCESIBILIDAD UNIVERSAL GLOBAL =================
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

// ================= INICIALIZACIÓN DEL SITIO =================
document.addEventListener("DOMContentLoaded", () => {

  // Links de WhatsApp
  initWA();

  // Cargar preferencias globales de accesibilidad
  loadAccessibilityPreferences();

  // ===== Vincular Botón de Accesibilidad de forma segura para Móvil =====
  // Buscamos el botón flotante (ya sea por su onclick o por su icono de accesibilidad)
  const accessibilityBtn = document.querySelector("button[onclick*='toggleAccessibilityPanel']");
  if (accessibilityBtn) {
    const handleAccessibilityClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleAccessibilityPanel();
    };
    accessibilityBtn.addEventListener('click', handleAccessibilityClick);
    accessibilityBtn.addEventListener('touchend', handleAccessibilityClick);
  }

  // ===== Menú responsive optimizado para Celulares (Antitrabones) =====
  let mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuBtn && mobileMenu) {
    const newBtn = mobileMenuBtn.cloneNode(true);
    mobileMenuBtn.parentNode.replaceChild(newBtn, mobileMenuBtn);
    mobileMenuBtn = document.getElementById('mobile-menu-btn');

    let isMenuToggling = false;

    const toggleMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isMenuToggling) return;
      isMenuToggling = true;

      const isHidden = mobileMenu.classList.toggle('hidden');
      const mobileMenuIcon = document.getElementById('mobile-menu-icon');
      
      if (mobileMenuIcon) {
        mobileMenuIcon.className = isHidden ? "fas fa-bars" : "fas fa-times";
      }

      setTimeout(() => { isMenuToggling = false; }, 250);
    };

    mobileMenuBtn.addEventListener('click', toggleMenu);
    mobileMenuBtn.addEventListener('touchstart', toggleMenu);

    mobileMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        mobileMenu.classList.add('hidden');
        const mobileMenuIcon = document.getElementById('mobile-menu-icon');
        if (mobileMenuIcon) mobileMenuIcon.className = "fas fa-bars";
      });
    });

    document.addEventListener('click', (e) => {
      const btnRef = document.getElementById('mobile-menu-btn');
      const mobileMenuIcon = document.getElementById('mobile-menu-icon');
      if (mobileMenu && btnRef && !mobileMenu.contains(e.target) && !btnRef.contains(e.target) && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
        if (mobileMenuIcon) mobileMenuIcon.className = "fas fa-bars";
      }
    });
  }

});
