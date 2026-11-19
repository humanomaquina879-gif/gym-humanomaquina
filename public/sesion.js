/* ============================================================
   KRONOX GYM - sesion.js
   Conecta el login, el registro y el cierre de sesión de TODAS
   las páginas con el servidor (/api/login, /api/registro,
   /api/yo y /api/logout).

   Se carga al FINAL de cada página, después de comun.js y
   del <script> de la página:
       <script src="/sesion.js"></script>

   - Reemplaza handleLogin, logoutUser, checkUserSession y
     openLoginModal por versiones que validan en el servidor.
   - Cada página sigue pintando su propio menú (usa la función
     de pintado registrada en cada vista); aquí solo se decide
     QUIÉN tiene sesión de verdad.
   ============================================================ */
(function () {
    'use strict';

    const $ = id => document.getElementById(id);
    const CLAVE = 'kronox_logged_user';

    let modoRegistro = false;
    let enviando = false;
    let ultimoUsuarioServidor = undefined;

    // ---- Copia local del usuario (solo para que cada página pinte su menú) ----
    const leerLocal = () => { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } };
    const guardarLocal = u => {
        try { if (u) localStorage.setItem(CLAVE, u); else localStorage.removeItem(CLAVE); } catch (e) {}
    };

    // Referencia original previa a sobrescribir funciones globales
    const pintarMenuBase = typeof window.checkUserSession === 'function' ? window.checkUserSession : function () {};
    const abrirModalOriginal = typeof window.openLoginModal === 'function' ? window.openLoginModal : null;

    // Permite que una vista (como rutinas.html) defina su propio pintado/candado sin bucles
    let pintarMenuVista = pintarMenuBase;
    window.registrarPintadoMenu = function (fn) {
        if (typeof fn !== 'function') return;
        pintarMenuVista = fn;
        ejecutarPintado();
    };

    function ejecutarPintado() {
        pintarMenuVista();
    }

    // ---- Pregunta al servidor quién tiene sesión ----
    // Devuelve: nombre de usuario | null (sin sesión) | undefined (no se pudo consultar)
    async function consultarSesion() {
        try {
            const r = await fetch('/api/yo', { cache: 'no-store' });
            if (r.ok) {
                const d = await r.json();
                return d.usuario || null;
            }
            if (r.status === 401) return null;
        } catch (e) { /* sin conexión */ }
        return undefined;
    }

    // ---- Interfaz del modal: mensaje de error y cambio Iniciar sesión / Crear cuenta ----
    let elError = null, elToggle = null, tituloOriginal = '', subOriginal = '', botonOriginal = '';

    function prepararModal() {
        const modal = $('login-modal');
        const form = modal && modal.querySelector('form');
        if (!modal || !form || $('sesion-error')) return;

        const titulo = modal.querySelector('h2');
        const sub = modal.querySelector('p');
        const boton = form.querySelector('button[type="submit"]');
        tituloOriginal = titulo ? titulo.innerHTML : '';
        subOriginal = sub ? sub.textContent : '';
        botonOriginal = boton ? boton.textContent : '';

        elError = document.createElement('div');
        elError.id = 'sesion-error';
        elError.style.cssText = 'display:none;color:#f87171;font-size:12px;font-weight:700;text-align:center;line-height:1.4;';
        if (boton) boton.parentNode.insertBefore(elError, boton); else form.appendChild(elError);

        elToggle = document.createElement('button');
        elToggle.type = 'button';
        elToggle.id = 'sesion-toggle';
        elToggle.style.cssText = 'display:block;margin:16px auto 0;background:none;border:none;color:#00d2ff;font-size:12px;font-weight:700;cursor:pointer;text-decoration:underline;';
        elToggle.addEventListener('click', () => { setModo(!modoRegistro); mostrarError(''); });
        form.insertAdjacentElement('afterend', elToggle);

        setModo(false);
    }

    function setModo(registro) {
        modoRegistro = !!registro;
        const modal = $('login-modal');
        if (!modal) return;
        const titulo = modal.querySelector('h2');
        const sub = modal.querySelector('p');
        const boton = modal.querySelector('form button[type="submit"]');
        const pass = $('login-pass');

        if (titulo) titulo.innerHTML = modoRegistro ? 'Crear <span style="color:#00d2ff">Cuenta</span>' : tituloOriginal;
        if (sub) sub.textContent = modoRegistro
            ? 'Elige un usuario y una contraseña de al menos 6 caracteres. Tu usuario es único: solo tú podrás entrar con él.'
            : subOriginal;
        if (boton) boton.textContent = modoRegistro ? 'Crear cuenta y entrar' : botonOriginal;
        if (pass) pass.setAttribute('autocomplete', modoRegistro ? 'new-password' : 'current-password');
        if (elToggle) elToggle.textContent = modoRegistro ? '¿Ya tienes cuenta? Iniciar sesión' : '¿No tienes cuenta? Crear cuenta';
    }

    function mostrarError(texto) {
        if (!elError) return;
        elError.textContent = texto || '';
        elError.style.display = texto ? 'block' : 'none';
    }

    // ---- Funciones que usa cada página (reemplazan a las anteriores) ----
    window.openLoginModal = function () {
        prepararModal();
        setModo(false);
        mostrarError('');
        if (abrirModalOriginal) abrirModalOriginal();
        else { const m = $('login-modal'); if (m) m.classList.remove('hidden'); }
    };

    window.handleLogin = async function (e) {
        if (e && e.preventDefault) e.preventDefault();
        if (enviando) return;

        const usuario = ($('login-user').value || '').trim();
        const password = $('login-pass').value || '';
        const boton = $('login-modal').querySelector('form button[type="submit"]');

        enviando = true;
        if (boton) { boton.disabled = true; boton.style.opacity = '0.6'; }
        mostrarError('');

        try {
            const res = await fetch(modoRegistro ? '/api/registro' : '/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario, password })
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                mostrarError(data.error || 'No se pudo completar la operación.');
                return;
            }

            const usuarioFinal = data.usuario || usuario;
            guardarLocal(usuarioFinal);
            ultimoUsuarioServidor = usuarioFinal;
            $('login-pass').value = '';
            const modal = $('login-modal');
            if (modal) modal.classList.add('hidden');
            ejecutarPintado();

            if (typeof planPendienteTrasLogin !== 'undefined' && planPendienteTrasLogin && typeof abrirModalPlanDirecto === 'function') {
                const plan = planPendienteTrasLogin;
                planPendienteTrasLogin = null;
                abrirModalPlanDirecto(plan);
            }
        } catch (err) {
            mostrarError('No se pudo conectar con el servidor. Intenta de nuevo.');
        } finally {
            enviando = false;
            if (boton) { boton.disabled = false; boton.style.opacity = '1'; }
        }
    };

    window.logoutUser = async function () {
        try { await fetch('/api/logout', { method: 'POST' }); } catch (e) {}
        guardarLocal(null);
        ultimoUsuarioServidor = null;
        ['user-dropdown-menu', 'mobile-user-dropdown'].forEach(id => {
            const d = $(id);
            if (d) d.classList.add('hidden');
        });
        if (typeof window.onLogoutVista === 'function') {
            window.onLogoutVista();
            return;
        }
        ejecutarPintado();
    };

    // Pinta con lo guardado y luego confirma con el servidor
    window.checkUserSession = async function () {
        ejecutarPintado();
        const usuario = await consultarSesion();
        if (usuario === undefined) return; // no se pudo consultar: no se cambia nada
        const antes = leerLocal() || null;
        guardarLocal(usuario);
        if (antes !== usuario || ultimoUsuarioServidor !== usuario) {
            ultimoUsuarioServidor = usuario;
            ejecutarPintado();
        }
    };

    // ---- Arranque ----
    function iniciar() {
        prepararModal();
        window.checkUserSession();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
