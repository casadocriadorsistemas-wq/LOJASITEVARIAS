import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function firebaseConfigPlugin(): Plugin {
  return {
    name: 'firebase-config-api',
    configureServer(server) {
      server.middlewares.use('/api/save-firebase-config', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              fs.writeFileSync(
                path.resolve(__dirname, 'firebase-applet-config.json'),
                JSON.stringify(data, null, 2),
                'utf8'
              );
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, message: 'Arquivo firebase-applet-config.json atualizado com sucesso no disco!' }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else if (req.method === 'GET') {
          try {
            const raw = fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf8');
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(raw);
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });
    }
  };
}

function htmlMetaPlugin(): Plugin {
  return {
    name: 'html-meta-api',
    configureServer(server) {
      server.middlewares.use('/api/update-html-meta', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const { storeName, description } = JSON.parse(body);
              if (storeName && description) {
                const indexPath = path.resolve(__dirname, 'index.html');
                if (fs.existsSync(indexPath)) {
                  let html = fs.readFileSync(indexPath, 'utf8');
                  const safeName = String(storeName).replace(/"/g, '&quot;');
                  const safeDesc = String(description).replace(/"/g, '&quot;');
                  html = html.replace(/<title>.*?<\/title>/s, `<title>${safeName}</title>`);
                  html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/>/s, `<meta name="description" content="${safeDesc}" />`);
                  html = html.replace(/<meta\s+property="og:site_name"\s+content=".*?"\s*\/>/s, `<meta property="og:site_name" content="${safeName}" />`);
                  html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/>/s, `<meta property="og:title" content="${safeName}" />`);
                  html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/>/s, `<meta property="og:description" content="${safeDesc}" />`);
                  html = html.replace(/<meta\s+name="twitter:title"\s+content=".*?"\s*\/>/s, `<meta name="twitter:title" content="${safeName}" />`);
                  html = html.replace(/<meta\s+name="twitter:description"\s+content=".*?"\s*\/>/s, `<meta name="twitter:description" content="${safeDesc}" />`);
                  html = html.replace(/<meta\s+itemprop="name"\s+content=".*?"\s*\/>/s, `<meta itemprop="name" content="${safeName}" />`);
                  html = html.replace(/<meta\s+itemprop="description"\s+content=".*?"\s*\/>/s, `<meta itemprop="description" content="${safeDesc}" />`);
                  fs.writeFileSync(indexPath, html, 'utf8');
                }
              }
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), firebaseConfigPlugin(), htmlMetaPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
