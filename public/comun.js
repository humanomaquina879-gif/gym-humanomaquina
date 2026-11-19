// ==========================================================
// SERVICE WORKER (registro y actualización limpia)
// ==========================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(reg => {
                if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                reg.addEventListener('updatefound', () => {
                    const nuevoWorker = reg.installing;
                    if (!nuevoWorker) return;
                    nuevoWorker.addEventListener('statechange', () => {
                        if (nuevoWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            nuevoWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });
            })
            .catch(err => console.error('Error al registrar Service Worker:', err));
    });
}

// ==========================================================
// UTILIDADES (atajos y localStorage seguro)
// ==========================================================
const $ = id => document.getElementById(id);
const toggleHidden = id => { const e = $(id); if (e) e.classList.toggle('hidden'); };
const show = (el, v) => { if (el) el.classList.toggle('hidden', !v); };

const ls = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
    del: k => { try { localStorage.removeItem(k); } catch (e) {} }
};

// ==========================================================
// INYECCIÓN DE FILTROS SVG, LECTOR UI, PANEL Y LOGIN
// ==========================================================
function inyectarElementosComunes() {
    if (!document.getElementById('kronox-svg-filters')) {
        const svgWrap = document.createElement('div');
        svgWrap.id = 'kronox-svg-filters';
        svgWrap.innerHTML = `<svg style="display:none;"><filter id="protanopia-filter"><feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0  0.558, 0.442, 0, 0, 0  0, 0.242, 0.758, 0, 0  0, 0, 0, 1, 0"/></filter><filter id="deuteranopia-filter"><feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0  0.7, 0.3, 0, 0, 0  0, 0.3, 0.7, 0, 0  0, 0, 0, 1, 0"/></filter><filter id="tritanopia-filter"><feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0  0, 0.433, 0.567, 0, 0  0, 0.475, 0.525, 0, 0  0, 0, 0, 1, 0"/></filter></svg>`;
        document.body.prepend(svgWrap);
    }

    if (!document.getElementById('speech-subtitle-box')) {
        const subBox = document.createElement('div');
        subBox.id = 'speech-subtitle-box';
        subBox.innerHTML = `<i class="fas fa-volume-high text-cyan-400 mr-2"></i><span id="subtitle-text">Reproduciendo audio...</span>`;
        document.body.prepend(subBox);
    }

    if (!document.getElementById('btn-escuchar')) {
        const btnEsc = document.createElement('button');
        btnEsc.id = 'btn-escuchar';
        btnEsc.type = 'button';
        btnEsc.onclick = hablarTextoPendiente;
        btnEsc.innerHTML = `<i class="fas fa-volume-high"></i> Escuchar`;
        document.body.prepend(btnEsc);
    }

    if (!document.getElementById('accessibility-panel')) {
        const accWrap = document.createElement('div');
        accWrap.className = 'fixed top-6 left-6 z-50';
        accWrap.innerHTML = `<button onclick="toggleAccessibilityPanel()" title="Accesibilidad Universal" class="bg-[#111827] border border-red-600/60 text-red-500 hover:bg-red-600 hover:text-white p-3.5 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center"><i class="fas fa-universal-access text-xl"></i></button><div id="accessibility-panel" class="hidden absolute top-16 left-0 w-80 bg-[#141d2f] border border-red-600/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-5 text-gray-200 accessibility-panel"><div class="flex justify-between items-center border-b border-red-600/50 pb-2"><span class="text-sm font-bold uppercase text-red-500 tracking-wider">Accesibilidad Universal</span><button onclick="toggleAccessibilityPanel()" class="text-gray-400 hover:text-white font-bold"><i class="fas fa-times"></i></button></div><div><label class="block text-xs font-bold text-gray-300 uppercase mb-2">Tamaño de letra</label><div class="flex gap-2"><button onclick="adjustFontSize(-2)" class="flex-1 bg-[#1f293d] hover:bg-red-600 hover:text-white border border-gray-700 py-2 rounded-lg font-bold text-sm transition-colors">A-</button><button onclick="resetFontSize()" class="flex-1 bg-red-600 text-white border border-red-500 py-2 rounded-lg font-bold text-sm transition-colors">A</button><button onclick="adjustFontSize(2)" class="flex-1 bg-[#1f293d] hover:bg-red-600 hover:text-white border border-gray-700 py-2 rounded-lg font-bold text-sm transition-colors">A+</button></div></div><div><label class="block text-xs font-bold text-gray-300 uppercase mb-2">Visión de Color</label><div class="grid grid-cols-2 gap-2 text-xs"><button onclick="setDaltonism('none')" id="btn-dalton-none" class="bg-red-600 text-white font-semibold py-2 px-3 rounded-lg border border-red-500 transition-all text-center">Ninguno</button><button onclick="setDaltonism('protanopia')" id="btn-dalton-protanopia" class="bg-[#1f293d] hover:bg-red-600/50 text-gray-300 font-semibold py-2 px-3 rounded-lg border border-gray-700 transition-all text-center">Protanopía</button><button onclick="setDaltonism('deuteranopia')" id="btn-dalton-deuteranopia" class="bg-[#1f293d] hover:bg-red-600/50 text-gray-300 font-semibold py-2 px-3 rounded-lg border border-gray-700 transition-all text-center">Deuteranopía</button><button onclick="setDaltonism('tritanopia')" id="btn-dalton-tritanopia" class="bg-[#1f293d] hover:bg-red-600/50 text-gray-300 font-semibold py-2 px-3 rounded-lg border border-gray-700 transition-all text-center">Tritanopía</button></div></div><div><label class="block text-xs font-bold text-gray-300 uppercase mb-2">Contraste</label><button onclick="toggleHighContrast()" id="btn-high-contrast" class="w-full bg-[#1f293d] hover:bg-red-600/50 border border-gray-700 text-gray-200 py-2.5 rounded-lg text-xs font-semibold transition-colors text-center">Activar Alto Contraste</button></div><div><label class="block text-xs font-bold text-gray-300 uppercase mb-2">Lector de Voz</label><button onclick="toggleSpeechReader()" id="btn-speech-toggle" class="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"><i class="fas fa-volume-high"></i> Activar Lector Interactivo</button></div></div>`;
        document.body.insertBefore(accWrap, document.body.children[3] || null);
    }

    if (!document.getElementById('login-modal')) {
        const loginMod = document.createElement('div');
        loginMod.id = 'login-modal';
        loginMod.className = 'hidden fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md';
        loginMod.innerHTML = `<div class="kronox-card p-8 max-w-md w-full border border-kronox-accent/40 shadow-2xl relative"><button onclick="closeLoginModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white font-bold text-lg"><i class="fas fa-times"></i></button><h2 class="text-2xl font-black text-white uppercase italic mb-2 text-center">Iniciar <span class="text-kronox-accent">Sesión</span></h2><p id="login-modal-subtitle" class="text-gray-400 text-xs mb-6 text-center">Ingresa tu cuenta para adquirir planes, desbloquear rutinas y guardar tus datos.</p><form onsubmit="handleLogin(event)" class="space-y-4"><div><label class="block text-xs font-bold text-kronox-accent uppercase mb-1">Correo o Usuario</label><input type="text" id="login-user" required placeholder="ej. socio@kronox.com" class="w-full bg-[#050a14] border border-kronox-cardBorder rounded-lg px-4 py-2.5 text-white text-sm focus:border-kronox-accent focus:outline-none"></div><div><label class="block text-xs font-bold text-kronox-accent uppercase mb-1">Contraseña</label><input type="password" id="login-pass" required placeholder="••••••••" class="w-full bg-[#050a14] border border-kronox-cardBorder rounded-lg px-4 py-2.5 text-white text-sm focus:border-kronox-accent focus:outline-none"></div><button type="submit" class="w-full btn-neon-solid py-3 rounded-lg font-black text-xs uppercase tracking-wider">Entrar al Sistema</button></form></div>`;
        document.body.insertBefore(loginMod, document.body.children[4] || null);
    }
}

