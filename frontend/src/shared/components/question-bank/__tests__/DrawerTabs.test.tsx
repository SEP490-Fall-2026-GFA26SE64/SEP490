import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/Tabs'
afterEach(cleanup)
function Example() { const [tab, setTab] = useState('content'); return <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="content">Content</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList><TabsContent value="content">Current content</TabsContent><TabsContent value="history">Recorded history</TabsContent></Tabs> }
it('keeps associated panels and keyboard navigation in the shared Tabs', () => {
 render(<Example />)
 const content = screen.getByRole('tab', { name: 'Content' })
 content.focus(); fireEvent.keyDown(content, { key: 'ArrowRight' })
 const history = screen.getByRole('tab', { name: 'History' })
 expect(history.getAttribute('aria-selected')).toBe('true')
 expect(document.activeElement).toBe(history)
 expect(screen.getByRole('tabpanel', { name: 'History' }).id).toBe(history.getAttribute('aria-controls'))
 fireEvent.keyDown(history, { key: 'Home' })
 expect(screen.getByRole('tabpanel', { name: 'Content' })).toBeTruthy()
})
