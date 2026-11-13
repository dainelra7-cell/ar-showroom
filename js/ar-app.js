/* =========================================================
   AR Showroom · js/ar-app.js
   Interacción, animaciones, panel 2D y métricas en LocalStorage
   ========================================================= */

const CLAVE_METRICAS = 'arShowroomMetricas';
const COLORES = ['#2AFF6B', '#2A75FF', '#FF2AEE', '#FFCC00', '#FF2A2A'];

const ESTADO_INICIAL = {
  color: '#FF2A2A',
  forma: 'box',
  escala: 1,
  metalness: 0.6,
  roughness: 0.3,
  z: -3
};

/* ---------------------------------------------------------
   Componente propio: giro automático (ECS de A-Frame)
   --------------------------------------------------------- */
AFRAME.registerComponent('auto-giro', {
  schema: {
    activo: { type: 'boolean', default: false },
    velocidad: { type: 'number', default: 45 } // grados por segundo
  },
  tick: function (t, dt) {
    if (!this.data.activo || this.el.dataset.girando === '1' || !dt) return;
    this.el.object3D.rotation.y += THREE.MathUtils.degToRad(this.data.velocidad) * (dt / 1000);
  }
});

/* ---------------------------------------------------------
   Paso 5: Persistencia en LocalStorage
   --------------------------------------------------------- */
function leerMetricas() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_METRICAS));
    if (datos && Array.isArray(datos.historial)) return datos;
  } catch (e) { /* datos corruptos o storage bloqueado */ }
  return { totalClics: 0, cambiosPanel: 0, clicsPorColor: {}, historial: [], ultimaVisita: null };
}

function guardarMetricas(m) {
  try {
    localStorage.setItem(CLAVE_METRICAS, JSON.stringify(m));
  } catch (e) {
    console.warn('No se pudo guardar en LocalStorage:', e);
  }
}

function registrarInteraccion(accion, valor) {
  const m = leerMetricas();
  if (accion === 'Clic en Producto AR') {
    m.totalClics += 1;
    m.clicsPorColor[valor] = (m.clicsPorColor[valor] || 0) + 1;
  } else {
    m.cambiosPanel += 1;
  }
  m.historial.unshift({
    accion,
    valor: String(valor),
    fecha: new Date().toISOString()
  });
  m.historial = m.historial.slice(0, 50); // máximo 50 registros
  m.ultimaVisita = new Date().toISOString();
  guardarMetricas(m);
  pintarMetricas();
}