inyectarElementosComunes();

// ==========================================================
// INICIO (carga de la página y eventos globales)
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
    inyectarElementosComunes();
    checkUserSession();
    loadAccessibilityPreferences();

    const menu = $('mobile-menu'), menuBtn = $('mobile-menu-btn'), menuIcon = $('mobile-menu-icon');
    const cerrarMenuMovil = () => {
        if (!menu) return;
        menu.classList.add('hidden');
        if (menuIcon) menuIcon.className = "fas fa-bars pointer-events-none";
    };

    if (menu) menu.querySelectorAll("a").forEach(link => link.addEventListener("click", cerrarMenuMovil));

    document.addEventListener('click', e => {
        [['user-dropdown-menu', '#user-session-info'], ['mobile-user-dropdown', '#mobile-user-container']].forEach(([id, parent]) => {
            const d = $(id);
            if (d && !d.classList.contains('hidden') && !e.target.closest(parent)) d.classList.add('hidden');
        });
        if (menu && !menu.classList.contains('hidden') && !menu.contains(e.target) && !(menuBtn && menuBtn.contains(e.target))) cerrarMenuMovil();
    });
});

window.addEventListener('storage', e => {
    if (!e.key) return;
    if (e.key === 'kronox_logged_user') checkUserSession();
    if (e.key.startsWith('kronox_')) loadAccessibilityPreferences();
});
window.addEventListener('pageshow', () => { checkUserSession(); loadAccessibilityPreferences(); });

