# AR Showroom – Taller Clase 13 (A-Frame + WebAR)

Archivos:
- `ar-experiencia.html` → página del reto
- `index.html` → copia, para que la URL raíz de GitHub Pages abra directo
- `js/ar-app.js` → interacción, panel 2D y LocalStorage

## Probar en el PC
VS Code → clic derecho en `ar-experiencia.html` → "Open with Live Server".

## Publicar en GitHub Pages (HTTPS, necesario para la cámara del celular)
1. Crea un repositorio público (ej. `ar-showroom`) y sube estos archivos (GitHub Desktop → Commit → Push).
2. En GitHub: Settings → Pages → Source: "Deploy from a branch" → rama `main`, carpeta `/ (root)` → Save.
3. Espera 1-2 min. URL: `https://TU-USUARIO.github.io/ar-showroom/ar-experiencia.html`

## En el celular
- Abre la URL en Chrome (Android) o Safari (iPhone).
- Toca el producto → cambia de color, gira y se guarda la métrica.
- Mueve el teléfono: la escena sigue el giroscopio (en iPhone acepta el permiso de movimiento).
- Botón "📷 Modo AR" → usa la cámara trasera de fondo (acepta el permiso).
- Botón "⚙️ Panel" → abre los controles.

## Ver métricas
F12 → Application → Local Storage → clave `arShowroomMetricas`.
