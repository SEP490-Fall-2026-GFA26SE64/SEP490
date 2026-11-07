import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Combobox } from './Combobox'

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
})
