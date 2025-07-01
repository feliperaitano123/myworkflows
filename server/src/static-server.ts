import express from 'express';
import path from 'path';

export function setupStaticServer(app: express.Application) {
  // Serve static files from the dist directory
  const distPath = path.resolve(process.cwd(), 'dist');
  
  app.use(express.static(distPath));
  
  // Handle client-side routing - send all routes to index.html
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return;
    }
    
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  console.log('Static file server configured to serve from:', distPath);
}