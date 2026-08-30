import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'rede:nav:collapsed'
const AUTO_COLLAPSE_BELOW = 1280
const DRAWER_BELOW = 1024

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function useViewport() {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  )
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return width
}

/**
 * Estado da `Sidebar` recolhível (§4.1 do DS "Rede").
 *
 *  - `≥ 1280px`: respeita a preferência do usuário (persistida em `localStorage`).
 *  - `1024–1280px`: recolhe automaticamente (rail de ícones).
 *  - `< 1024px`: vira drawer sobreposto; o toggle abre/fecha o drawer e `Esc` fecha.
 *  - `forceCollapsed`: telas de grade densa (`BatchGrid`) abrem recolhidas.
 */
export function useCollapsibleNav(forceCollapsed = false) {
  const width = useViewport()
  const isMobile = width < DRAWER_BELOW
  const autoCollapsed = width < AUTO_COLLAPSE_BELOW

  const [stored, setStored] = useState(readStored)
  const [mobileOpen, setMobileOpen] = useState(false)

  const collapsed = isMobile ? true : autoCollapsed || forceCollapsed || stored

  const toggle = useCallback(() => {
    if (window.innerWidth < DRAWER_BELOW) {
      setMobileOpen((v) => !v)
      return
    }
    if (window.innerWidth < AUTO_COLLAPSE_BELOW) {
      // já recolhido por viewport — nada a persistir
      return
    }
    setStored((v) => {
      const next = !v
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* storage indisponível — mantém só em memória */
      }
      return next
    })
  }, [])

  // fecha o drawer ao sair do modo mobile
  useEffect(() => {
    if (!isMobile && mobileOpen) {
      setMobileOpen(false)
    }
  }, [isMobile, mobileOpen])

  return {
    /** rail de ícones ativo (nos dois: desktop recolhido e drawer) */
    collapsed,
    /** viewport de drawer sobreposto */
    isMobile,
    /** drawer aberto */
    mobileOpen,
    setMobileOpen,
    /** reflete o estado "expandido" para `aria-expanded` do NavToggle */
    expanded: isMobile ? mobileOpen : !collapsed,
    toggle,
  }
}
