import type { ReactNode } from 'react'
import { Network } from 'lucide-react'
import { Link } from 'react-router-dom'
import './WorkspaceLayout.css'

export function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="workspace">
      <header className="topbar">
        <Link className="brand" to="/"><Network size={28} aria-hidden="true" />Adapt-Learn-Graph</Link>
        <span className="environment">Development</span>
      </header>
      <main className="workspace-main">{children}</main>
      <footer className="workspace-footer">Adapt-Learn-Graph<span>Development workspace</span></footer>
    </div>
  )
}