// ==========================================================
// MENÚS (móvil y desplegables de usuario)
// ==========================================================
function toggleMobileMenu() {
    const menu = $('mobile-menu'), icon = $('mobile-menu-icon');
    if (!menu) return;
    menu.classList.toggle('hidden');
    if (icon) icon.className = menu.classList.contains('hidden') ? "fas fa-bars pointer-events-none" : "fas fa-times pointer-events-none";
}
function toggleUserDropdown(e) { e.stopPropagation(); toggleHidden('user-dropdown-menu'); }
function toggleMobileUserDropdown(e) { e.stopPropagation(); toggleHidden('mobile-user-dropdown'); }

// ==========================================================
// SESIÓN, LOGIN Y ACCESO ADMIN
// ==========================================================
function openLoginModal() { const m = $('login-modal'); if (m) m.classList.remove('hidden'); }
function closeLoginModal() { const m = $('login-modal'); if (m) m.classList.add('hidden'); }

function handleLogin(e) {
    e.preventDefault();
    ls.set('kronox_logged_user', $('login-user').value);
    closeLoginModal();
    checkUserSession();
    if (typeof planPendienteTrasLogin !== 'undefined' && planPendienteTrasLogin && typeof abrirModalPlanDirecto === 'function') {
        const plan = planPendienteTrasLogin;
        planPendienteTrasLogin = null;
        abrirModalPlanDirecto(plan);
    }
}

function logoutUser() {
    ls.del('kronox_logged_user');
    ['user-dropdown-menu', 'mobile-user-dropdown'].forEach(id => { const d = $(id); if (d) d.classList.add('hidden'); });
    checkUserSession();
}

function checkUserSession() {
    const user = ls.get('kronox_logged_user'), on = !!user;
    const isAdmin = on && user.toLowerCase() === 'admin';
    const userInfo = $('user-session-info'), mobileUser = $('mobile-user-container');

    show($('nav-rutinas'), on);
    show($('mobile-nav-rutinas'), on);
    show($('nav-admin-panel'), isAdmin);
    show($('mobile-nav-admin-panel'), isAdmin);
    show($('btn-open-login'), !on);
    show($('mobile-btn-login'), !on);
    show(userInfo, on);
    if (userInfo) userInfo.classList.toggle('flex', on);
    show(mobileUser, on);

    if (on) {
        if (userInfo) {
            if ($('welcome-user-name')) $('welcome-user-name').innerText = user.split('@')[0];
            if ($('dropdown-user-email')) $('dropdown-user-email').innerText = user;
        }
        if (mobileUser && $('mobile-welcome-name')) $('mobile-welcome-name').innerText = user;
    }
}

// ==========================================================
// COPIADO Y AVISOS FLOTANTES
// ==========================================================
function copiarTextoSeguro(texto, mensajeExito) {
    if (!texto) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto)
            .then(() => mostrarNotificacionKronox(mensajeExito))
            .catch(() => copiarPorSeleccion(texto, mensajeExito));
    } else {
        copiarPorSeleccion(texto, mensajeExito);
    }
}

function copiarPorSeleccion(texto, mensajeExito) {
    try {
        const area = document.createElement('textarea');
        area.value = texto;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
        mostrarNotificacionKronox(mensajeExito);
    } catch (e) {
        mostrarNotificacionKronox('Mantén presionado el folio para copiarlo.');
    }
}

