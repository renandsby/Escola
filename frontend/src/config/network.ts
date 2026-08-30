/**
 * Constantes de deploy da rede municipal.
 *
 * O município é fixo por instalação — não vem da API (papéis fora da SME não
 * enxergam `sme/departments/`). A `useHeaderData` enriquece com o dado oficial
 * da secretaria quando o papel tem acesso.
 */
export const NETWORK_NAME = import.meta.env.VITE_NETWORK_NAME?.trim() || 'Igarassu'

/** 'Rede Municipal de {municipio}' — linha institucional do AppHeader. */
export const NETWORK_IDENTITY = `Rede Municipal de ${NETWORK_NAME}`

export const NETWORK_DEPARTMENT_LABEL = 'Secretaria Municipal de Educação'
