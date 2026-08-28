import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import { ROUTES } from '@/app/routes/paths'

/**
 * Busca global (atalho `/`) — rota principal de navegação numa rede de 49
 * escolas e 535 turmas. Por enquanto encaminha o termo para a lista de alunos.
 */
export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [term, setTerm] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (term.trim()) {
      navigate(`${ROUTES.students}?q=${encodeURIComponent(term.trim())}`)
    }
  }

  return (
    <header className="flex h-16 items-center gap-3 border-b border-line bg-white px-4 lg:px-8">
      <button
        onClick={onOpenMenu}
        className="rounded p-2 text-ink-500 hover:bg-surface-subtle lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <form onSubmit={submit} className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          ref={inputRef}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar aluno, escola, professor ou código…  ( / )"
          className="h-control-sm w-full rounded border border-line-strong bg-white pl-9 pr-3 text-base"
        />
      </form>
    </header>
  )
}
