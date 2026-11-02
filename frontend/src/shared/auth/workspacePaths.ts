import { createContext, useContext } from 'react'

/** Organization workspace URLs: `/workspace/{slug}/{area}/...`. */
export const WORKSPACE_PREFIX = '/workspace'

const SLUG = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/
const WORKSPACE_PATH = /^\/workspace\/([^/?#]+)(?=\/|$)/
const TENANT_PATH = /^\/(admin|employee|expert|ld-manager|manager|profile|learner|assessment|knowledge-graph|design-system)(\/|$)/
const SHARED_PATH = /^\/system-status(\/|$)/

export interface WorkspaceBase {
  slug: string
  basename: string
}

export function isWorkspaceSlug(value: string | null | undefined): value is string {
  return typeof value === 'string' && SLUG.test(value)
}

/** Detects a workspace URL; an invalid slug is still a workspace URL so it can be reported as not found. */
export function workspaceBase(pathname: string): WorkspaceBase | null {
  const match = WORKSPACE_PATH.exec(pathname)
  if (!match) return null
  let slug: string
  try {
    slug = decodeURIComponent(match[1])
  } catch {
    // A malformed escape is still an (unknown) workspace and must render "Workspace not found", not crash.
    return { slug: match[1], basename: `${WORKSPACE_PREFIX}/${match[1]}` }
  }
  return { slug, basename: `${WORKSPACE_PREFIX}/${encodeURIComponent(slug)}` }
}

/** Pages owned by an organization workspace (as opposed to guest, login and platform pages). */
export function isTenantPath(path: string): boolean {
  return TENANT_PATH.test(path)
}

/** Pages reachable from every portal: kept inside the workspace when opened there, public elsewhere. */
export function isSharedPath(path: string): boolean {
  return SHARED_PATH.test(path)
}

export function workspaceUrl(slug: string, path = '/'): string {
  if (!isWorkspaceSlug(slug)) throw new Error('A valid workspace slug is required.')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${WORKSPACE_PREFIX}/${slug}${normalized === '/' ? '' : normalized}`
}

/**
 * Resolves a post-sign-in return target. Only the member's own workspace (or a legacy in-workspace path, which is
 * prefixed with their slug) is accepted; anything else is discarded to prevent open or cross-tenant redirects.
 */
export function safeReturnPath(next: string | null | undefined, slug: string | null | undefined): string | null {
  if (!next || !isWorkspaceSlug(slug) || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return null
  // Dot segments (also percent-encoded) would be resolved by the browser after these checks, escaping the workspace.
  if (/(^|\/)(\.|%2e){1,2}(\/|[?#]|$)/i.test(next)) return null
  const base = workspaceBase(next)
  if (base) {
    if (base.slug !== slug) return null
    const rest = next.slice(base.basename.length) || '/'
    return isTenantPath(rest.split(/[?#]/)[0]) ? next : null
  }
  return isTenantPath(next.split(/[?#]/)[0]) ? workspaceUrl(slug, next) : null
}

export const WorkspaceSlugContext = createContext<string | null>(null)

/** The slug of the workspace URL currently rendered, or null outside a workspace. */
export function useWorkspaceSlug(): string | null {
  return useContext(WorkspaceSlugContext)
}
