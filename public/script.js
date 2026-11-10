// ================= 4. LECTOR DE VOZ OPTIMIZADO (ANTITRABONES) =================
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
    const mensaje = "Lector interactivo activado. Selecciona cualquier texto para escucharlo.";
    
    avisoFlotante.innerHTML = `<i class="fas fa-info-circle text-cyan-400 mr-2"></i> ${mensaje}`;
    avisoFlotante.style.opacity = '1';
    setTimeout(() => { avisoFlotante.style.opacity = '0'; }, 4000);

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
    setTimeout(() => { avisoFlotante.style.opacity = '0'; }, 3000);
  }
}

function leerTextoSeleccionado(e) {
  if (!speechActive) return;

  // EVITAR QUE SE ACTIVE SI TOCAS BOTONES, MENÚS O ENLACES
  if (e && e.target && (e.target.closest('button') || e.target.closest('a') || e.target.closest('nav') || e.target.closest('#accessibility-panel'))) {
    return;
  }

  // Limpiar temporizador anterior para evitar acumulación (Debounce)
  if (speechTimeout) clearTimeout(speechTimeout);

  speechTimeout = setTimeout(() => {
    const seleccion = window.getSelection();
    const textoSeleccionado = seleccion.toString().trim();

    if (textoSeleccionado.length > 2) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textoSeleccionado);
      utterance.lang = 'es-MX';
      
      const subtitleBox = document.getElementById('speech-subtitle-box');
      const subtitleText = document.getElementById('subtitle-text');
      if (subtitleText && subtitleBox) {
        subtitleText.innerText = textoSeleccionado;
        subtitleBox.style.display = 'block';
      }

      utterance.onend = () => { 
        if (subtitleBox) subtitleBox.style.display = 'none'; 
      };
      window.speechSynthesis.speak(utterance);
    }
  }, 300);
}

// Eventos globales controlados
document.addEventListener('mouseup', leerTextoSeleccionado);
document.addEventListener('touchend', leerTextoSeleccionado);
