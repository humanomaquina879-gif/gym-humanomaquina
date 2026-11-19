(function () {
    'use strict';

    const GRUPOS = { pecho: 'Pecho', triceps: 'Tríceps', pierna: 'Pierna', espalda: 'Espalda', biceps: 'Bíceps' };
    const NUEVO = '__nuevo__';
    const ROJO = '#f87171', VERDE = '#34d399', AZUL = '#00d2ff';

    let prs = {};        // { id: { peso, reps, fecha } }  mejor marca
    let ultimas = {};    // { id: { peso, reps, fecha } }  última marca
    let catalogo = [];   // [{ id, nombre, grupo }]
    let focoPrevio = null;
    const historialAbierto = new Set();

    const $ = (id) => document.getElementById(id);

    // ---------- Utilidades ----------
    function slug(nombre) {
        return String(nombre)
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 60);
    }

    function bonito(id) {
        const t = id.replace(/_/g, ' ').trim();
        return t.charAt(0).toUpperCase() + t.slice(1);
    }

    function fmt(m) {
        const p = Number(m.peso) || 0, r = Number(m.reps) || 0;
        if (p && r) return `${p} kg × ${r}`;
        if (p) return `${p} kg`;
        return `${r} reps`;
    }

    function fechaCorta(f) {
        const m = String(f || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
    }

    // Lista de ejercicios tomada de las rutinas de la página
    function construirCatalogo() {
        const vistos = new Map();
        if (typeof variantesRutinas !== 'undefined') {
            Object.entries(variantesRutinas).forEach(([grupo, variantes]) => {
                variantes.forEach(v => v.forEach(([nombre]) => {
                    const id = slug(nombre);
                    if (id && !vistos.has(id)) vistos.set(id, { id, nombre, grupo });
                }));
            });
        }
        catalogo = [...vistos.values()];
    }

    function infoEjercicio(id) {
        const c = catalogo.find(x => x.id === id);
        return c ? { nombre: c.nombre, grupo: c.grupo } : { nombre: bonito(id), grupo: null };
    }

    function sesionExpirada() {
        alert('Tu sesión expiró. Inicia sesión de nuevo.');
        window.location.href = 'index';
    }

    // ---------- Estilos (propios, no dependen de Tailwind) ----------
    function inyectarEstilos() {
        if ($('prx-estilos')) return;
        const css = `
.prx-overlay{position:fixed;inset:0;z-index:10000;background:rgba(2,6,14,.82);display:none;align-items:center;justify-content:center;padding:1rem;overflow-y:auto;}
.prx-overlay.prx-abierto{display:flex;}
.prx-modal{width:100%;max-width:30rem;background:linear-gradient(160deg,#0a1326 0%,#060c18 100%);border:1px solid #00d2ff;border-radius:1rem;box-shadow:0 0 30px rgba(0,210,255,.25);padding:1.25rem;color:#f8fafc;font-family:'Inter',sans-serif;max-height:92vh;overflow-y:auto;box-sizing:border-box;}
.prx-head{display:flex;justify-content:space-between;align-items:center;gap:.5rem;}
.prx-modal h2,.prx-seccion h2{font-size:1.25rem;font-weight:900;text-transform:uppercase;font-style:italic;color:#fff;margin:0;}
.prx-x{background:none;border:none;color:#9ca3af;font-size:1.25rem;cursor:pointer;padding:.25rem .5rem;}
.prx-label{display:block;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#d1d5db;margin:1rem 0 .4rem;}
.prx-campo{width:100%;background:#050a14;border:1px solid #374151;border-radius:.6rem;color:#fff;padding:.7rem .8rem;font-size:1rem;font-family:inherit;box-sizing:border-box;}
.prx-campo:focus{outline:none;border-color:#00d2ff;box-shadow:0 0 0 2px rgba(0,210,255,.25);}
select.prx-campo option,select.prx-campo optgroup{background:#050a14;color:#fff;}
.prx-fila{display:flex;gap:.75rem;}
.prx-fila>div{flex:1;min-width:0;}
.prx-vacio{color:#9ca3af;font-size:.85rem;}
.prx-link{background:none;border:none;color:#00d2ff;font-weight:700;font-size:.75rem;cursor:pointer;padding:0;}
.prx-guardar{flex:1;background:#00d2ff;color:#050a14;border:2px solid #00d2ff;border-radius:.75rem;padding:.8rem 1rem;font-weight:900;font-size:.8rem;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;}
.prx-guardar:disabled{opacity:.6;cursor:default;}
.prx-cancelar{background:transparent;color:#9ca3af;border:1px solid #374151;border-radius:.75rem;padding:.8rem 1rem;font-weight:700;font-size:.8rem;cursor:pointer;}
.prx-mini{padding:.5rem 1rem;border-radius:.6rem;font-size:.75rem;font-weight:800;text-transform:uppercase;cursor:pointer;}
.prx-seccion{margin-top:2.5rem;background:linear-gradient(160deg,#0a1326 0%,#060c18 100%);border:1px solid #16284a;border-radius:1rem;padding:1.5rem;}
.prx-seccion-head{display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem;}
.prx-lista{list-style:none;margin:0;padding:0;}
.prx-grupo{font-size:.7rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#00d2ff;margin:1.1rem 0 .2rem;}
.prx-item{border-bottom:1px solid #1f2937;padding:.6rem 0;}
.prx-item-top{display:flex;justify-content:space-between;gap:.75rem;align-items:baseline;}
.prx-item-nombre{color:#e5e7eb;font-size:.9rem;}
.prx-item-pr{color:#34d399;font-weight:800;font-size:.9rem;white-space:nowrap;}
.prx-item-sub{display:flex;justify-content:space-between;gap:.75rem;font-size:.75rem;color:#9ca3af;margin-top:.2rem;flex-wrap:wrap;}
.prx-hist{margin-top:.5rem;padding-left:.75rem;border-left:2px solid #16284a;font-size:.78rem;color:#cbd5e1;}
.prx-hist-fila{display:flex;justify-content:space-between;align-items:center;gap:.5rem;padding:.2rem 0;}
.prx-borrar{background:none;border:none;color:#f87171;font-size:.75rem;cursor:pointer;font-weight:700;}
@media (max-width:480px){
  .prx-overlay{align-items:flex-end;padding:0;}
  .prx-modal{border-radius:1rem 1rem 0 0;max-height:94vh;}
}
body.high-contrast .prx-modal,body.high-contrast .prx-seccion{background:#111!important;border-color:#ff0!important;}
body.high-contrast .prx-modal *,body.high-contrast .prx-seccion *{color:#ff0!important;}
body.high-contrast .prx-campo{background:#000!important;border-color:#ff0!important;}
body.high-contrast .prx-guardar{background:#ff0!important;color:#000!important;border-color:#ff0!important;}
`;
        const st = document.createElement('style');
        st.id = 'prx-estilos';
        st.textContent = css;
        document.head.appendChild(st);
    }

    // ---------- Formulario (ventana) ----------
    function mensaje(texto, color) {
        const m = $('prx-msg');
        if (!m) return;
        m.textContent = texto || '';
        m.style.color = color || '#9ca3af';
    }

    function llenarSelect(seleccion) {
        const sel = $('prx-ejercicio');
        sel.innerHTML = '';
        sel.add(new Option('Selecciona un ejercicio...', ''));

        Object.entries(GRUPOS).forEach(([g, etiqueta]) => {
            const items = catalogo.filter(c => c.grupo === g)
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
            if (!items.length) return;
            const og = document.createElement('optgroup');
            og.label = etiqueta;
            items.forEach(c => og.appendChild(new Option(c.nombre, c.id)));
            sel.appendChild(og);
        });

        const propios = Object.keys(prs).filter(id => !catalogo.some(c => c.id === id));
        if (propios.length) {
            const og = document.createElement('optgroup');
            og.label = 'Mis ejercicios';
            propios.sort().forEach(id => og.appendChild(new Option(bonito(id), id)));
            sel.appendChild(og);
        }

        sel.appendChild(new Option('+ Crear nuevo PR', NUEVO));
        sel.value = seleccion || '';
    }

    function alCambiarEjercicio() {
        const v = $('prx-ejercicio').value;
        $('prx-nuevo-box').style.display = v === NUEVO ? 'block' : 'none';
        $('prx-nuevo-link').style.display = v === NUEVO ? 'none' : 'inline';
        const a = $('prx-actual');
        if (v && v !== NUEVO && prs[v]) a.textContent = `Tu PR actual: ${fmt(prs[v])}`;
        else if (v && v !== NUEVO) a.textContent = 'Aún no tienes marcas en este ejercicio.';
        else a.textContent = '';
        mensaje('');
    }

    function abrir() {
        crearModal();
        focoPrevio = document.activeElement;
        llenarSelect('');
        $('prx-peso').value = '';
        $('prx-reps').value = '';
        $('prx-nombre').value = '';
        alCambiarEjercicio();
        $('prx-overlay').classList.add('prx-abierto');
        document.body.style.overflow = 'hidden';
        setTimeout(() => $('prx-ejercicio').focus(), 50);
    }

    function cerrar() {
        const ov = $('prx-overlay');
        if (ov) ov.classList.remove('prx-abierto');
        document.body.style.overflow = '';
        if (focoPrevio && focoPrevio.focus) focoPrevio.focus();
    }

    async function guardar() {
        const sel = $('prx-ejercicio');
        let id = sel.value;
        if (!id) return mensaje('Elige un ejercicio de la lista.', ROJO);
        if (id === NUEVO) {
            id = slug($('prx-nombre').value);
            if (!id) return mensaje('Escribe el nombre del nuevo ejercicio.', ROJO);
        }

        const pesoTxt = $('prx-peso').value.trim().replace(',', '.');
        const repsTxt = $('prx-reps').value.trim();
        const peso = pesoTxt === '' ? 0 : parseFloat(pesoTxt);
        const reps = repsTxt === '' ? 0 : parseInt(repsTxt, 10);

        if (!Number.isFinite(peso) || peso < 0 || peso > 1000) return mensaje('El peso debe estar entre 0 y 1000 kg.', ROJO);
        if (!Number.isInteger(reps) || reps < 0 || reps > 100) return mensaje('Las repeticiones deben ser de 0 a 100.', ROJO);
        if (peso === 0 && reps === 0) return mensaje('Escribe el peso, las repeticiones o ambos.', ROJO);

        const btn = $('prx-guardar');
        btn.disabled = true;
        try {
            const res = await fetch('/api/marcas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ejercicio: id, peso, reps })
            });
            if (res.status === 401) return sesionExpirada();
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return mensaje(data.error || 'No se pudo guardar la marca.', ROJO);

            await cargarMarcas();

            $('prx-peso').value = '';
            $('prx-reps').value = '';
            $('prx-nombre').value = '';
            llenarSelect(id);
            alCambiarEjercicio();

            if (data.primera) mensaje('¡Primera marca registrada! 💪', VERDE);
            else if (data.esPR) mensaje(`🏆 ¡NUEVO PR! Superaste ${fmt(data.prAnterior)}.`, VERDE);
            else mensaje(`Marca guardada. Tu PR sigue en ${prs[id] ? fmt(prs[id]) : 'su valor anterior'}.`, AZUL);
        } catch (e) {
            mensaje('No se pudo conectar con el servidor. Intenta de nuevo.', ROJO);
        } finally {
            btn.disabled = false;
        }
    }

    function crearModal() {
        if ($('prx-overlay')) return;
        const ov = document.createElement('div');
        ov.id = 'prx-overlay';
        ov.className = 'prx-overlay';
        ov.innerHTML = `
<div class="prx-modal" role="dialog" aria-modal="true" aria-labelledby="prx-titulo">
  <div class="prx-head">
    <h2 id="prx-titulo">Registrar PR</h2>
    <button type="button" id="prx-cerrar" class="prx-x" aria-label="Cerrar">✕</button>
  </div>
  <form id="prx-form" novalidate>
    <label class="prx-label" for="prx-ejercicio">Ejercicio</label>
    <select id="prx-ejercicio" class="prx-campo"></select>
    <button type="button" id="prx-nuevo-link" class="prx-link" style="margin-top:.5rem;">¿No está tu ejercicio? Crear nuevo PR</button>

    <div id="prx-nuevo-box" style="display:none;">
      <label class="prx-label" for="prx-nombre">Nombre del nuevo ejercicio</label>
      <input id="prx-nombre" class="prx-campo" type="text" maxlength="50" placeholder="Ej. Hip thrust" autocomplete="off">
    </div>

    <p id="prx-actual" class="prx-vacio" style="margin:.75rem 0 0;"></p>

    <div class="prx-fila">
      <div>
        <label class="prx-label" for="prx-peso">Peso (kg)</label>
        <input id="prx-peso" class="prx-campo" type="number" inputmode="decimal" min="0" max="1000" step="0.5" placeholder="Ej. 60" autocomplete="off">
      </div>
      <div>
        <label class="prx-label" for="prx-reps">Repeticiones</label>
        <input id="prx-reps" class="prx-campo" type="number" inputmode="numeric" min="0" max="100" step="1" placeholder="Ej. 8" autocomplete="off">
      </div>
    </div>
    <p class="prx-vacio" style="margin:.5rem 0 0;font-size:.75rem;">Escribe el peso, las repeticiones o ambos.</p>

    <div id="prx-msg" role="status" aria-live="polite" style="min-height:1.25rem;margin-top:.75rem;font-size:.85rem;font-weight:700;"></div>

    <div style="display:flex;gap:.75rem;margin-top:1rem;">
      <button type="button" id="prx-cancelar" class="prx-cancelar">Cerrar</button>
      <button type="submit" id="prx-guardar" class="prx-guardar">Guardar PR</button>
    </div>
  </form>
</div>`;
        document.body.appendChild(ov);

        ov.addEventListener('click', (e) => { if (e.target === ov) cerrar(); });
        $('prx-cerrar').addEventListener('click', cerrar);
        $('prx-cancelar').addEventListener('click', cerrar);
        $('prx-ejercicio').addEventListener('change', alCambiarEjercicio);
        $('prx-nuevo-link').addEventListener('click', () => {
            $('prx-ejercicio').value = NUEVO;
            alCambiarEjercicio();
            $('prx-nombre').focus();
        });
        $('prx-form').addEventListener('submit', (e) => { e.preventDefault(); guardar(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && ov.classList.contains('prx-abierto')) cerrar();
        });
    }

    // ---------- Sección "Mis PRs" ----------
    function crearItem(id) {
        const pr = prs[id], ult = ultimas[id];
        const li = document.createElement('li');
        li.className = 'prx-item';

        const top = document.createElement('div');
        top.className = 'prx-item-top';
        const nombre = document.createElement('span');
        nombre.className = 'prx-item-nombre';
        nombre.textContent = infoEjercicio(id).nombre;
        const valor = document.createElement('span');
        valor.className = 'prx-item-pr';
        valor.textContent = `🏆 ${fmt(pr)}`;
        top.append(nombre, valor);

        const sub = document.createElement('div');
        sub.className = 'prx-item-sub';
        const info = document.createElement('span');
        let t = pr.fecha ? `PR del ${fechaCorta(pr.fecha)}` : '';
        if (ult && (ult.peso !== pr.peso || ult.reps !== pr.reps)) t += `${t ? ' · ' : ''}Última: ${fmt(ult)}`;
        info.textContent = t;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'prx-link';
        btn.textContent = historialAbierto.has(id) ? 'Ocultar historial' : 'Ver historial';
        sub.append(info, btn);

        const hist = document.createElement('div');
        hist.className = 'prx-hist';
        hist.style.display = 'none';

        btn.addEventListener('click', () => {
            if (historialAbierto.has(id)) {
                historialAbierto.delete(id);
                hist.style.display = 'none';
                btn.textContent = 'Ver historial';
            } else {
                historialAbierto.add(id);
                btn.textContent = 'Ocultar historial';
                cargarHistorial(id, hist);
            }
        });

        li.append(top, sub, hist);
        if (historialAbierto.has(id)) cargarHistorial(id, hist);
        return li;
    }

    async function cargarHistorial(id, cont) {
        cont.style.display = 'block';
        cont.textContent = 'Cargando...';
        try {
            const res = await fetch('/api/marcas/' + encodeURIComponent(id), { cache: 'no-store' });
            if (!res.ok) throw new Error('fallo');
            const filas = await res.json();
            cont.textContent = '';
            if (!filas.length) { cont.textContent = 'Sin registros.'; return; }
            filas.forEach(f => {
                const fila = document.createElement('div');
                fila.className = 'prx-hist-fila';
                const txt = document.createElement('span');
                txt.textContent = `${fmt(f)} · ${fechaCorta(f.fecha)}`;
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'prx-borrar';
                del.textContent = 'Borrar';
                del.addEventListener('click', () => borrarMarca(f.id));
                fila.append(txt, del);
                cont.appendChild(fila);
            });
        } catch (e) {
            cont.textContent = 'No se pudo cargar el historial.';
        }
    }

    async function borrarMarca(idMarca) {
        if (!confirm('¿Borrar este registro?')) return;
        try {
            const res = await fetch('/api/marcas/' + encodeURIComponent(idMarca), { method: 'DELETE' });
            if (res.status === 401) return sesionExpirada();
            if (!res.ok) return alert('No se pudo borrar el registro.');
            await cargarMarcas();
        } catch (e) {
            alert('No se pudo conectar con el servidor.');
        }
    }

    function renderLista() {
        const ul = $('prx-lista'), vacio = $('prx-vacio');
        if (!ul) return;
        historialAbierto.forEach(i => { if (!prs[i]) historialAbierto.delete(i); });
        ul.innerHTML = '';

        const ids = Object.keys(prs);
        if (vacio) vacio.style.display = ids.length ? 'none' : 'block';

        const grupos = {};
        ids.forEach(id => {
            const g = infoEjercicio(id).grupo || 'otros';
            (grupos[g] = grupos[g] || []).push(id);
        });

        [...Object.keys(GRUPOS), 'otros'].forEach(g => {
            if (!grupos[g]) return;
            const titulo = document.createElement('li');
            titulo.className = 'prx-grupo';
            titulo.textContent = g === 'otros' ? 'Mis ejercicios' : GRUPOS[g];
            ul.appendChild(titulo);
            grupos[g]
                .sort((a, b) => infoEjercicio(a).nombre.localeCompare(infoEjercicio(b).nombre, 'es'))
                .forEach(id => ul.appendChild(crearItem(id)));
        });
    }

    async function cargarMarcas() {
        try {
            const res = await fetch('/api/mi-rutina', { cache: 'no-store' });
            if (!res.ok) return; // sin sesión: la página ya se encarga de mandar a index
            const data = await res.json();
            prs = data.prs || {};
            ultimas = data.ultimas || {};
            renderLista();
        } catch (e) { /* sin conexión: se queda como está */ }
    }

    // ---------- Botones y sección en la página ----------
    function crearBotonSuperior() {
        if ($('prx-abrir')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'prx-abrir';
        btn.className = 'btn-neon-outline';
        btn.style.cssText = 'padding:.75rem 1.5rem;border-radius:.75rem;font-weight:900;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;display:inline-flex;align-items:center;gap:.5rem;cursor:pointer;';
        btn.innerHTML = '<i class="fas fa-trophy"></i> Registrar PR';
        btn.addEventListener('click', abrir);

        const gen = document.querySelector('button[onclick="generarNuevaRutina()"]');
        if (gen && gen.parentElement) {
            const cont = gen.parentElement;
            cont.style.display = 'flex';
            cont.style.flexWrap = 'wrap';
            cont.style.justifyContent = 'center';
            cont.style.gap = '.75rem';
            cont.appendChild(btn);
        } else {
            const main = document.querySelector('main');
            if (main) main.insertBefore(btn, main.firstChild);
        }
    }

    function crearSeccion() {
        if ($('prx-mis-prs')) return;
        const main = document.querySelector('main');
        if (!main) return;
        const sec = document.createElement('section');
        sec.id = 'prx-mis-prs';
        sec.className = 'prx-seccion';
        sec.innerHTML =
            '<div class="prx-seccion-head">' +
                '<h2><i class="fas fa-trophy" style="color:#facc15;"></i> Mis PRs</h2>' +
                '<button type="button" id="prx-abrir-2" class="btn-neon-outline prx-mini">+ Registrar PR</button>' +
            '</div>' +
            '<p id="prx-vacio" class="prx-vacio">Aún no tienes PRs registrados. Toca «Registrar PR» para guardar el primero.</p>' +
            '<ul id="prx-lista" class="prx-lista"></ul>';
        main.appendChild(sec);
        $('prx-abrir-2').addEventListener('click', abrir);
    }

    function iniciar() {
        inyectarEstilos();
        construirCatalogo();
        crearBotonSuperior();
        crearSeccion();
        crearModal();
        cargarMarcas();
        window.addEventListener('pageshow', (e) => { if (e.persisted) cargarMarcas(); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
