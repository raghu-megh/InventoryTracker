import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurants (tenants)
export const restaurants = pgTable("restaurants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  cloverMerchantId: varchar("clover_merchant_id", { length: 255 }).notNull().unique(),
  webhookSecret: varchar("webhook_secret", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User restaurant relationships (many-to-many)
export const userRestaurants = pgTable("user_restaurants", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull().default("user"), // user, manager, admin
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory categories
export const inventoryCategories = pgTable("inventory_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory items
export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => inventoryCategories.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  description: text("description"),
  unit: varchar("unit", { length: 50 }).notNull(), // lbs, oz, pieces, etc.
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }).notNull().default("0"),
  minLevel: decimal("min_level", { precision: 10, scale: 2 }).notNull().default("0"),
  maxLevel: decimal("max_level", { precision: 10, scale: 2 }),
  costPerUnit: decimal("cost_per_unit", { precision: 10, scale: 2 }),
  cloverItemId: varchar("clover_item_id", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Webhook events log
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  cloverObjectId: varchar("clover_object_id", { length: 255 }),
  payload: jsonb("payload").notNull(),
  processed: boolean("processed").default(false),
  processingError: text("processing_error"),
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Stock movements (track inventory changes)
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id, { onDelete: "cascade" }),
  movementType: varchar("movement_type", { length: 50 }).notNull(), // sale, purchase, adjustment, waste
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  previousStock: decimal("previous_stock", { precision: 10, scale: 2 }).notNull(),
  newStock: decimal("new_stock", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  cloverOrderId: varchar("clover_order_id", { length: 255 }),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales data from Clover
export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  cloverOrderId: varchar("clover_order_id", { length: 255 }).notNull(),
  cloverPaymentId: varchar("clover_payment_id", { length: 255 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }),
  tip: decimal("tip", { precision: 10, scale: 2 }),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  saleDate: timestamp("sale_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Raw material categories (Proteins, Vegetables, Grains, etc.)
export const rawMaterialCategories = pgTable("raw_material_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Raw materials (flour, tomatoes, cheese, etc.) - always stored in metric units
export const rawMaterials = pgTable("raw_materials", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => rawMaterialCategories.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }),
  baseUnit: varchar("base_unit", { length: 20 }).notNull(), // Always metric: kg, l, ml, g, pieces
  currentStock: decimal("current_stock", { precision: 10, scale: 3 }).notNull().default("0"),
  minLevel: decimal("min_level", { precision: 10, scale: 3 }).notNull().default("0"),
  maxLevel: decimal("max_level", { precision: 10, scale: 3 }),
  costPerUnit: decimal("cost_per_unit", { precision: 10, scale: 2 }), // Cost per base unit
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Finished products/recipes (Large Pizza, Medium Pizza, etc.)
export const recipes = pgTable("recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // Pizza, Pasta, Salad, etc.
  servings: integer("servings").default(1), // Number of servings
  prepTime: integer("prep_time"), // minutes
  cookTime: integer("cook_time"), // minutes  
  difficulty: varchar("difficulty", { length: 20 }), // easy, medium, hard
  instructions: text("instructions"), // Cooking instructions
  costPerServing: decimal("cost_per_serving", { precision: 10, scale: 2 }),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipe ingredients (what raw materials and quantities are needed for each recipe)
export const recipeIngredients = pgTable("recipe_ingredients", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipeId: uuid("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  rawMaterialId: uuid("raw_material_id").notNull().references(() => rawMaterials.id, { onDelete: "cascade" }),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(), // Quantity in metric units
  unit: varchar("unit", { length: 20 }), // Unit (always metric: kg, g, l, ml, pieces)
  notes: text("notes"), // Optional cooking notes
  createdAt: timestamp("created_at").defaultNow(),
});

// Unit conversion table for handling different input units
export const unitConversions = pgTable("unit_conversions", {
  id: uuid("id").defaultRandom().primaryKey(),
  fromUnit: varchar("from_unit", { length: 20 }).notNull(), // lbs, oz, cups, tbsp, etc.
  toUnit: varchar("to_unit", { length: 20 }).notNull(), // kg, g, ml, l, etc.
  conversionFactor: decimal("conversion_factor", { precision: 15, scale: 8 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(), // weight, volume, count
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userRestaurants: many(userRestaurants),
  stockMovements: many(stockMovements),
}));

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  userRestaurants: many(userRestaurants),
  inventoryCategories: many(inventoryCategories),
  inventoryItems: many(inventoryItems),
  rawMaterialCategories: many(rawMaterialCategories),
  rawMaterials: many(rawMaterials),
  recipes: many(recipes),
  webhookEvents: many(webhookEvents),
  sales: many(sales),
}));

export const userRestaurantsRelations = relations(userRestaurants, ({ one }) => ({
  user: one(users, {
    fields: [userRestaurants.userId],
    references: [users.id],
  }),
  restaurant: one(restaurants, {
    fields: [userRestaurants.restaurantId],
    references: [restaurants.id],
  }),
}));

export const inventoryCategoriesRelations = relations(inventoryCategories, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [inventoryCategories.restaurantId],
    references: [restaurants.id],
  }),
  inventoryItems: many(inventoryItems),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [inventoryItems.restaurantId],
    references: [restaurants.id],
  }),
  category: one(inventoryCategories, {
    fields: [inventoryItems.categoryId],
    references: [inventoryCategories.id],
  }),
  stockMovements: many(stockMovements),
}));

