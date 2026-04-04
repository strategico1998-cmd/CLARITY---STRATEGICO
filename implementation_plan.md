# Integrations and Marketing Dashboard

Este plan aborda la adición de dos nuevas secciones totalmente funcionales para clientes: "Integraciones" y "Dashboard de Marketing", manteniendo la arquitectura actual (Vite + React + Supabase) y los diseños de estilo ya existentes.

## Proposed Changes

### Database (Supabase)

Crearemos un script SQL que se ejecutará en Supabase (o lo puedo aplicar yo si me confirmas qué prefieres). Este script agregará las tablas solicitadas con Row Level Security (RLS) habilitado para garantizar el aislamiento multi-cliente.

- Nueva tabla `integrations`: Guardará los tokens de acceso OAuth (Facebook, TikTok, LinkedIn, Google Ads, Google Analytics).
- Nueva tabla `marketing_data`: Guardará las métricas diarias importadas para todas las campañas. 
- Políticas RLS (Row Level Security): Cada cliente sólo podrá leer/escribir datos correspondientes a su `client_id`.

### Backend "Endpoints" y Sincronización

Dado que la arquitectura es React/Vite (Serverless) conectado directamente a Supabase:
- Crearemos un módulo API (ej: `src/api/marketingApi.js`) que encapsulará la lógica de estos nuevos "endpoints" solicitados (simulando peticiones sobre la red para `GET /api/marketing/data` y `GET /api/marketing/sync`, los cuales apuntarán directamente al cliente de Supabase).
- Implementaremos la lógica de validación OAuth real: guardaremos tokens, refactorizaremos/refrescaremos los token, y marcaremos el estado en la base de datos de manera real, aunque si no provees claves (ID de cliente y Secretos) para cada red en formato local de variables de entorno, simularemos la respuesta exitosa en el entorno local (de lo contrario la API fallaría por falta de keys).

### Frontend Routing and Sidebar

#### [MODIFY] Sidebar.jsx
- Agregaremos dos elementos nuevos al `clientNav`:
  - "Integraciones" (`/integrations`)
  - "Marketing" (`/marketing`)

#### [MODIFY] App.jsx
- Registraremos las nuevas rutas protegidas para Clientes (`/integrations`, `/marketing`).

### Nuevas Páginas y Componentes

#### [NEW] src/pages/client/Integrations.jsx
- Componente que mostrará el listado de las 5 plataformas.
- Funcionalidad de OAuth simulada/real (usando el login popup/redirect estándar).
- Actualización en tiempo real del estado de conexión desde la base de datos.
- Reutilizaremos cards y estilos de botones existentes de index.css o de otros componentes.

#### [NEW] src/pages/client/MarketingDashboard.jsx
- Nueva interfaz sin alterar la principal de "ClientDashboard.jsx".
- Implementación de Filtros (30/60/90 días y Plataformas).
- Renderizado de Cards Principales de Rendimiento con KPIs y porcentajes variando acorde a los datos de la DB.
- Integración de `recharts` para una Gráfica diaria de línea (ya preinstalada y usada en tus otros componentes).
- Tabla Detallada desglozando Campaña, Conjuntos y Anuncios.

## Open Questions

> [!IMPORTANT]  
> 1. Para la **Autenticación OAuth Real**, necesitaríamos App IDs y Secrets de Facebook, Google, TikTok y LinkedIn en tu `.env`. ¿Quieres que implemente la capa de red "real" que se conectará si le agregas tus propias variables de entorno, o basta con que el flujo complete la inserción en base de datos de manera simulada local (para probar la UI sin errores de 401 Unauthorized)?
> 2. Respecto al **Job Automático ("Sincronización Diaria")**, Supabase requiere el uso de Webhooks/Edge Functions + `pg_cron` o un backend en Node (como Vercel Cron). Como esta es una app frontend en Vite, implementaré el "endpoint" `/api/marketing/sync` de forma que pueda ser llamado mediante un botón manual para efectos de demostración, ¿O prefieres que agregue scripts de Edge Functions para Supabase?

## Verification Plan

### Manual Verification
1. Ingresar con una cuenta de cliente y probar navegar a "Integraciones".
2. Conectar una integración e inspeccionar Supabase para ver si se guardó el token en la tabla `integrations`.
3. Navegar al nuevo "Dashboard de Marketing", revisar la carga condicional de "Sin datos" (si no hay datos agregados).
4. Hacer push del botón manual "Sync Mocks" para poblar datos de hoy y últimos 30 días, y probar los filtros de fechas y plataformas (verificando que todo el contenido se actualice dinámicamente) sin afectar la estética general pre-existente.
