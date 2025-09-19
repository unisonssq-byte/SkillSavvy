import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertPageSchema, insertBlockSchema } from "@shared/schema";
import { z } from "zod";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type"));
  },
});

// Password validation (simulating password.py)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// WebSocket connections storage
const wsConnections = new Set<WebSocket>();

function broadcastToAll(data: any) {
  const message = JSON.stringify(data);
  wsConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    wsConnections.add(ws);
    
    ws.on('close', () => {
      wsConnections.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsConnections.delete(ws);
    });
  });

  // Static file serving for uploads
  app.use('/uploads', (req, res, next) => {
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(uploadsDir));

  // Admin authentication
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { password } = req.body;
      
      if (password === ADMIN_PASSWORD) {
        const token = Buffer.from(`admin_${Date.now()}`).toString('base64');
        res.json({ success: true, token });
      } else {
        res.status(401).json({ success: false, message: 'Неправильный пароль' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Middleware to verify admin token
  const verifyAdmin = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      if (decoded.startsWith('admin_')) {
        next();
      } else {
        res.status(401).json({ message: 'Invalid token' });
      }
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
    }
  };

  // Page routes
  app.get('/api/pages', async (req, res) => {
    try {
      const pages = await storage.getPages();
      res.json(pages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch pages' });
    }
  });

  app.post('/api/pages', verifyAdmin, async (req, res) => {
    try {
      const pageData = insertPageSchema.parse(req.body);
      const page = await storage.createPage(pageData);
      
      // Broadcast page creation
      broadcastToAll({
        type: 'PAGE_CREATED',
        payload: page,
      });
      
      res.json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid page data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create page' });
      }
    }
  });

  app.put('/api/pages/:id', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertPageSchema.partial().parse(req.body);
      const page = await storage.updatePage(id, updates);
      
      if (!page) {
        return res.status(404).json({ message: 'Page not found' });
      }
      
      // Broadcast page update
      broadcastToAll({
        type: 'PAGE_UPDATED',
        payload: page,
      });
      
      res.json(page);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update page' });
    }
  });

  app.delete('/api/pages/:id', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePage(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Page not found' });
      }
      
      // Broadcast page deletion
      broadcastToAll({
        type: 'PAGE_DELETED',
        payload: { id },
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete page' });
    }
  });

  // Block routes
  app.get('/api/pages/:pageId/blocks', async (req, res) => {
    try {
      const { pageId } = req.params;
      const blocks = await storage.getBlocksByPageId(pageId);
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch blocks' });
    }
  });

  app.post('/api/blocks', verifyAdmin, async (req, res) => {
    try {
      const blockData = insertBlockSchema.parse(req.body);
      const block = await storage.createBlock(blockData);
      
      // Broadcast block creation
      broadcastToAll({
        type: 'BLOCK_CREATED',
        payload: block,
      });
      
      res.json(block);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid block data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create block' });
      }
    }
  });

  app.put('/api/blocks/:id', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertBlockSchema.partial().parse(req.body);
      const block = await storage.updateBlock(id, updates);
      
      if (!block) {
        return res.status(404).json({ message: 'Block not found' });
      }
      
      // Broadcast block update
      broadcastToAll({
        type: 'BLOCK_UPDATED',
        payload: block,
      });
      
      res.json(block);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update block' });
    }
  });

  app.delete('/api/blocks/:id', verifyAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBlock(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Block not found' });
      }
      
      // Broadcast block deletion
      broadcastToAll({
        type: 'BLOCK_DELETED',
        payload: { id },
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete block' });
    }
  });

  // Media upload
  app.post('/api/upload', verifyAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { blockId } = req.body;
      const file = req.file;
      const filename = `${Date.now()}-${file.originalname}`;
      const filepath = path.join(uploadsDir, filename);
      
      // Move file to final location
      fs.renameSync(file.path, filepath);
      
      const media = await storage.createMedia({
        blockId: blockId || null,
        filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/${filename}`,
      });
      
      // Broadcast media upload
      broadcastToAll({
        type: 'MEDIA_UPLOADED',
        payload: media,
      });
      
      res.json(media);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  // Get media for block
  app.get('/api/blocks/:blockId/media', async (req, res) => {
    try {
      const { blockId } = req.params;
      const media = await storage.getMediaByBlockId(blockId);
      res.json(media);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch media' });
    }
  });

  return httpServer;
}