export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [webhookEvents.restaurantId],
    references: [restaurants.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [stockMovements.inventoryItemId],
    references: [inventoryItems.id],
  }),
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id],
  }),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [sales.restaurantId],
    references: [restaurants.id],
  }),
}));

// New relations for recipe system
export const rawMaterialCategoriesRelations = relations(rawMaterialCategories, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [rawMaterialCategories.restaurantId],
    references: [restaurants.id],
  }),
  rawMaterials: many(rawMaterials),
}));

export const rawMaterialsRelations = relations(rawMaterials, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [rawMaterials.restaurantId],
    references: [restaurants.id],
  }),
  category: one(rawMaterialCategories, {
    fields: [rawMaterials.categoryId],
    references: [rawMaterialCategories.id],
  }),
  recipeIngredients: many(recipeIngredients),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [recipes.restaurantId],
    references: [restaurants.id],
  }),
  ingredients: many(recipeIngredients),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
  rawMaterial: one(rawMaterials, {
    fields: [recipeIngredients.rawMaterialId],
    references: [rawMaterials.id],
  }),
}));

// Insert schemas
export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRestaurantSchema = createInsertSchema(userRestaurants).omit({
  id: true,
  createdAt: true,
});

export const insertInventoryCategorySchema = createInsertSchema(inventoryCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  receivedAt: true,
  processedAt: true,
});

export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({
  id: true,
  createdAt: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
});

// New recipe system schemas
export const insertRawMaterialCategorySchema = createInsertSchema(rawMaterialCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRawMaterialSchema = createInsertSchema(rawMaterials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients).omit({
  id: true,
  createdAt: true,
});

export const insertUnitConversionSchema = createInsertSchema(unitConversions).omit({
  id: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type UserRestaurant = typeof userRestaurants.$inferSelect;
export type InsertUserRestaurant = z.infer<typeof insertUserRestaurantSchema>;
export type InventoryCategory = typeof inventoryCategories.$inferSelect;
export type InsertInventoryCategory = z.infer<typeof insertInventoryCategorySchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

// New recipe system types
export type RawMaterialCategory = typeof rawMaterialCategories.$inferSelect;
export type InsertRawMaterialCategory = z.infer<typeof insertRawMaterialCategorySchema>;
export type RawMaterial = typeof rawMaterials.$inferSelect;
export type InsertRawMaterial = z.infer<typeof insertRawMaterialSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;
export type UnitConversion = typeof unitConversions.$inferSelect;
export type InsertUnitConversion = z.infer<typeof insertUnitConversionSchema>;