function mostrarNotificacionKronox(mensaje) {
    let notif = $('kronox-toast-notification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'kronox-toast-notification';
        notif.style.cssText = "position:fixed; bottom:30px; right:30px; background:#091122; border:2px solid #00d2ff; color:#fff; padding:16px 24px; border-radius:12px; font-size:14px; font-weight:bold; z-index:99999; box-shadow:0 0 25px rgba(0,210,255,0.5); transition: opacity 0.5s ease; display:flex; align-items:center; gap:12px; pointer-events:none; max-width:90vw;";
        document.body.appendChild(notif);
    }
    notif.innerHTML = `<i class="fas fa-check-circle text-cyan-400 text-xl"></i> <span>${mensaje}</span>`;
    notif.style.opacity = '1';
    setTimeout(() => { notif.style.opacity = '0'; }, 7000);
}

// ==========================================================
// ACCESIBILIDAD (panel, tamaño, daltonismo, contraste)
// ==========================================================
function toggleAccessibilityPanel() { toggleHidden('accessibility-panel'); }

let currentFontSize = 100;
function applyFontSize(size) {
    currentFontSize = size;
    document.documentElement.style.fontSize = `${size}%`;
}
function adjustFontSize(amount) {
    const size = Math.min(200, Math.max(70, currentFontSize + amount));
    applyFontSize(size);
    ls.set('kronox_font_size', size);
}
function resetFontSize() { applyFontSize(100); ls.set('kronox_font_size', 100); }

const DALTON_TYPES = ['none', 'protanopia', 'deuteranopia', 'tritanopia'];
const ACTIVE_BTN = ['bg-red-600', 'text-white', 'border-red-500'];
const IDLE_BTN = ['bg-[#1f293d]', 'text-gray-300', 'border-gray-700'];

function applyDaltonism(type) {
    if (!DALTON_TYPES.includes(type)) type = 'none';
    const wrapper = $('page-wrapper');
    if (wrapper) {
        wrapper.classList.remove('daltonism-protanopia', 'daltonism-deuteranopia', 'daltonism-tritanopia');
        if (type !== 'none') wrapper.classList.add(`daltonism-${type}`);
    }
    DALTON_TYPES.forEach(t => {
        const btn = $(`btn-dalton-${t}`);
        if (!btn) return;
        btn.classList.remove(...(t === type ? IDLE_BTN : ACTIVE_BTN));
        btn.classList.add(...(t === type ? ACTIVE_BTN : IDLE_BTN));
    });
}
function setDaltonism(type) { applyDaltonism(type); ls.set('kronox_daltonism', type); }

function applyHighContrast(enabled) {
    document.body.classList.toggle('high-contrast', enabled);
    const btn = $('btn-high-contrast');
    if (btn) {
        ACTIVE_BTN.forEach(c => btn.classList.toggle(c, enabled));
        btn.textContent = enabled ? 'Desactivar Alto Contraste' : 'Activar Alto Contraste';
    }
}
function toggleHighContrast() {
    const enabled = !document.body.classList.contains('high-contrast');
    applyHighContrast(enabled);
    ls.set('kronox_high_contrast', enabled ? 'enabled' : 'disabled');
}

// ==========================================================
// LECTOR DE VOZ (activar/desactivar y aviso)
// ==========================================================
let speechActive = false;

function toggleSpeechReader() {
    speechActive = !speechActive;
    ls.set('kronox_speech_active', speechActive ? 'enabled' : 'disabled');
    actualizarEstadoLectorUI(true);
}

function actualizarEstadoLectorUI(mostrarAviso) {
    const btn = $('btn-speech-toggle');

    if (speechActive) {
        if (btn) {
            btn.innerHTML = `<i class="fas fa-volume-xmark"></i> Desactivar Lector`;
            btn.classList.replace('bg-cyan-600', 'bg-red-600');
        }
    } else {
        if (btn) {
            btn.innerHTML = `<i class="fas fa-volume-high"></i> Activar Lector Interactivo`;
            btn.classList.replace('bg-red-600', 'bg-cyan-600');
        }
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if ($('speech-subtitle-box')) $('speech-subtitle-box').style.display = 'none';
        if ($('btn-escuchar')) $('btn-escuchar').style.display = 'none';
        _ultimoTextoLeido = '';
        _textoPendiente = '';
    }

    if (!mostrarAviso) return;

    let aviso = $('toast-aviso-accesibilidad');
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'toast-aviso-accesibilidad';
        aviso.style.cssText = "position:fixed; top:20px; right:20px; background:#091122; border:2px solid #00d2ff; color:#fff; padding:12px 20px; border-radius:12px; font-size:13px; z-index:99999; box-shadow:0 0 20px rgba(0,210,255,0.4); transition: opacity 0.5s ease; pointer-events:none;";
        document.body.appendChild(aviso);
    }
    aviso.innerHTML = speechActive
        ? `<i class="fas fa-info-circle text-cyan-400 mr-2"></i> Lector interactivo activado.`
        : `<i class="fas fa-info-circle text-red-400 mr-2"></i> Lector desactivado.`;
    aviso.style.opacity = '1';

    clearTimeout(aviso._t);
    aviso._t = setTimeout(() => {
        aviso.style.opacity = '0';
        setTimeout(() => { if (aviso.style.opacity === '0') aviso.remove(); }, 500);
    }, 3000);
}

