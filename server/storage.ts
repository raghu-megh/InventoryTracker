import {
  users,
  restaurants,
  userRestaurants,
  inventoryCategories,
  inventoryItems,
  webhookEvents,
  stockMovements,
  sales,
  type User,
  type UpsertUser,
  type Restaurant,
  type InsertRestaurant,
  type UserRestaurant,
  type InsertUserRestaurant,
  type InventoryCategory,
  type InsertInventoryCategory,
  type InventoryItem,
  type InsertInventoryItem,
  type WebhookEvent,
  type InsertWebhookEvent,
  type StockMovement,
  type InsertStockMovement,
  type Sale,
  type InsertSale,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, sum } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Restaurant operations
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantByCloverMerchantId(cloverMerchantId: string): Promise<Restaurant | undefined>;
  updateRestaurant(id: string, updates: Partial<InsertRestaurant>): Promise<Restaurant>;
  getUserRestaurants(userId: string): Promise<(UserRestaurant & { restaurant: Restaurant })[]>;
  
  // User restaurant relationships
  addUserToRestaurant(data: InsertUserRestaurant): Promise<UserRestaurant>;
  getUserRestaurantRole(userId: string, restaurantId: string): Promise<string | undefined>;
  getRestaurantUsers(restaurantId: string): Promise<(UserRestaurant & { user: User })[]>;
  
  // Inventory categories
  createInventoryCategory(category: InsertInventoryCategory): Promise<InventoryCategory>;
  getRestaurantCategories(restaurantId: string): Promise<InventoryCategory[]>;
  
  // Inventory items
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  getRestaurantInventory(restaurantId: string): Promise<(InventoryItem & { category?: InventoryCategory })[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  updateInventoryItem(id: string, updates: Partial<InsertInventoryItem>): Promise<InventoryItem>;
  getLowStockItems(restaurantId: string): Promise<InventoryItem[]>;
  
  // Webhook events
  createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent>;
  getRecentWebhookEvents(restaurantId: string, limit?: number): Promise<WebhookEvent[]>;
  markWebhookEventProcessed(id: string, error?: string): Promise<void>;
  
  // Stock movements
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  getItemStockHistory(itemId: string, limit?: number): Promise<StockMovement[]>;
  
  // Sales
  createSale(sale: InsertSale): Promise<Sale>;
  getRestaurantSales(restaurantId: string, startDate?: Date, endDate?: Date): Promise<Sale[]>;
  
  // Dashboard metrics
  getDashboardMetrics(restaurantId: string): Promise<{
    totalItems: number;
    lowStockItems: number;
    todaySales: number;
    activeUsers: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Restaurant operations
  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    const [newRestaurant] = await db
      .insert(restaurants)
      .values(restaurant)
      .returning();
    return newRestaurant;
  }

  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, id));
    return restaurant;
  }

  async getRestaurantByCloverMerchantId(cloverMerchantId: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.cloverMerchantId, cloverMerchantId));
    return restaurant;
  }

  async updateRestaurant(id: string, updates: Partial<InsertRestaurant>): Promise<Restaurant> {
    const [restaurant] = await db
      .update(restaurants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();
    return restaurant;
  }

  async getUserRestaurants(userId: string): Promise<(UserRestaurant & { restaurant: Restaurant })[]> {
    const results = await db
      .select()
      .from(userRestaurants)
      .innerJoin(restaurants, eq(userRestaurants.restaurantId, restaurants.id))
      .where(eq(userRestaurants.userId, userId));
    
    return results.map(result => ({
      ...result.user_restaurants,
      restaurant: result.restaurants
    }));
  }

  // User restaurant relationships
  async addUserToRestaurant(data: InsertUserRestaurant): Promise<UserRestaurant> {
    const [userRestaurant] = await db
      .insert(userRestaurants)
      .values(data)
      .returning();
    return userRestaurant;
  }

  async getUserRestaurantRole(userId: string, restaurantId: string): Promise<string | undefined> {
    const [userRestaurant] = await db
      .select({ role: userRestaurants.role })
      .from(userRestaurants)
      .where(
        and(
          eq(userRestaurants.userId, userId),
          eq(userRestaurants.restaurantId, restaurantId)
        )
      );
    return userRestaurant?.role;
  }

  async getRestaurantUsers(restaurantId: string): Promise<(UserRestaurant & { user: User })[]> {
    const results = await db
      .select()
      .from(userRestaurants)
      .innerJoin(users, eq(userRestaurants.userId, users.id))
      .where(eq(userRestaurants.restaurantId, restaurantId));
    
    return results.map(result => ({
      ...result.user_restaurants,
      user: result.users
    }));
  }

  // Inventory categories
  async createInventoryCategory(category: InsertInventoryCategory): Promise<InventoryCategory> {
    const [newCategory] = await db
      .insert(inventoryCategories)
      .values(category)
      .returning();
    return newCategory;
  }

  async getRestaurantCategories(restaurantId: string): Promise<InventoryCategory[]> {
    return await db
      .select()
      .from(inventoryCategories)
      .where(eq(inventoryCategories.restaurantId, restaurantId))
      .orderBy(inventoryCategories.name);
  }

  // Inventory items
  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db
      .insert(inventoryItems)
      .values(item)
      .returning();
    return newItem;
  }

  async getRestaurantInventory(restaurantId: string): Promise<(InventoryItem & { category?: InventoryCategory })[]> {
    const results = await db
      .select()
      .from(inventoryItems)
      .leftJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id))
      .where(and(eq(inventoryItems.restaurantId, restaurantId), eq(inventoryItems.isActive, true)))
      .orderBy(inventoryItems.name);
    
    return results.map(result => ({
      ...result.inventory_items,
      category: result.inventory_categories || undefined
    }));
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, id));
    return item;
  }

  async updateInventoryItem(id: string, updates: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [item] = await db
      .update(inventoryItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return item;
  }

  async getLowStockItems(restaurantId: string): Promise<InventoryItem[]> {
    return await db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.restaurantId, restaurantId),
          eq(inventoryItems.isActive, true),
          sql`${inventoryItems.currentStock} <= ${inventoryItems.minLevel}`
        )
      )
      .orderBy(sql`${inventoryItems.currentStock} / ${inventoryItems.minLevel}`);
  }

  // Webhook events
  async createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent> {
    const [newEvent] = await db
      .insert(webhookEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async getRecentWebhookEvents(restaurantId: string, limit: number = 10): Promise<WebhookEvent[]> {
    return await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.restaurantId, restaurantId))
      .orderBy(desc(webhookEvents.receivedAt))
      .limit(limit);
  }

  async markWebhookEventProcessed(id: string, error?: string): Promise<void> {
    await db
      .update(webhookEvents)
      .set({
        processed: true,
        processedAt: new Date(),
        processingError: error || null,
      })
      .where(eq(webhookEvents.id, id));
  }

  // Stock movements
  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const [newMovement] = await db
      .insert(stockMovements)
      .values(movement)
      .returning();
    return newMovement;
  }

  async getItemStockHistory(itemId: string, limit: number = 50): Promise<StockMovement[]> {
    return await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.inventoryItemId, itemId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit);
  }

  // Sales
  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db
      .insert(sales)
      .values(sale)
      .returning();
    return newSale;
  }

  async getRestaurantSales(restaurantId: string, startDate?: Date, endDate?: Date): Promise<Sale[]> {
    const conditions = [eq(sales.restaurantId, restaurantId)];
    
    if (startDate) {
      conditions.push(sql`${sales.saleDate} >= ${startDate}`);
    }
    
    if (endDate) {
      conditions.push(sql`${sales.saleDate} <= ${endDate}`);
    }
    
    return await db
      .select()
      .from(sales)
      .where(and(...conditions))
      .orderBy(desc(sales.saleDate));
  }

  // Dashboard metrics
  async getDashboardMetrics(restaurantId: string): Promise<{
    totalItems: number;
    lowStockItems: number;
    todaySales: number;
    activeUsers: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total items
    const [totalItemsResult] = await db
      .select({ count: count() })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.restaurantId, restaurantId), eq(inventoryItems.isActive, true)));

    // Low stock items
    const [lowStockResult] = await db
      .select({ count: count() })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.restaurantId, restaurantId),
          eq(inventoryItems.isActive, true),
          sql`${inventoryItems.currentStock} <= ${inventoryItems.minLevel}`
        )
      );

    // Today's sales
    const [todaySalesResult] = await db
      .select({ total: sum(sales.total) })
      .from(sales)
      .where(
        and(
          eq(sales.restaurantId, restaurantId),
          sql`${sales.saleDate} >= ${today}`,
          sql`${sales.saleDate} < ${tomorrow}`
        )
      );

    // Active users (users who have access to this restaurant)
    const [activeUsersResult] = await db
      .select({ count: count() })
      .from(userRestaurants)
      .where(eq(userRestaurants.restaurantId, restaurantId));

    return {
      totalItems: totalItemsResult.count,
      lowStockItems: lowStockResult.count,
      todaySales: Number(todaySalesResult.total) || 0,
      activeUsers: activeUsersResult.count,
    };
  }
}

export const storage = new DatabaseStorage();
