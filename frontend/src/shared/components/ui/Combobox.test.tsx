import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Combobox } from './Combobox'

afterEach(cleanup)

describe('Combobox', () => {
  it('filters options based on search query', () => {
    const options = [
      { value: '1', label: 'COMP-ARCH-J01 - Architecture', description: 'Infra' },
      { value: '2', label: 'COMP-DEV-J01 - Development', description: 'Coding' },
      { value: '3', label: 'COMP-DATA-J01 - Data', description: 'Neo4j Graph Database' },
    ]

    render(<Combobox options={options} />)

    // Open dropdown
    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)

    expect(screen.getByText('COMP-ARCH-J01 - Architecture')).toBeTruthy()
    expect(screen.getByText('COMP-DEV-J01 - Development')).toBeTruthy()
    expect(screen.getByText('COMP-DATA-J01 - Data')).toBeTruthy()

    // Type neo4j into search
    const searchInput = screen.getByPlaceholderText('Search options...')
    fireEvent.change(searchInput, { target: { value: 'neo4j' } })

    expect(screen.queryByText('COMP-ARCH-J01 - Architecture')).toBeNull()
    expect(screen.queryByText('COMP-DEV-J01 - Development')).toBeNull()
    expect(screen.getByText('COMP-DATA-J01 - Data')).toBeTruthy()
  })

  it('supports keyboard selection and Escape without submitting the containing form', () => {
    const change = vi.fn()
    const submit = vi.fn()
    render(<form onSubmit={submit}><Combobox role="combobox" aria-label="Country"
      options={[{ value: 'VN', label: 'Vietnam' }, { value: 'US', label: 'United States' }]}
      onChange={change} /></form>)
    const trigger = screen.getByRole('combobox', { name: 'Country' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const search = screen.getByRole('textbox', { name: 'Search options...' })
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('option', { name: 'Vietnam' }))
    fireEvent.click(document.activeElement!)
    expect(change).toHaveBeenCalledWith('VN')
    expect(document.activeElement).toBe(trigger)
    expect(submit).not.toHaveBeenCalled()
    fireEvent.click(trigger)
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})