function pintarMetricas() {
  const m = leerMetricas();
  document.getElementById('kpi-clics').textContent = m.totalClics;
  document.getElementById('kpi-cambios').textContent = m.cambiosPanel;

  const lista = document.getElementById('historial');
  lista.innerHTML = '';
  m.historial.slice(0, 8).forEach(r => {
    const li = document.createElement('li');
    const hora = new Date(r.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const esColor = /^#[0-9a-f]{6}$/i.test(r.valor);
    li.innerHTML = `<span>${esColor ? `<i style="background:${r.valor}"></i> ` : ''}${r.accion}${esColor ? '' : ': ' + r.valor}</span><span>${hora}</span>`;
    lista.appendChild(li);
  });
  if (!m.historial.length) {
    lista.innerHTML = '<li><span>Sin interacciones todavía</span></li>';
  }
}

/* ---------------------------------------------------------
   Paso 4: Interacción con el objeto 3D
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const escena = document.querySelector('#escena');
  const producto = document.querySelector('#objeto-producto');
  const etiqueta = document.querySelector('#etiqueta');

  const toast = document.getElementById('toast');
  let toastTimer;
  function avisar(texto) {
    toast.textContent = texto;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 1400);
  }

  const estado = { ...ESTADO_INICIAL };

  function aplicarColor(color) {
    estado.color = color;
    producto.setAttribute('material', 'color', color);
    document.querySelectorAll('.color').forEach(b =>
      b.classList.toggle('seleccionado', b.dataset.color.toLowerCase() === color.toLowerCase()));
  }

  // Animación de giro de 360° desde la rotación actual
  function girar() {
    if (producto.dataset.girando === '1') return;
    producto.dataset.girando = '1';
    const y = THREE.MathUtils.radToDeg(producto.object3D.rotation.y);
    producto.setAttribute('animation__giro', {
      property: 'rotation',
      from: `0 ${y} 0`,
      to: `0 ${y + 360} 0`,
      dur: 900,
      easing: 'easeOutBack'
    });
  }

  producto.addEventListener('animationcomplete__giro', () => {
    producto.dataset.girando = '0';
    producto.removeAttribute('animation__giro');
  });

  // Pulso de escala al tocar (feedback inmediato)
  function pulso() {
    const s = estado.escala;
    producto.setAttribute('animation__pulso', {
      property: 'scale',
      from: `${s * 1.25} ${s * 1.25} ${s * 1.25}`,
      to: `${s} ${s} ${s}`,
      dur: 350,
      easing: 'easeOutQuad'
    });
  }

  // ---- Evento 'click' proyectado por el Raycaster (también en toque táctil) ----
  producto.addEventListener('click', () => {
    const opciones = COLORES.filter(c => c.toLowerCase() !== estado.color.toLowerCase());
    const colorAleatorio = opciones[Math.floor(Math.random() * opciones.length)];

    aplicarColor(colorAleatorio);
    girar();
    pulso();
    if (navigator.vibrate) navigator.vibrate(30); // vibración corta en Android

    etiqueta.setAttribute('value', '¡Nuevo color!');
    setTimeout(() => etiqueta.setAttribute('value', 'Toca el producto'), 1200);

    registrarInteraccion('Clic en Producto AR', colorAleatorio);
    document.getElementById('ayuda').style.display = 'none';
  });

  // Hover (escritorio): brillo al pasar el cursor
  producto.addEventListener('mouseenter', () => {
    producto.setAttribute('material', 'emissive', '#333333');
    escena.canvas && (escena.canvas.style.cursor = 'pointer');
  });
  producto.addEventListener('mouseleave', () => {
    producto.setAttribute('material', 'emissive', '#000000');
    escena.canvas && (escena.canvas.style.cursor = 'grab');
  });

  /* ---------------------------------------------------------
     Panel flotante de controles 2D
     --------------------------------------------------------- */
  // Colores predefinidos
  document.querySelectorAll('.color').forEach(btn => {
    btn.addEventListener('click', () => {
      aplicarColor(btn.dataset.color);
      registrarInteraccion('Color', btn.dataset.color);
    });
  });

  // Color libre
  const colorLibre = document.getElementById('color-libre');
  colorLibre.addEventListener('input', e => aplicarColor(e.target.value));
  colorLibre.addEventListener('change', e => registrarInteraccion('Color', e.target.value));

  // Forma
  document.querySelectorAll('.forma').forEach(btn => {
    btn.addEventListener('click', () => {
      const forma = btn.dataset.forma;
      estado.forma = forma;
      const geo = { box: { primitive: 'box', width: 1, height: 1, depth: 1 },
                    sphere: { primitive: 'sphere', radius: 0.6 },
                    cylinder: { primitive: 'cylinder', radius: 0.5, height: 1.1 } }[forma];
      producto.setAttribute('geometry', geo);
      document.querySelectorAll('.forma').forEach(b => b.classList.toggle('activo', b === btn));
      registrarInteraccion('Forma', btn.textContent);
    });
  });

  // Sliders con registro al soltar (para no llenar el historial)
  function slider(id, outId, formato, alMover, nombre) {
    const input = document.getElementById(id);
    const out = document.getElementById(outId);
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      out.textContent = formato(v);
      alMover(v);
    });
    input.addEventListener('change', () => registrarInteraccion(nombre, formato(parseFloat(input.value))));
    return { input, out };
  }

  const sEscala = slider('rng-escala', 'out-escala', v => v.toFixed(2), v => {
    estado.escala = v;
    producto.object3D.scale.set(v, v, v);
    etiqueta.object3D.position.y = 1.6 + v * 0.55;
  }, 'Escala');

  const sMetal = slider('rng-metal', 'out-metal', v => v.toFixed(2), v => {
    estado.metalness = v;
    producto.setAttribute('material', 'metalness', v);
  }, 'Metalness');

  const sRug = slider('rng-rugosidad', 'out-rugosidad', v => v.toFixed(2), v => {
    estado.roughness = v;
    producto.setAttribute('material', 'roughness', v);
  }, 'Roughness');

  const sDist = slider('rng-distancia', 'out-distancia', v => `${v.toFixed(1)} m`, v => {
    estado.z = v;
    producto.object3D.position.z = v;
    etiqueta.object3D.position.z = v;
  }, 'Distancia Z');

  // Botones de acción
  document.getElementById('btn-girar').addEventListener('click', () => {
    girar();
    registrarInteraccion('Animación', 'Giro 360°');
  });

  const btnAuto = document.getElementById('btn-auto');
  producto.setAttribute('auto-giro', 'activo: false');
  btnAuto.addEventListener('click', () => {
    const activo = !producto.getAttribute('auto-giro').activo;
    producto.setAttribute('auto-giro', 'activo', activo);
    btnAuto.classList.toggle('activo', activo);
    btnAuto.textContent = activo ? '⏸️ Auto-giro' : '▶️ Auto-giro';
    registrarInteraccion('Auto-giro', activo ? 'ON' : 'OFF');
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    Object.assign(estado, ESTADO_INICIAL);
    aplicarColor(estado.color);
    producto.setAttribute('geometry', { primitive: 'box', width: 1, height: 1, depth: 1 });
    document.querySelectorAll('.forma').forEach(b => b.classList.toggle('activo', b.dataset.forma === 'box'));
    producto.setAttribute('material', { metalness: estado.metalness, roughness: estado.roughness });
    producto.object3D.scale.set(1, 1, 1);
    producto.object3D.position.z = estado.z;
    producto.object3D.rotation.set(0, THREE.MathUtils.degToRad(45), 0);
    etiqueta.object3D.position.set(0, 2.15, estado.z);
    producto.setAttribute('auto-giro', 'activo', false);
    btnAuto.classList.remove('activo');
    btnAuto.textContent = '▶️ Auto-giro';
    [[sEscala, 1, v => v.toFixed(2)], [sMetal, 0.6, v => v.toFixed(2)],
     [sRug, 0.3, v => v.toFixed(2)], [sDist, -3, v => `${v.toFixed(1)} m`]]
      .forEach(([s, v, f]) => { s.input.value = v; s.out.textContent = f(v); });
    registrarInteraccion('Reset', 'Valores iniciales');
    avisar('Producto restablecido');
  });

  document.getElementById('btn-borrar').addEventListener('click', () => {
    localStorage.removeItem(CLAVE_METRICAS);
    pintarMetricas();
    avisar('Métricas borradas');
  });

  /* ---------------------------------------------------------
     Panel en celular (hoja inferior que se abre/cierra)
     --------------------------------------------------------- */
  const panel = document.getElementById('panel');
  const btnPanel = document.getElementById('btn-panel');
  const esMovil = () => window.matchMedia('(max-width: 760px)').matches;

  function ponerPanel(abierto) {
    panel.classList.toggle('oculto', !abierto);
    document.body.classList.toggle('panel-abierto', abierto);
    btnPanel.classList.toggle('activo', abierto);
  }
  ponerPanel(!esMovil()); // en celular arranca cerrado para ver el producto
  btnPanel.addEventListener('click', () => ponerPanel(panel.classList.contains('oculto')));

  /* ---------------------------------------------------------
     Modo AR: cámara trasera del teléfono como fondo
     (requiere HTTPS: GitHub Pages / Vercel)
     --------------------------------------------------------- */
  const video = document.getElementById('video-camara');
  const entorno = document.getElementById('entorno');
  const btnAR = document.getElementById('btn-ar');
  let streamCamara = null;

  async function activarAR() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      avisar('La cámara necesita HTTPS');
      return;
    }
    try {
      streamCamara = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      video.srcObject = streamCamara;
      await video.play().catch(() => {});
      document.body.classList.add('modo-ar');
      entorno.setAttribute('visible', false);
      btnAR.classList.add('activo');
      btnAR.textContent = '✖ Salir AR';
      avisar('Mueve el teléfono para ubicar el producto');
      registrarInteraccion('Modo AR', 'ON');
    } catch (err) {
      console.warn('Cámara no disponible:', err);
      avisar('Permiso de cámara denegado');
    }
  }

  function desactivarAR() {
    if (streamCamara) streamCamara.getTracks().forEach(t => t.stop());
    streamCamara = null;
    video.srcObject = null;
    document.body.classList.remove('modo-ar');
    entorno.setAttribute('visible', true);
    btnAR.classList.remove('activo');
    btnAR.textContent = '📷 Modo AR';
    registrarInteraccion('Modo AR', 'OFF');
  }

  btnAR.addEventListener('click', () => (streamCamara ? desactivarAR() : activarAR()));

  // Estado inicial
  aplicarColor(estado.color);
  pintarMetricas();
  escena.addEventListener('loaded', () => {
    if (escena.canvas) escena.canvas.style.cursor = 'grab';
  });
});
