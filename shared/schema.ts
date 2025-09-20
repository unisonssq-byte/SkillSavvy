import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blocks = pgTable("blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: varchar("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id"), // references blocks.id via application logic
  type: text("type").notNull(), // "text", "media", "text_media"
  side: text("side"), // "left", "right", null for main blocks
  content: jsonb("content").notNull(), // flexible content structure
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const media = pgTable("media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockId: varchar("block_id").references(() => blocks.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimetype: text("mimetype").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  position: text("position").default("bottom"), // "bottom", "right"
  order: integer("order").default(0),
  width: integer("width").default(300), // для изображений справа
  createdAt: timestamp("created_at").defaultNow(),
});


export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Relations
export const pagesRelations = relations(pages, ({ many }) => ({
  blocks: many(blocks),
}));

export const blocksRelations = relations(blocks, ({ one, many }) => ({
  page: one(pages, {
    fields: [blocks.pageId],
    references: [pages.id],
  }),
  parent: one(blocks, {
    fields: [blocks.parentId],
    references: [blocks.id],
    relationName: "parent",
  }),
  children: many(blocks, {
    relationName: "parent",
  }),
  media: many(media),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  block: one(blocks, {
    fields: [media.blockId],
    references: [blocks.id],
  }),
}));


// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPageSchema = createInsertSchema(pages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockSchema = createInsertSchema(blocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMediaSchema = createInsertSchema(media).omit({
  id: true,
  createdAt: true,
}).extend({
  position: z.enum(["bottom", "right"]).default("bottom"),
  width: z.number().min(100).max(800).optional(),
});


// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;

export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;

export type Media = typeof media.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;

