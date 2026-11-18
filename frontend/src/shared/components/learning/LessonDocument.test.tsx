import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LessonDocument } from './LessonDocument'

beforeEach(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => ({ writeText: vi.fn() }) }) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })
function mount(html: string, vietnamese = false) { return render(<LessonDocument html={html} vi={vietnamese} />) }
describe('document-oriented lesson rendering', () => {
  it('retains authored headings, nested lists, emphasis, tables, dividers and private images', () => {
    const { container } = mount('<h1>Section</h1><h2>Major section</h2><h3>Detail</h3><h4>Example</h4><p>Text<br>Next <strong>important</strong> <em>emphasis</em> <code>value</code></p><ol start="3"><li>First<ul><li>Nested</li></ul></li></ol><hr><table><thead><tr><th>Column</th></tr></thead><tbody><tr><td colspan="2">Cell</td></tr></tbody></table><img alt="Diagram" src="/api/v1/module-management/assets/12345678-1234-1234-1234-123456789012">')
    expect(screen.getByRole('heading', { level: 2, name: 'Section' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 4, name: 'Example' })).toBeTruthy()
    expect(container.querySelector('ol')?.start).toBe(3)
    expect(container.querySelector('ol ul li')?.textContent).toBe('Nested')
    expect(container.querySelector('strong')?.textContent).toBe('important')
    expect(container.querySelector('em')?.textContent).toBe('emphasis')
    expect(container.querySelector('br')).toBeTruthy()
    expect(screen.getByRole('separator')).toBeTruthy()
    expect(screen.getByRole('cell', { name: 'Cell' }).getAttribute('colspan')).toBe('2')
    expect(screen.getByRole('img', { name: 'Diagram' }).getAttribute('src')).toContain('/assets/')
  })
  it('highlights declared languages without executing code and copies the original text exactly', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText } as unknown as Clipboard)
    const { container } = mount('<pre><code class="language-javascript">const text = "&lt;script&gt;alert(1)&lt;/script&gt;";\n</code></pre>')
    expect(container.querySelector('.hljs-keyword')?.textContent).toBe('const')
    expect(container.querySelector('script')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Copy code: JavaScript' }))
    await screen.findByText('Copied')
    expect(writeText).toHaveBeenCalledWith('const text = "<script>alert(1)</script>";\n')
  })
  it('does not carry a copied confirmation into different lesson code', async () => {
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText: vi.fn().mockResolvedValue(undefined) } as unknown as Clipboard)
    const mounted = mount('<pre><code class="language-sql">SELECT 1;</code></pre>')
    fireEvent.click(screen.getByRole('button', { name: 'Copy code: SQL' }))
    await screen.findByText('Copied')
    mounted.rerender(<LessonDocument html={'<pre><code class="language-sql">SELECT 2;</code></pre>'} vi={false} />)
    expect(screen.queryByText('Copied')).toBeNull()
    expect(screen.getByRole('button', { name: 'Copy code: SQL' }).textContent).toContain('Copy')
  })
  it('supports Cypher while preserving unknown and unlabelled code as plain text', () => {
    const { container } = mount('<pre><code class="language-cypher">MATCH (n:Skill) RETURN n</code></pre><pre><code class="language-unknown">&lt;node&gt;</code></pre><pre>raw &amp; literal</pre>')
    expect(container.querySelector('.hljs-keyword')?.textContent).toBe('MATCH')
    expect(screen.getByLabelText('unknown code').textContent).toBe('<node>')
    expect(screen.getByLabelText('Code code').textContent).toBe('raw & literal')
    expect(screen.getAllByRole('button', { name: /Copy code:/ })).toHaveLength(3)
  })
  it('renders explicit callout markers and leaves ordinary blockquotes intact', () => {
    const { container } = mount('<blockquote><p>[!NOTE]\nInformation body</p></blockquote><blockquote><p>[!IMPORTANT]\nImportant body</p></blockquote><blockquote><p>[!WARNING]\nWarning body</p></blockquote><blockquote><p>[!TIP]\nTip body</p></blockquote><blockquote><p>Ordinary quotation</p></blockquote>')
    for (const label of ['Information', 'Important note', 'Warning', 'Best practice']) expect(screen.getByRole('complementary', { name: label })).toBeTruthy()
    expect(container.querySelector('blockquote')?.textContent).toBe('Ordinary quotation')
    expect(screen.queryByText(/\[!NOTE\]/)).toBeNull()
    expect(screen.getByText('Information body')).toBeTruthy()
  })
  it('keeps plain text readable and drops unsafe attributes and resource URLs', () => {
    const { container } = mount('<p>No formatting required.</p><a href="javascript:alert(1)" onclick="alert(1)">Unsafe link</a><img src="https://tracking.test/pixel" onerror="alert(1)"><script>alert(1)</script><iframe src="https://tracking.test"></iframe>')
    expect(screen.getByText('No formatting required.')).toBeTruthy()
    expect(screen.getByText('Unsafe link').getAttribute('href')).toBeNull()
    expect(container.querySelector('script, iframe, img, [onclick], [onerror]')).toBeNull()
  })
  it('reports clipboard failure truthfully and localizes controls', async () => {
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText: vi.fn().mockRejectedValue(new Error('Denied')) } as unknown as Clipboard)
    mount('<pre><code class="language-sql">SELECT 1;</code></pre><blockquote><p>[!WARNING]\nCẩn thận</p></blockquote>', true)
    fireEvent.click(screen.getByRole('button', { name: 'Sao chép mã: SQL' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Không thể sao chép'))
    expect(screen.getByRole('complementary', { name: 'Cảnh báo' })).toBeTruthy()
    expect(screen.queryByText('Đã sao chép')).toBeNull()
  })
})

it('builds contents from real headings and focuses the matching section', () => {
  const scroll = vi.fn()
  HTMLElement.prototype.scrollIntoView = scroll
  mount('<h2>First topic</h2><p>Content</p><h3>Second topic</h3>')
  const link = screen.getByRole('link', { name: 'Second topic' })
  const heading = screen.getByRole('heading', { name: 'Second topic' })
  expect(link.getAttribute('href')).toBe(`#${heading.id}`)
  expect(screen.getByRole('link', { name: 'First topic' }).getAttribute('aria-current')).toBe('location')
  fireEvent.click(link)
  expect(link.getAttribute('aria-current')).toBe('location')
  expect(screen.getByRole('link', { name: 'First topic' }).getAttribute('aria-current')).toBeNull()
  expect(scroll).toHaveBeenCalled()
  expect(document.activeElement).toBe(heading)
})