// ==========================================================
// LECTURA DEL TEXTO SELECCIONADO (PC y celular)
// ==========================================================
const ES_TACTIL = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
let _selTimer = null, _ocultarBtnTimer = null, _ultimoTextoLeido = '', _textoPendiente = '', _utteranceActual = null;

if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

function elementoExcluido(node) {
    const el = node && (node.nodeType === 1 ? node : node.parentElement);
    return !!(el && el.closest('header, #accessibility-panel, #speech-subtitle-box, #btn-escuchar, #login-modal, #modal-plan, #modal-folio'));
}

function obtenerVozEspanol() {
    const voces = window.speechSynthesis.getVoices();
    return voces.find(v => v.lang === 'es-MX') || voces.find(v => v.lang && v.lang.toLowerCase().startsWith('es')) || null;
}

function hablar(texto, conDemora) {
    if (!('speechSynthesis' in window) || !texto) return;

    const box = $('speech-subtitle-box'), subtitleText = $('subtitle-text');
    if (subtitleText && box) {
        subtitleText.innerText = texto;
        box.style.display = 'block';
    }
    const ocultar = () => { if (box) box.style.display = 'none'; };

    const iniciar = () => {
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = 'es-MX';
        const voz = obtenerVozEspanol();
        if (voz) { u.voice = voz; u.lang = voz.lang; }
        u.rate = 1;
        u.volume = 1;
        u.onend = ocultar;
        u.onerror = ev => {
            if (subtitleText) subtitleText.innerText = 'Audio no disponible (' + (ev.error || 'error') + ')';
            setTimeout(ocultar, 3000);
        };
        _utteranceActual = u;
        window.speechSynthesis.speak(u);
    };

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel();

    if (conDemora) setTimeout(iniciar, 60); else iniciar();
}

function hablarTextoPendiente() { hablar(_textoPendiente, false); }

function leerTextoSeleccionado() {
    if (!speechActive || !('speechSynthesis' in window)) return;

    const sel = window.getSelection();
    const texto = sel ? sel.toString().trim() : '';
    const btn = $('btn-escuchar');

    if (texto.length < 2) {
        _ultimoTextoLeido = '';
        if (btn && ES_TACTIL) {
            clearTimeout(_ocultarBtnTimer);
            _ocultarBtnTimer = setTimeout(() => { btn.style.display = 'none'; }, 4000);
        }
        return;
    }
    if (elementoExcluido(sel.anchorNode)) return;
    if (texto === _ultimoTextoLeido) return;

    _ultimoTextoLeido = texto;
    _textoPendiente = texto;

    if (ES_TACTIL) {
        clearTimeout(_ocultarBtnTimer);
        if (btn) btn.style.display = 'flex';
    } else {
        hablar(texto, true);
    }
}

document.addEventListener('selectionchange', () => {
    clearTimeout(_selTimer);
    _selTimer = setTimeout(leerTextoSeleccionado, 600);
});

// ==========================================================
// CARGAR PREFERENCIAS GUARDADAS
// ==========================================================
function loadAccessibilityPreferences() {
    applyFontSize(parseInt(ls.get('kronox_font_size'), 10) || 100);
    applyDaltonism(ls.get('kronox_daltonism') || 'none');
    applyHighContrast(ls.get('kronox_high_contrast') === 'enabled');
    speechActive = ls.get('kronox_speech_active') === 'enabled';
    actualizarEstadoLectorUI(false);
}
