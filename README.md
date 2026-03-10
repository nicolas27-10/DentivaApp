# Dentiva

Plataforma educativa SaaS para dentistas que buscan validar su título profesional en Alemania.

## Stack

- **Astro** - Framework
- **TailwindCSS** - Estilos
- **Supabase** (previsto) - Auth, BD, Storage
- **Stripe** (previsto) - Suscripciones

## Estructura del proyecto

```
src/
├── components/     # Componentes reutilizables
├── layouts/        # MainLayout, AuthLayout, DashboardLayout
├── lib/            # Integraciones (Supabase, Stripe, auth)
├── pages/          # Rutas de la aplicación
└── styles/         # global.css con Tailwind
```

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Páginas

- `/` - Landing
- `/login` - Inicio de sesión
- `/register` - Registro
- `/dashboard` - Área protegida (progreso, unidades)
- `/unit/[id]` - Unidad de estudio y quiz
- `/leaderboard` - Clasificación semanal
- `/pricing` - Precios y planes
