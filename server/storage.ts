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
import { eq, asc, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Page operations
  getPages(): Promise<Page[]>;
  getPage(id: string): Promise<Page | undefined>;
  getPageBySlug(slug: string): Promise<Page | undefined>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: string, updates: Partial<InsertPage>): Promise<Page | undefined>;
  deletePage(id: string): Promise<boolean>;
  
  // Block operations
  getBlocksByPageId(pageId: string): Promise<Block[]>;
  getBlock(id: string): Promise<Block | undefined>;
  createBlock(block: InsertBlock): Promise<Block>;
  updateBlock(id: string, updates: Partial<InsertBlock>): Promise<Block | undefined>;
  deleteBlock(id: string): Promise<boolean>;
  
  // Media operations
  getMediaByBlockId(blockId: string): Promise<Media[]>;
  createMedia(media: InsertMedia): Promise<Media>;
  deleteMedia(id: string): Promise<boolean>;
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

  async createPage(insertPage: InsertPage): Promise<Page> {
    const [page] = await db.insert(pages).values({
      ...insertPage,
      updatedAt: new Date(),
    }).returning();
    return page;
  }

  async updatePage(id: string, updates: Partial<InsertPage>): Promise<Page | undefined> {
    const [page] = await db
      .update(pages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning();
    return page || undefined;
  }

  async deletePage(id: string): Promise<boolean> {
    const result = await db.delete(pages).where(eq(pages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Block operations
  async getBlocksByPageId(pageId: string): Promise<Block[]> {
    return await db.select().from(blocks).where(eq(blocks.pageId, pageId)).orderBy(asc(blocks.order));
  }

  async getBlock(id: string): Promise<Block | undefined> {
    const [block] = await db.select().from(blocks).where(eq(blocks.id, id));
    return block || undefined;
  }

  async createBlock(insertBlock: InsertBlock): Promise<Block> {
    const [block] = await db.insert(blocks).values({
      ...insertBlock,
      updatedAt: new Date(),
    }).returning();
    return block;
  }

  async updateBlock(id: string, updates: Partial<InsertBlock>): Promise<Block | undefined> {
    const [block] = await db
      .update(blocks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blocks.id, id))
      .returning();
    return block || undefined;
  }

  async deleteBlock(id: string): Promise<boolean> {
    const result = await db.delete(blocks).where(eq(blocks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Media operations
  async getMediaByBlockId(blockId: string): Promise<Media[]> {
    return await db.select().from(media).where(eq(media.blockId, blockId));
  }

  async createMedia(insertMedia: InsertMedia): Promise<Media> {
    const [mediaItem] = await db.insert(media).values(insertMedia).returning();
    return mediaItem;
  }

  async deleteMedia(id: string): Promise<boolean> {
    const result = await db.delete(media).where(eq(media.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
