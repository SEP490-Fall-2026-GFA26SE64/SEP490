import { Navigate, useLocation } from 'react-router-dom'

function riasecLocation(search = '', hash = '') {
  const params = new URLSearchParams(search)
  params.set('tab', 'riasec')
  if (params.get('take') === 'riasec') params.delete('take')
  return { pathname: '/employee/overview', search: params.toString(), hash }
}
export function RiasecRedirect() {
  const location = useLocation()
  return <Navigate to={riasecLocation(location.search, location.hash)} replace />
}
