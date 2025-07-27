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

// OAuth state storage for PKCE flow persistence
export const oauthStates = pgTable("oauth_states", {
  id: uuid("id").defaultRandom().primaryKey(),
  state: varchar("state", { length: 255 }).notNull().unique(),
  codeVerifier: varchar("code_verifier", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

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
  cloverAccessToken: varchar("clover_access_token", { length: 500 }), // OAuth access token for API calls
  webhookSecret: varchar("webhook_secret", { length: 255 }),
  cloverAuthCode: varchar("clover_auth_code", { length: 255 }), // Additional OAuth security
  alertEmail: varchar("alert_email", { length: 255 }),
  alertPhone: varchar("alert_phone", { length: 20 }),
  enableEmailAlerts: boolean("enable_email_alerts").default(true),
  enableSmsAlerts: boolean("enable_sms_alerts").default(false),
  subscriptionTier: varchar("subscription_tier", { length: 20 }).default("basic"), // basic, premium, enterprise
  analyticsEnabled: boolean("analytics_enabled").default(false),
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
  isHighPriority: boolean("is_high_priority").default(false),
  lastAlertSent: timestamp("last_alert_sent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu items from Clover POS (synced from Clover API)
export const menuItems = pgTable("menu_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  cloverItemId: varchar("clover_item_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  sku: varchar("sku", { length: 100 }),
  isActive: boolean("is_active").default(true),
  hasRecipe: boolean("has_recipe").default(false),
  syncedAt: timestamp("synced_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipes linked to menu items (Large Pizza, Medium Pizza, etc.)
export const recipes = pgTable("recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }),
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

// Raw material purchases (track purchasing history)
export const rawMaterialPurchases = pgTable("raw_material_purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  vendorName: varchar("vendor_name", { length: 255 }),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  purchaseDate: timestamp("purchase_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }),
  notes: text("notes"),
  receiptImageUrl: varchar("receipt_image_url", { length: 500 }), // Azure blob storage URL
  processingMethod: varchar("processing_method", { length: 20 }).notNull(), // manual, ai_receipt
  azureAnalysisResult: jsonb("azure_analysis_result"), // Full Azure AI response for audit
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual items within a purchase (line items from receipt)
export const rawMaterialPurchaseItems = pgTable("raw_material_purchase_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  purchaseId: uuid("purchase_id").notNull().references(() => rawMaterialPurchases.id, { onDelete: "cascade" }),
  rawMaterialId: uuid("raw_material_id").references(() => rawMaterials.id, { onDelete: "set null" }),
  itemName: varchar("item_name", { length: 255 }).notNull(), // Original name from receipt
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(), // Original unit from receipt/input
  pricePerUnit: decimal("price_per_unit", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  needsMatching: boolean("needs_matching").default(false), // True if AI couldn't match to existing raw material
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // AI confidence score 0.00-1.00
  createdAt: timestamp("created_at").defaultNow(),
});

// Raw material movements (separate from stock_movements which is for inventory_items)
export const rawMaterialMovements = pgTable("raw_material_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  rawMaterialId: uuid("raw_material_id").notNull().references(() => rawMaterials.id, { onDelete: "cascade" }),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  movementType: varchar("movement_type", { length: 50 }).notNull(), // purchase, sale, adjustment, waste
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  previousStock: decimal("previous_stock", { precision: 10, scale: 3 }).notNull(),
  newStock: decimal("new_stock", { precision: 10, scale: 3 }).notNull(),
  reason: text("reason"),
  purchaseId: uuid("purchase_id").references(() => rawMaterialPurchases.id), // Link to purchase if applicable
  cloverOrderId: varchar("clover_order_id", { length: 255 }), // Link to Clover order if applicable
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
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
  menuItems: many(menuItems),
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

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [menuItems.restaurantId],
    references: [restaurants.id],
  }),
  recipes: many(recipes),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [recipes.restaurantId],
    references: [restaurants.id],
  }),
  menuItem: one(menuItems, {
    fields: [recipes.menuItemId],
    references: [menuItems.id],
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

export const rawMaterialPurchasesRelations = relations(rawMaterialPurchases, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [rawMaterialPurchases.restaurantId],
    references: [restaurants.id],
  }),
  user: one(users, {
    fields: [rawMaterialPurchases.userId],
    references: [users.id],
  }),
  items: many(rawMaterialPurchaseItems),
  movements: many(rawMaterialMovements),
}));

export const rawMaterialPurchaseItemsRelations = relations(rawMaterialPurchaseItems, ({ one }) => ({
  purchase: one(rawMaterialPurchases, {
    fields: [rawMaterialPurchaseItems.purchaseId],
    references: [rawMaterialPurchases.id],
  }),
  rawMaterial: one(rawMaterials, {
    fields: [rawMaterialPurchaseItems.rawMaterialId],
    references: [rawMaterials.id],
  }),
}));

export const rawMaterialMovementsRelations = relations(rawMaterialMovements, ({ one }) => ({
  rawMaterial: one(rawMaterials, {
    fields: [rawMaterialMovements.rawMaterialId],
    references: [rawMaterials.id],
  }),
  restaurant: one(restaurants, {
    fields: [rawMaterialMovements.restaurantId],
    references: [restaurants.id],
  }),
  purchase: one(rawMaterialPurchases, {
    fields: [rawMaterialMovements.purchaseId],
    references: [rawMaterialPurchases.id],
  }),
  user: one(users, {
    fields: [rawMaterialMovements.userId],
    references: [users.id],
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

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  syncedAt: true,
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

export const insertRawMaterialPurchaseSchema = createInsertSchema(rawMaterialPurchases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRawMaterialPurchaseItemSchema = createInsertSchema(rawMaterialPurchaseItems).omit({
  id: true,
  createdAt: true,
});

export const insertRawMaterialMovementSchema = createInsertSchema(rawMaterialMovements).omit({
  id: true,
  createdAt: true,
});

// Types
// Premium Analytics Tables
// Daily aggregated metrics for performance analysis
export const dailyAnalytics = pgTable("daily_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default("0"),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).default("0"),
  grossProfit: decimal("gross_profit", { precision: 12, scale: 2 }).default("0"),
  grossMargin: decimal("gross_margin", { precision: 5, scale: 2 }).default("0"), // Percentage
  totalOrders: integer("total_orders").default(0),
  avgOrderValue: decimal("avg_order_value", { precision: 10, scale: 2 }).default("0"),
  foodCostPercentage: decimal("food_cost_percentage", { precision: 5, scale: 2 }).default("0"),
  wasteAmount: decimal("waste_amount", { precision: 10, scale: 2 }).default("0"),
  wastePercentage: decimal("waste_percentage", { precision: 5, scale: 2 }).default("0"),
  inventoryTurnover: decimal("inventory_turnover", { precision: 8, scale: 3 }).default("0"),
  topSellingItems: jsonb("top_selling_items"), // Array of {itemId, itemName, quantity, revenue}
  lowStockItems: integer("low_stock_items").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recipe performance analytics
export const recipeAnalytics = pgTable("recipe_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  recipeId: uuid("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  totalSold: integer("total_sold").default(0),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
  actualFoodCost: decimal("actual_food_cost", { precision: 10, scale: 2 }).default("0"),
  theoreticalFoodCost: decimal("theoretical_food_cost", { precision: 10, scale: 2 }).default("0"),
  costVariance: decimal("cost_variance", { precision: 10, scale: 2 }).default("0"), // Actual - Theoretical
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }).default("0"),
  popularityScore: decimal("popularity_score", { precision: 5, scale: 2 }).default("0"), // Based on sales volume
  seasonalTrend: varchar("seasonal_trend", { length: 20 }), // "increasing", "decreasing", "stable"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Supplier performance tracking
export const supplierAnalytics = pgTable("supplier_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  supplierName: varchar("supplier_name", { length: 255 }).notNull(),
  month: timestamp("month").notNull(), // First day of month
  totalPurchases: decimal("total_purchases", { precision: 12, scale: 2 }).default("0"),
  orderCount: integer("order_count").default(0),
  avgOrderValue: decimal("avg_order_value", { precision: 10, scale: 2 }).default("0"),
  avgDeliveryTime: decimal("avg_delivery_time", { precision: 5, scale: 1 }), // Days
  qualityScore: decimal("quality_score", { precision: 3, scale: 1 }), // 1-10 rating
  priceCompetitiveness: decimal("price_competitiveness", { precision: 5, scale: 2 }), // Percentage vs market average
  reliabilityScore: decimal("reliability_score", { precision: 3, scale: 1 }), // 1-10 rating
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Predictive analytics for demand forecasting
export const demandForecasts = pgTable("demand_forecasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  rawMaterialId: uuid("raw_material_id").notNull().references(() => rawMaterials.id, { onDelete: "cascade" }),
  forecastDate: timestamp("forecast_date").notNull(),
  predictedDemand: decimal("predicted_demand", { precision: 10, scale: 3 }).notNull(),
  confidenceLevel: decimal("confidence_level", { precision: 5, scale: 2 }), // Percentage
  seasonalityFactor: decimal("seasonality_factor", { precision: 5, scale: 3 }).default("1.0"),
  trendFactor: decimal("trend_factor", { precision: 5, scale: 3 }).default("1.0"),
  recommendedOrderQuantity: decimal("recommended_order_quantity", { precision: 10, scale: 3 }),
  recommendedOrderDate: timestamp("recommended_order_date"),
  actualDemand: decimal("actual_demand", { precision: 10, scale: 3 }), // Filled after the fact
  accuracyScore: decimal("accuracy_score", { precision: 5, scale: 2 }), // How accurate the prediction was
  modelVersion: varchar("model_version", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cost optimization recommendations
export const costOptimizations = pgTable("cost_optimizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // "supplier_switch", "portion_adjust", "menu_price", "waste_reduction"
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  potentialSavings: decimal("potential_savings", { precision: 10, scale: 2 }).notNull(),
  implementationEffort: varchar("implementation_effort", { length: 20 }), // "low", "medium", "high"
  priority: varchar("priority", { length: 20 }), // "low", "medium", "high", "critical"
  status: varchar("status", { length: 20 }).default("pending"), // "pending", "implemented", "dismissed"
  relatedItemId: uuid("related_item_id"), // Could be recipe, raw material, supplier, etc.
  relatedItemType: varchar("related_item_type", { length: 50 }), // "recipe", "raw_material", "supplier"
  implementedAt: timestamp("implemented_at"),
  actualSavings: decimal("actual_savings", { precision: 10, scale: 2 }), // Tracked after implementation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;
export type UnitConversion = typeof unitConversions.$inferSelect;
export type InsertUnitConversion = z.infer<typeof insertUnitConversionSchema>;
export type RawMaterialPurchase = typeof rawMaterialPurchases.$inferSelect;
export type InsertRawMaterialPurchase = z.infer<typeof insertRawMaterialPurchaseSchema>;
export type RawMaterialPurchaseItem = typeof rawMaterialPurchaseItems.$inferSelect;
export type InsertRawMaterialPurchaseItem = z.infer<typeof insertRawMaterialPurchaseItemSchema>;
export type RawMaterialMovement = typeof rawMaterialMovements.$inferSelect;
export type InsertRawMaterialMovement = z.infer<typeof insertRawMaterialMovementSchema>;
