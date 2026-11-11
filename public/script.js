// --- 1. INICIALIZACIÓN Y SESIÓN ---
        document.addEventListener("DOMContentLoaded", () => {
            checkUserSession();
            loadAccessibilityPreferences();

            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            const mobileMenu = document.getElementById('mobile-menu');
            const mobileMenuIcon = document.getElementById('mobile-menu-icon');

            if (mobileMenuBtn && mobileMenu) {
                mobileMenuBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    mobileMenu.classList.toggle('hidden');
                    if (mobileMenu.classList.contains('hidden')) {
                        if (mobileMenuIcon) mobileMenuIcon.className = "fas fa-bars";
                    } else {
                        if (mobileMenuIcon) mobileMenuIcon.className = "fas fa-times";
                    }
                });

                mobileMenu.querySelectorAll("a").forEach(link => {
                    link.addEventListener("click", () => {
                        mobileMenu.classList.add('hidden');
                        if (mobileMenuIcon) mobileMenuIcon.className = "fas fa-bars";
                    });
                });

                document.addEventListener('click', (e) => {
                    if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target) && !mobileMenu.classList.contains('hidden')) {
                        mobileMenu.classList.add('hidden');
                        if (mobileMenuIcon) mobileMenuIcon.className = "fas fa-bars";
                    }
                });
            }
        });

        function openLoginModal() { 
            const modal = document.getElementById('login-modal');
            if (modal) modal.classList.remove('hidden'); 
        }
        function closeLoginModal() { 
            const modal = document.getElementById('login-modal');
            if (modal) modal.classList.add('hidden'); 
        }

        function handleLogin(e) {
            e.preventDefault();
            const userField = document.getElementById('login-user');
            if (userField) {
                const user = userField.value;
                localStorage.setItem('kronox_logged_user', user);
                closeLoginModal();
                checkUserSession();
                window.location.href = "rutinas";
            }
        }

        function logoutUser() {
            localStorage.removeItem('kronox_logged_user');
            window.location.href = "index";
        }

        function checkUserSession() {
            const loggedUser = localStorage.getItem('kronox_logged_user');
            const navRutinas = document.getElementById('nav-rutinas');
            const mobileNavRutinas = document.getElementById('mobile-nav-rutinas');
            const btnLogin = document.getElementById('btn-open-login');
            const userInfo = document.getElementById('user-session-info');
            const mobileBtnLogin = document.getElementById('mobile-btn-login');
            const mobileUserInfo = document.getElementById('mobile-user-info');

            if (loggedUser) {
                if (navRutinas) navRutinas.classList.remove('hidden');
                if (mobileNavRutinas) mobileNavRutinas.classList.remove('hidden');
                if (btnLogin) btnLogin.classList.add('hidden');
                if (userInfo) {
                    userInfo.classList.remove('hidden');
                    userInfo.classList.add('flex');
                    const nameSpan = document.getElementById('welcome-user-name');
                    if (nameSpan) nameSpan.innerText = `Hola, ${loggedUser.split('@')[0]}`;
                }
                if (mobileBtnLogin) mobileBtnLogin.classList.add('hidden');
                if (mobileUserInfo) {
                    mobileUserInfo.classList.remove('hidden');
                    const mobNameSpan = document.getElementById('mobile-welcome-name');
                    if (mobNameSpan) mobNameSpan.innerText = `Usuario: ${loggedUser.split('@')[0]}`;
                }
            } else {
                if (navRutinas) navRutinas.classList.add('hidden');
                if (mobileNavRutinas) mobileNavRutinas.classList.add('hidden');
                if (btnLogin) btnLogin.classList.remove('hidden');
                if (userInfo) {
                    userInfo.classList.add('hidden');
                    userInfo.classList.remove('flex');
                }
                if (mobileBtnLogin) mobileBtnLogin.classList.remove('hidden');
                if (mobileUserInfo) mobileUserInfo.classList.add('hidden');
            }
        }

        // --- 2. ACCESIBILIDAD (TAMAÑO, DALTONISMO, CONTRASTE) ---
        function toggleAccessibilityPanel() {
            const panel = document.getElementById('accessibility-panel');
            if (panel) panel.classList.toggle('hidden');
        }

        let currentFontSize = 100;
        function adjustFontSize(amount) {
            currentFontSize += amount;
            if (currentFontSize < 70) currentFontSize = 70;
            if (currentFontSize > 200) currentFontSize = 200;
            document.documentElement.style.fontSize = `${currentFontSize}%`;
            localStorage.setItem('kronox_font_size', currentFontSize);
        }

        function resetFontSize() {
            currentFontSize = 100;
            document.documentElement.style.fontSize = '100%';
            localStorage.setItem('kronox_font_size', 100);
        }

        function setDaltonism(type) {
            document.body.classList.remove('daltonism-protanopia', 'daltonism-deuteranopia', 'daltonism-tritanopia');
            ['none', 'protan', 'deut', 'trit'].forEach(t => {
                const btn = document.getElementById(`btn-dalton-${t}`);
                if (btn) {
                    btn.classList.remove('bg-red-600', 'text-white', 'border-red-500');
                    btn.classList.add('bg-[#1f293d]', 'text-gray-300', 'border-gray-700');
                }
            });

            if (type !== 'none') {
                document.body.classList.add(`daltonism-${type}`);
                const activeBtn = document.getElementById(`btn-dalton-${type.substring(0,4)}`);
                if (activeBtn) {
                    activeBtn.classList.add('bg-red-600', 'text-white', 'border-red-500');
                    activeBtn.classList.remove('bg-[#1f293d]', 'text-gray-300');
                }
            } else {
                const noneBtn = document.getElementById('btn-dalton-none');
                if (noneBtn) {
                    noneBtn.classList.add('bg-red-600', 'text-white', 'border-red-500');
                    noneBtn.classList.remove('bg-[#1f293d]', 'text-gray-300');
                }
            }
            localStorage.setItem('kronox_daltonism', type);
        }

        function toggleHighContrast() {
            document.body.classList.toggle('high-contrast');
            const isActive = document.body.classList.contains('high-contrast');
            const btn = document.getElementById('btn-high-contrast');
            if (btn) {
                if (isActive) {
                    btn.classList.add('bg-red-600', 'text-white', 'border-red-500');
                } else {
                    btn.classList.remove('bg-red-600', 'text-white', 'border-red-500');
                }
            }
            localStorage.setItem('kronox_high_contrast', isActive ? 'enabled' : 'disabled');
        }

        function loadAccessibilityPreferences() {
            const savedFontSize = localStorage.getItem('kronox_font_size');
            if (savedFontSize) {
                currentFontSize = parseInt(savedFontSize);
                document.documentElement.style.fontSize = `${currentFontSize}%`;
            }

            const savedDaltonism = localStorage.getItem('kronox_daltonism');
            if (savedDaltonism) {
                setDaltonism(savedDaltonism);
            }

            const savedContrast = localStorage.getItem('kronox_high_contrast');
            if (savedContrast === 'enabled') {
                toggleHighContrast();
            }

            const savedSpeech = localStorage.getItem('kronox_speech_active');
            if (savedSpeech === 'enabled') {
                speechActive = true;
                actualizarEstadoLectorUI();
            }
        }

        // --- 3. LECTOR DE VOZ BLINDADO PARA MÓVIL (EL QUE YA TENÍAS) ---
        let speechActive = false;
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
            } else {
                if (btn) {
                    btn.innerHTML = `<i class="fas fa-volume-high"></i> Activar Lector Interactivo`;
                    btn.classList.replace('bg-red-600', 'bg-cyan-600');
                }
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                if (subtitleBox) subtitleBox.style.display = 'none';

                avisoFlotante.innerHTML = `<i class="fas fa-info-circle text-red-400 mr-2"></i> Lector desactivado.`;
                avisoFlotante.style.opacity = '1';
                setTimeout(() => { avisoFlotante.style.opacity = '0'; }, 3000);
            }
        }

        function leerTextoSeleccionado(e) {
            if (!speechActive) return;

            // Bloquear completamente la lectura si el toque o clic ocurre en cualquier elemento interactivo o de navegación
            if (e && e.target) {
                const elemento = e.target;
                if (
                    elemento.closest('#mobile-menu') || 
                    elemento.closest('#accessibility-panel') || 
                    elemento.closest('header') || 
                    elemento.closest('button') || 
                    elemento.closest('a') ||
                    elemento.closest('input')
                ) {
                    return; // Permite que el botón o menú responda con total normalidad
                }
            }

            const seleccion = window.getSelection();
            const textoSeleccionado = seleccion ? seleccion.toString().trim() : "";

            if (textoSeleccionado.length > 1) {
                if ('speechSynthesis' in window) {
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
            }
        }

        // Usar un retraso seguro en dispositivos táctiles para priorizar los clics de los botones
        document.addEventListener('mouseup', leerTextoSeleccionado);
        document.addEventListener('touchend', (e) => {
            if (speechActive) {
                setTimeout(() => leerTextoSeleccionado(e), 200);
            }
        }, { passive: true });
