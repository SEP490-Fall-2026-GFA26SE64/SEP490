import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../frontend/', import.meta.url))
const require = createRequire(`${root}/package.json`)
const { createServer } = await import(pathToFileURL(require.resolve('vite')))
const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')))
const { default: tailwind } = await import(pathToFileURL(require.resolve('@tailwindcss/vite')))

const entry = `import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {PlatformRq3BenchmarkPage} from '/src/features/platform-admin/PlatformRq3BenchmarkPage.tsx';
import {LanguageProvider} from '/src/shared/i18n/LanguageContext';
import {ToastProvider} from '/src/shared/hooks/useToast';
import {Toaster} from '/src/shared/components/ui/Toast.tsx';
import {WorkspaceSessionContext} from '/src/shared/auth/workspaceSession';
import '/src/app/styles.css';
localStorage.setItem('app_language','vi');
createRoot(document.getElementById('root')).render(
  React.createElement(MemoryRouter,{initialEntries:['/platform-admin/rq3-benchmark']},
    React.createElement(ToastProvider,null,
      React.createElement(LanguageProvider,null,
        React.createElement(WorkspaceSessionContext.Provider,{
          value:{
            identity:{fullName:'Platform Admin',email:'platform.admin@adaptlearngraph.com',organizationId:null,organizationName:null,roles:['PLATFORM_ADMINISTRATOR']},
            onSignOut:async()=>{}
          }
        },
        React.createElement(React.Fragment,null,
          React.createElement(PlatformRq3BenchmarkPage),
          React.createElement(Toaster)
        ))
      )
    )
  )
);`

const server = await createServer({
  root,
  configFile: false,
  plugins: [
    react(),
    tailwind(),
    {
      name: 'isolated-rq3-review',
      resolveId(id) {
        if (id === '/rq3-review-entry.js') return '\0rq3-review-entry'
      },
      load(id) {
        if (id === '\0rq3-review-entry') return entry
      },
      configureServer(srv) {
        srv.middlewares.use(async (req, res, next) => {
          if (req.url !== '/rq3-review.html') return next()
          res.setHeader('Content-Type', 'text/html')
          res.end(
            await srv.transformIndexHtml(
              req.url,
              '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/rq3-review-entry.js"></script></body></html>',
            ),
          )
        })
      },
    },
  ],
  server: { host: '127.0.0.1', port: 4183, strictPort: true },
})
await server.listen()
console.log('Isolated RQ3 browser review http://127.0.0.1:4183/rq3-review.html')
