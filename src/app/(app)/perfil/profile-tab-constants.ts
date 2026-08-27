// Sin "use client": los exports de un módulo cliente se convierten en
// referencias opacas al importarlos desde un Server Component (incluso
// los que no son componentes), así que PROFILE_TABS necesita vivir en un
// archivo aparte para que page.tsx (servidor) reciba el array real.
export const PROFILE_TABS = ["perfil", "preferencias", "seguridad", "cuenta"] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];
