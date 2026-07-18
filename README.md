# Revival Football — Landing Page

Landing page de Revival Football, construida con [Astro](https://astro.build) y Tailwind CSS v4.

## Estructura

```
src/
├── components/     # Header, Footer, Hero, About, Services, Players, Presence, CTA
├── layouts/        # Layout.astro (shell base + scroll-reveal)
├── pages/          # index.astro
└── styles/         # global.css (paleta de marca + Tailwind)
```

## Comandos

| Comando           | Acción                                          |
| ------------------ | ------------------------------------------------ |
| `npm install`       | Instala dependencias                              |
| `npm run dev`       | Levanta el servidor local en `localhost:4321`     |
| `npm run build`     | Genera el sitio estático en `./dist/`             |
| `npm run preview`   | Previsualiza el build antes de desplegar          |

## Despliegue en Hostgator

Este sitio se genera como archivos estáticos (HTML/CSS/JS), ideal para hosting compartido tipo Hostgator:

1. Ejecuta `npm run build`. Esto genera la carpeta `dist/`.
2. Entra al **cPanel de Hostgator** → **Administrador de Archivos** (o usa un cliente FTP como FileZilla).
3. Ve a la carpeta `public_html` (o la subcarpeta de tu dominio/subdominio).
4. Sube **todo el contenido** de `dist/` (no la carpeta en sí, sino lo que está dentro) a `public_html`.
5. Verifica que `index.html` quede directamente en `public_html`.

No se necesita Node.js en el servidor: Hostgator solo sirve los archivos estáticos ya generados.

## Pendientes / personalización

- Reemplazar los placeholders con fotografías reales de jugadores y del fundador.
- Actualizar el enlace de Facebook en el footer con la URL real de la página.
- Ajustar el dominio final si se agrega `site` en `astro.config.mjs` para SEO (sitemap, canonical URLs).
