(function () {
    'use strict';

    // Datos del usuario: { slug: { peso, reps, fecha } }
    let prs = {};
    let ultimas = {};

    // "Dominadas o Jalón al Pecho" -> "dominadas_o_jalon_al_pecho" (formato que acepta el servidor)
    function slug(nombre) {
        return String(nombre)
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 60);
    }

    const fmt = (m) => `${Number(m.peso)} kg × ${m.reps}`;

    function textoInfo(id) {
        const pr = prs[id], ult = ultimas[id];
        if (!pr) return 'Sin marcas todavía';
        let t = `🏆 PR: ${fmt(pr)}`;
        if (ult && (ult.peso !== pr.peso || ult.reps !== pr.reps)) t += ` · Última: ${fmt(ult)}`;
        return t;
    }

    function pintarInfo(fila) {
        const id = fila.dataset.prRow;
        const info = fila.querySelector('[data-pr-info]');
        if (info) {
            info.textContent = textoInfo(id);
            info.style.color = prs[id] ? '#34d399' : '#9ca3af';
        }
    }

    function mensaje(fila, texto, color) {
        const m = fila.querySelector('[data-pr-msg]');
        if (!m) return;
        m.textContent = texto;
        m.style.color = color || '#9ca3af';
        m.style.display = texto ? 'block' : 'none';
    }

    // ---- Guardar una marca en el servidor ----
    async function guardar(fila) {
        const id = fila.dataset.prRow;
        const inPeso = fila.querySelector('[data-pr-peso]');
        const inReps = fila.querySelector('[data-pr-reps]');
        const btn = fila.querySelector('[data-pr-guardar]');
        const peso = parseFloat(String(inPeso.value).replace(',', '.'));
        const reps = parseInt(inReps.value, 10);

        if (!Number.isFinite(peso) || peso <= 0 || peso > 1000) return mensaje(fila, 'Escribe un peso válido (kg).', '#f87171');
        if (!Number.isInteger(reps) || reps < 1 || reps > 100) return mensaje(fila, 'Escribe repeticiones válidas (1 a 100).', '#f87171');

        btn.disabled = true;
        btn.style.opacity = '0.6';
        try {
            const res = await fetch('/api/marcas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ejercicio: id, peso, reps })
            });

            if (res.status === 401) {
                alert('Tu sesión expiró. Inicia sesión de nuevo.');
                window.location.href = 'index';
                return;
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return mensaje(fila, data.error || 'No se pudo guardar la marca.', '#f87171');

            const nueva = { peso, reps };
            ultimas[id] = nueva;
            if (data.primera || data.esPR) prs[id] = nueva;

            if (data.primera) mensaje(fila, '¡Primera marca registrada! 💪', '#34d399');
            else if (data.esPR) mensaje(fila, `🏆 ¡NUEVO PR! Superaste ${fmt(data.prAnterior)}.`, '#34d399');
            else mensaje(fila, `Marca guardada. Tu PR sigue en ${fmt(prs[id])}.`, '#00d2ff');

            pintarInfo(fila);
            inPeso.value = '';
            inReps.value = '';
            fila.querySelector('[data-pr-form]').style.display = 'none';
        } catch (e) {
            mensaje(fila, 'No se pudo conectar con el servidor. Intenta de nuevo.', '#f87171');
        } finally {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }

    // ---- Crea la fila de marcas debajo de un ejercicio ----
    function crearFila(id) {
        const fila = document.createElement('li');
        fila.dataset.prRow = id;
        fila.className = 'pb-2 border-b border-gray-800';
        fila.style.marginTop = '-4px';
        fila.innerHTML =
            '<div class="flex items-center justify-between gap-2" style="font-size:12px;">' +
                '<span data-pr-info></span>' +
               '<button type="button" data-pr-toggle class="font-bold whitespace-nowrap" style="color:#00d2ff;background:rgba(0,210,255,0.1);border:1px solid #00d2ff;border-radius:8px;cursor:pointer;padding:4px 10px;font-size:11px;">+ Registrar marca</button>' +
            '</div>' +
            '<div data-pr-form style="display:none;margin-top:8px;gap:8px;align-items:center;flex-wrap:wrap;">' +
                '<input data-pr-peso type="number" inputmode="decimal" step="0.5" min="0.5" max="1000" placeholder="kg" ' +
                    'class="bg-[#050a14] border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none" style="width:90px;">' +
                '<span style="color:#9ca3af;">×</span>' +
                '<input data-pr-reps type="number" inputmode="numeric" step="1" min="1" max="100" placeholder="reps" ' +
                    'class="bg-[#050a14] border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none" style="width:80px;">' +
                '<button type="button" data-pr-guardar class="font-black uppercase" ' +
                    'style="background:#00d2ff;color:#050a14;border:none;border-radius:8px;padding:7px 14px;font-size:11px;cursor:pointer;">Guardar</button>' +
            '</div>' +
            '<div data-pr-msg style="display:none;font-size:12px;font-weight:700;margin-top:6px;"></div>';

        fila.querySelector('[data-pr-toggle]').addEventListener('click', () => {
            const form = fila.querySelector('[data-pr-form]');
            const abierto = form.style.display === 'flex';
            form.style.display = abierto ? 'none' : 'flex';
            if (!abierto) fila.querySelector('[data-pr-peso]').focus();
            mensaje(fila, '');
        });
        fila.querySelector('[data-pr-guardar]').addEventListener('click', () => guardar(fila));
        fila.querySelectorAll('input').forEach(inp =>
            inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); guardar(fila); } })
        );

        pintarInfo(fila);
        return fila;
    }

    // ---- Recorre las listas de ejercicios (es seguro llamarla varias veces) ----
    function decorarTodo() {
        document.querySelectorAll('ul[id^="lista-"]').forEach(ul => {
            ul.querySelectorAll(':scope > li:not([data-pr-row])').forEach(li => {
                const siguiente = li.nextElementSibling;
                if (siguiente && siguiente.dataset && siguiente.dataset.prRow) return; // ya tiene su fila

                const nombreEl = li.querySelector('span');
                const id = nombreEl ? slug(nombreEl.textContent) : '';
                if (!id) return;

                // La línea divisoria pasa a la fila de marcas para que se vea un solo bloque por ejercicio
                li.classList.remove('border-b', 'border-gray-800', 'pb-2');
                li.after(crearFila(id));
            });
        });
    }

    // "Generar Rutina Alternativa" vuelve a escribir las listas: se vuelven a decorar solas
    function vigilarListas() {
        const observador = new MutationObserver(decorarTodo);
        document.querySelectorAll('ul[id^="lista-"]').forEach(ul => observador.observe(ul, { childList: true }));
    }

    // ---- Carga las marcas guardadas de la cuenta ----
    async function cargarMarcas() {
        try {
            const res = await fetch('/api/mi-rutina', { cache: 'no-store' });
            if (!res.ok) return; // sin sesión: la página ya se encarga de mandar a index
            const data = await res.json();
            prs = data.prs || {};
            ultimas = data.ultimas || {};
            document.querySelectorAll('[data-pr-row]').forEach(pintarInfo);
        } catch (e) { /* sin conexión: se queda "Sin marcas todavía" */ }
    }

    function iniciar() {
        decorarTodo();
        vigilarListas();
        cargarMarcas();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
