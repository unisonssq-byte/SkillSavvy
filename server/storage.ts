import {
  users,
  pages,
  blocks,
  media,
  type User,
  type InsertUser,
  type Page,
  type InsertPage,
  type Block,
  type InsertBlock,
  type Media,
  type InsertMedia,
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc, isNull, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Page operations
  getPages(): Promise<Page[]>;
  getPage(id: string): Promise<Page | undefined>;
  getPageBySlug(slug: string): Promise<Page | undefined>;
  createPage(page: InsertPage, tx?: any): Promise<Page>;
  updatePage(id: string, updates: Partial<InsertPage>, tx?: any): Promise<Page | undefined>;
  deletePage(id: string, tx?: any): Promise<boolean>;
  
  // Block operations
  getBlocksByPageId(pageId: string): Promise<Block[]>;
  getChildBlocks(parentId: string): Promise<Block[]>;
  getBlock(id: string): Promise<Block | undefined>;
  createBlock(block: InsertBlock, tx?: any): Promise<Block>;
  updateBlock(id: string, updates: Partial<InsertBlock>, tx?: any): Promise<Block | undefined>;
  deleteBlock(id: string, tx?: any): Promise<boolean>;
  
  // Media operations
  getMediaByBlockId(blockId: string): Promise<Media[]>;
  createMedia(media: InsertMedia, tx?: any): Promise<Media>;
  deleteMedia(id: string, tx?: any): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Page operations
  async getPages(): Promise<Page[]> {
    return await db.select().from(pages).where(eq(pages.isActive, true)).orderBy(asc(pages.order));
  }

  async getPage(id: string): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(eq(pages.id, id));
    return page || undefined;
  }

  async getPageBySlug(slug: string): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(eq(pages.slug, slug));
    return page || undefined;
  }

  async createPage(insertPage: InsertPage, tx?: any): Promise<Page> {
    const dbContext = tx || db;
    const [page] = await dbContext.insert(pages).values({
      ...insertPage,
      updatedAt: new Date(),
    }).returning();
    return page;
  }

  async updatePage(id: string, updates: Partial<InsertPage>, tx?: any): Promise<Page | undefined> {
    const dbContext = tx || db;
    const [page] = await dbContext
      .update(pages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();
    return page || undefined;
  }

  async deletePage(id: string, tx?: any): Promise<boolean> {
    const dbContext = tx || db;
    const result = await dbContext.delete(pages).where(eq(pages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Block operations
  async getBlocksByPageId(pageId: string): Promise<Block[]> {
    return await db.select().from(blocks)
      .where(and(eq(blocks.pageId, pageId), isNull(blocks.parentId)))
      .orderBy(asc(blocks.order));
  }

  async getChildBlocks(parentId: string, tx?: any): Promise<Block[]> {
    const dbContext = tx || db;
    return await dbContext.select().from(blocks)
      .where(eq(blocks.parentId, parentId))
      .orderBy(asc(blocks.order));
  }

  async getBlock(id: string, tx?: any): Promise<Block | undefined> {
    const dbContext = tx || db;
    const [block] = await dbContext.select().from(blocks).where(eq(blocks.id, id));
    return block || undefined;
  }

  async createBlock(insertBlock: InsertBlock, tx?: any): Promise<Block> {
    // Validate parent-child relationship
    if (insertBlock.parentId) {
      const parent = await this.getBlock(insertBlock.parentId, tx);
      if (!parent) {
        throw new Error("Parent block not found");
      }
      if (parent.pageId !== insertBlock.pageId) {
        throw new Error("Parent and child blocks must belong to the same page");
      }
    }

    const dbContext = tx || db;
    const [block] = await dbContext.insert(blocks).values({
      ...insertBlock,
      updatedAt: new Date(),
    }).returning();
    return block;
  }

  async updateBlock(id: string, updates: Partial<InsertBlock>, tx?: any): Promise<Block | undefined> {
    const currentBlock = await this.getBlock(id, tx);
    if (!currentBlock) {
      throw new Error("Block not found");
    }

    // Validate pageId changes
    if (updates.pageId !== undefined && updates.pageId !== currentBlock.pageId) {
      // If block has a parent, ensure parent is on the same target page
      if (currentBlock.parentId) {
        const parent = await this.getBlock(currentBlock.parentId, tx);
        if (parent && parent.pageId !== updates.pageId) {
          throw new Error("Cannot move block to different page than its parent");
        }
      }
      
      // If block has children, reject the operation as it would break subtree consistency
      const children = await this.getChildBlocks(id, tx);
      if (children.length > 0) {
        throw new Error("Cannot move a block with children to a different page. Move the entire subtree instead.");
      }
    }

    // Validate parent-child relationship if parentId is being updated
    if (updates.parentId !== undefined) {
      // Prevent self-reference
      if (updates.parentId === id) {
        throw new Error("Block cannot be its own parent");
      }
      
      // Validate parent exists and belongs to same page
      if (updates.parentId) {
        const parent = await this.getBlock(updates.parentId, tx);
        if (!parent) {
          throw new Error("Parent block not found");
        }
        
        // Check page consistency
        const targetPageId = updates.pageId ?? currentBlock.pageId;
        if (parent.pageId !== targetPageId) {
          throw new Error("Parent and child blocks must belong to the same page");
        }
        
        // Prevent cycles by checking if proposed parent is a descendant of current block
        if (await this.isDescendant(id, updates.parentId, tx)) {
          throw new Error("Cannot create circular parent-child relationship");
        }
      }
    }

    const dbContext = tx || db;
    const [block] = await dbContext
      .update(blocks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blocks.id, id))
      .returning();
    return block || undefined;
  }

  // Helper method to check if a block is a descendant of another
  private async isDescendant(ancestorId: string, blockId: string, tx?: any): Promise<boolean> {
    const children = await this.getChildBlocks(ancestorId, tx);
    for (const child of children) {
      if (child.id === blockId) {
        return true;
      }
      if (await this.isDescendant(child.id, blockId, tx)) {
        return true;
      }
    }
    return false;
  }

  async deleteBlock(id: string, tx?: any): Promise<boolean> {
    try {
      if (tx) {
        // Use provided transaction
        const children = await tx.select().from(blocks).where(eq(blocks.parentId, id));
        for (const child of children) {
          await this.deleteBlockInTransaction(tx, child.id);
        }
        
        const deleteResult = await tx.delete(blocks).where(eq(blocks.id, id));
        return (deleteResult.rowCount ?? 0) > 0;
      } else {
        // Create own transaction
        const result = await db.transaction(async (innerTx) => {
          const children = await innerTx.select().from(blocks).where(eq(blocks.parentId, id));
          for (const child of children) {
            await this.deleteBlockInTransaction(innerTx, child.id);
          }
          
          const deleteResult = await innerTx.delete(blocks).where(eq(blocks.id, id));
          return deleteResult.rowCount ?? 0;
        });
        
        return result > 0;
      }
    } catch (error) {
      console.error('Failed to delete block:', error);
      return false;
    }
  }

  // Helper method for transactional deletion
  private async deleteBlockInTransaction(tx: any, id: string): Promise<void> {
    // Recursively delete children first
    const children = await tx.select().from(blocks).where(eq(blocks.parentId, id));
    for (const child of children) {
      await this.deleteBlockInTransaction(tx, child.id);
    }
    
    // Then delete the block itself
    await tx.delete(blocks).where(eq(blocks.id, id));
  }

  // Media operations
  async getMediaByBlockId(blockId: string): Promise<Media[]> {
    return await db.select().from(media)
      .where(eq(media.blockId, blockId))
      .orderBy(media.order, media.createdAt);
  }

  async createMedia(insertMedia: InsertMedia, tx?: any): Promise<Media> {
    const dbContext = tx || db;
    const [mediaItem] = await dbContext.insert(media).values(insertMedia).returning();
    return mediaItem;
  }

  async deleteMedia(id: string, tx?: any): Promise<boolean> {
    const dbContext = tx || db;
    const result = await dbContext.delete(media).where(eq(media.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateMediaOrder(id: string, newOrder: number, tx?: any): Promise<Media | undefined> {
    const dbContext = tx || db;
    const [mediaItem] = await dbContext
      .update(media)
      .set({ order: newOrder })
      .where(eq(media.id, id))
      .returning();
    return mediaItem;
  }

  async reorderMedia(blockId: string, mediaOrderUpdates: { id: string; order: number }[], tx?: any): Promise<Media[]> {
    if (tx) {
      // Use provided transaction
      return await this.reorderMediaInTransaction(tx, blockId, mediaOrderUpdates);
    } else {
      // Create own transaction for atomicity
      return await db.transaction(async (innerTx) => {
        return await this.reorderMediaInTransaction(innerTx, blockId, mediaOrderUpdates);
      });
    }
  }

  private async reorderMediaInTransaction(tx: any, blockId: string, mediaOrderUpdates: { id: string; order: number }[]): Promise<Media[]> {
    // Security validation: Verify all media IDs belong to the specified block
    const mediaIds = mediaOrderUpdates.map(update => update.id);
    const existingMedia = await tx
      .select({ id: media.id })
      .from(media)
      .where(eq(media.blockId, blockId));
    
    const validMediaIds = new Set(existingMedia.map(m => m.id));
    const invalidIds = mediaIds.filter(id => !validMediaIds.has(id));
    
    if (invalidIds.length > 0) {
      throw new Error(`Media IDs do not belong to block ${blockId}: ${invalidIds.join(', ')}`);
    }
    
    // Update each media item's order atomically
    for (const update of mediaOrderUpdates) {
      await tx
        .update(media)
        .set({ order: update.order })
        .where(eq(media.id, update.id));
    }
    
    // Return the updated media list using the same transaction
    return await tx
      .select()
      .from(media)
      .where(eq(media.blockId, blockId))
      .orderBy(asc(media.order), asc(media.createdAt));
  }
}

export const storage = new DatabaseStorage();
