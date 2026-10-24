import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { GlobalSearchbar } from './GlobalSearchbar'
vi.mock('../../../features/employee/target-roles/currentRoleFlowApi', () => ({ currentRoles: vi.fn(async () => [{ id: 'role-a', name: 'Security Role', scope: 'Secure', occupationName: 'Security', catalogVersion: 'f1' }]) }))
vi.mock('../../api/microSkillApi', () => ({ fetchMicroSkills: vi.fn(async () => [{ id: 'skill-a', name: 'Unicode Skill', description: 'Learn' }]) }))
function Location() { const location = useLocation(); return <output>{location.pathname + location.search}</output> }
afterEach(cleanup)
it.each([['Security', 'Security Role', 'roles'], ['Unicode', 'Unicode Skill', 'skills']])('RB01 global search %s opens %s in %s', async (query, name, tab) => {
  render(<MemoryRouter><GlobalSearchbar /><Location /></MemoryRouter>)
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: query } })
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(name) }))
  expect(screen.getByRole('status').textContent).toBe('/employee/upskilling?tab=' + tab + '&search=' + encodeURIComponent(name))
})
