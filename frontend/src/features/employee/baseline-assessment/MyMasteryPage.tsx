import { Navigate, useLocation } from 'react-router-dom'

/** Preserve bookmarks while Overview owns the competency profile. */
export function MyMasteryPage() {
  const location = useLocation()
  return <Navigate replace to={{pathname:'/employee/overview',search:location.search,hash:'#competency-profile'}} />
}
