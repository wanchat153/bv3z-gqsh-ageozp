import { createServer } from 'vite'; import puppeteer from 'puppeteer-core'; import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '..'), out = process.argv[2] || 'sheet.png'
const s = await createServer({ root, logLevel: 'error', server: { port: 0, hmr: false } }); await s.listen()
const b = await puppeteer.launch({ executablePath: process.env.CHROME, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const p = await b.newPage(); await p.setViewport({ width: 1920, height: 1080 }); p.on('pageerror', e => console.log('pageerror', e.message)); p.on('console', m => console.log('log', m.text()))
await p.goto(s.resolvedUrls.local[0] + (process.argv[3]||'sheet.html'), { waitUntil: 'networkidle0' }); await p.waitForFunction('window.READY', { timeout: 60000 })
await p.screenshot({ path: out }); await b.close(); await s.close(); console.log('ok')
