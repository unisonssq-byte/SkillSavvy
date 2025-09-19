import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { db } from "./db";
import { insertPageSchema, insertBlockSchema, insertMediaSchema } from "@shared/schema";
import { z } from "zod";

// Batch operation schemas
const batchOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("page_create"),
    data: insertPageSchema,
  }),
  z.object({
    type: z.literal("page_update"),
    id: z.string(),
    data: insertPageSchema.partial(),
  }),
  z.object({
    type: z.literal("page_delete"),
    id: z.string(),
  }),
  z.object({
    type: z.literal("block_create"),
    data: insertBlockSchema,
  }),
  z.object({
    type: z.literal("block_update"),
    id: z.string(),
    data: insertBlockSchema.partial(),
  }),
  z.object({
    type: z.literal("block_delete"),
    id: z.string(),
  }),
  z.object({
    type: z.literal("media_create"),
    data: insertMediaSchema,
  }),
  z.object({
    type: z.literal("media_delete"),
    id: z.string(),
  }),
]);

const batchRequestSchema = z.object({
  operations: z.array(batchOperationSchema),
});

const execAsync = promisify(exec);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
const thumbnailsDir = path.join(uploadsDir, "thumbnails");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
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
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "unicode2024!";

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

// Generate video thumbnail
async function generateVideoThumbnail(videoPath: string, thumbnailPath: string): Promise<void> {
  try {
    await execAsync(`ffmpeg -i "${videoPath}" -ss 00:00:01.000 -vframes 1 -q:v 2 "${thumbnailPath}"`);
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    throw error;
  }
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

  // Batch operations endpoint
  app.post('/api/batch', verifyAdmin, async (req, res) => {
    try {
      const { operations } = batchRequestSchema.parse(req.body);
      
      if (operations.length === 0) {
        return res.status(400).json({ message: 'No operations provided' });
      }

      const results: any[] = [];
      const broadcastEvents: any[] = [];

      // Process all operations in a single transaction
      await db.transaction(async (tx) => {
        for (const operation of operations) {
          try {
            let result: any;

            switch (operation.type) {
              case 'page_create':
                result = await storage.createPage(operation.data, tx);
                broadcastEvents.push({
                  type: 'PAGE_CREATED',
                  payload: result,
                });
                break;
              case 'page_update':
                result = await storage.updatePage(operation.id, operation.data, tx);
                if (!result) {
                  throw new Error(`Page ${operation.id} not found`);
                }
                broadcastEvents.push({
                  type: 'PAGE_UPDATED',
                  payload: result,
                });
                break;
              case 'page_delete':
                const pageDeleted = await storage.deletePage(operation.id, tx);
                if (!pageDeleted) {
                  throw new Error(`Page ${operation.id} not found`);
                }
                result = { success: true };
                broadcastEvents.push({
                  type: 'PAGE_DELETED',
                  payload: { id: operation.id },
                });
                break;
              case 'block_create':
                result = await storage.createBlock(operation.data, tx);
                broadcastEvents.push({
                  type: 'BLOCK_CREATED',
                  payload: result,
                });
                break;
              case 'block_update':
                result = await storage.updateBlock(operation.id, operation.data, tx);
                if (!result) {
                  throw new Error(`Block ${operation.id} not found`);
                }
                broadcastEvents.push({
                  type: 'BLOCK_UPDATED',
                  payload: result,
                });
                break;
              case 'block_delete':
                const blockDeleted = await storage.deleteBlock(operation.id, tx);
                if (!blockDeleted) {
                  throw new Error(`Block ${operation.id} not found`);
                }
                result = { success: true };
                broadcastEvents.push({
                  type: 'BLOCK_DELETED',
                  payload: { id: operation.id },
                });
                break;
              case 'media_create':
                result = await storage.createMedia(operation.data, tx);
                broadcastEvents.push({
                  type: 'MEDIA_CREATED',
                  payload: result,
                });
                break;
              case 'media_delete':
                const mediaDeleted = await storage.deleteMedia(operation.id, tx);
                if (!mediaDeleted) {
                  throw new Error(`Media ${operation.id} not found`);
                }
                result = { success: true };
                broadcastEvents.push({
                  type: 'MEDIA_DELETED',
                  payload: { id: operation.id },
                });
                break;
            }

            results.push({
              operation,
              result,
              success: true,
            });
          } catch (error) {
            // If any operation fails, the entire transaction will be rolled back
            throw new Error(`Operation failed: ${(error as Error).message}`);
          }
        }
      });

      // If we reach here, all operations succeeded. Now broadcast all events.
      broadcastEvents.forEach(event => {
        broadcastToAll(event);
      });

      res.json({
        success: true,
        results,
        message: `Successfully processed ${operations.length} operations`,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          message: 'Invalid batch request', 
          errors: error.errors 
        });
      } else {
        res.status(500).json({ 
          message: 'Batch operation failed', 
          error: (error as Error).message 
        });
      }
    }
  });

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
      
      let thumbnailUrl = null;
      
      // Generate thumbnail for videos
      if (file.mimetype.startsWith('video/')) {
        try {
          const thumbnailFilename = `thumb_${Date.now()}.jpg`;
          const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
          await generateVideoThumbnail(filepath, thumbnailPath);
          thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
        } catch (error) {
          console.error('Failed to generate video thumbnail:', error);
        }
      }
      
      const media = await storage.createMedia({
        blockId: blockId || null,
        filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/${filename}`,
        thumbnailUrl,
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
