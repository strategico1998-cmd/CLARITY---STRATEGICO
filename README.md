# Clarity Analytics SaaS

Plataforma multi-tenant de analítica web tipo Microsoft Clarity, sin grabaciones.

## Stack
- **Frontend**: Vite + React + React Router
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Charts**: Recharts
- **Fonts**: Inter (Google Fonts)

## Instalación

```bash
npm install
npm run dev
```

## Configuración de Supabase

1. Ve a [Supabase SQL Editor](https://supabase.com/dashboard/project/uxcguzqbzvewrhlxpvug/sql)
2. Ejecuta el archivo `schema.sql` completo
3. Crea un usuario admin en **Authentication > Users**
4. Ejecuta en SQL: `UPDATE public.users SET role = 'admin' WHERE email = 'tu@email.com';`

## Estructura del proyecto

```
src/
├── lib/supabase.js          # Cliente Supabase
├── context/AuthContext.jsx  # Auth + roles
├── components/layout/       # Sidebar, Layout, ProtectedRoute
├── pages/
│   ├── Login.jsx
│   ├── admin/               # Dashboard, Clientes, Planes, Monitoreo, Seguridad
│   └── client/              # Dashboard, Onboarding, Heatmaps, Eventos, Embudos, Comportamiento, Segmentación
```

## Roles

| Rol    | Acceso |
|--------|--------|
| admin  | Panel completo, gestión de clientes y planes |
| client | Solo sus sitios, sesiones y eventos |

## Variables de entorno (opcional)

Las credenciales están hardcodeadas para desarrollo rápido. Para producción, usa `.env`:

```
VITE_SUPABASE_URL=https://uxcguzqbzvewrhlxpvug.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_few9jD-6smS4r3aAlUTxwQ_mPZfaG3U
```
