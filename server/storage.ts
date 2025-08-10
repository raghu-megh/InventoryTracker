import {
  users,
  restaurants,
  userRestaurants,
  inventoryCategories,
  inventoryItems,
  webhookEvents,
  stockMovements,
  sales,
  rawMaterialCategories,
  rawMaterials,
  rawMaterialPurchases,
  rawMaterialPurchaseItems,
  rawMaterialMovements,
  menuItems,
  recipes,
  recipeIngredients,
  unitConversions,
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
  type RawMaterialCategory,
  type InsertRawMaterialCategory,
  type RawMaterial,
  type InsertRawMaterial,
  type RawMaterialPurchase,
  type InsertRawMaterialPurchase,
  type RawMaterialPurchaseItem,
  type InsertRawMaterialPurchaseItem,
  type RawMaterialMovement,
  type InsertRawMaterialMovement,
  type MenuItem,
  type InsertMenuItem,
  type Recipe,
  type InsertRecipe,
  type RecipeIngredient,
  type InsertRecipeIngredient,
  type UnitConversion,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, sum } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Restaurant operations
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantByCloverMerchantId(cloverMerchantId: string): Promise<Restaurant | undefined>;
  updateRestaurant(id: string, updates: Partial<InsertRestaurant>): Promise<Restaurant>;
  getUserRestaurants(userId: string): Promise<(UserRestaurant & { restaurant: Restaurant })[]>;
  upsertRestaurant(restaurantData: any): Promise<any>;
  createUserRestaurant(data: any): Promise<any>;
  
  // User restaurant relationships
  addUserToRestaurant(data: InsertUserRestaurant): Promise<UserRestaurant>;
  getUserRestaurantRole(userId: string, restaurantId: string): Promise<string | undefined>;
  getRestaurantUsers(restaurantId: string): Promise<(UserRestaurant & { user: User })[]>;
  
  // Inventory categories
  createInventoryCategory(category: InsertInventoryCategory): Promise<InventoryCategory>;
  getRestaurantCategories(restaurantId: string): Promise<InventoryCategory[]>;
  
  // Inventory items
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  getRestaurantInventory(restaurantId: string): Promise<any[]>;
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

  // Raw material categories
  createRawMaterialCategory(category: InsertRawMaterialCategory): Promise<RawMaterialCategory>;
  getRawMaterialCategories(restaurantId: string): Promise<RawMaterialCategory[]>;
  
  // Raw materials
  createRawMaterial(material: InsertRawMaterial): Promise<RawMaterial>;
  getRawMaterials(restaurantId: string): Promise<(RawMaterial & { category?: RawMaterialCategory })[]>;
  getRawMaterial(id: string): Promise<RawMaterial | undefined>;
  updateRawMaterial(id: string, updates: Partial<InsertRawMaterial>): Promise<RawMaterial>;
  getLowStockRawMaterials(restaurantId: string): Promise<RawMaterial[]>;

  // Menu items (synced from Clover)
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  getMenuItems(restaurantId: string): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  getMenuItemByCloverItemId(cloverItemId: string): Promise<MenuItem | undefined>;
  updateMenuItem(id: string, updates: Partial<InsertMenuItem>): Promise<MenuItem>;
  syncMenuItemsFromClover(restaurantId: string, cloverItems: any[]): Promise<void>;
  
  // Recipes
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  getRecipes(restaurantId: string): Promise<Recipe[]>;
  getRecipe(id: string): Promise<Recipe | undefined>;
  getRecipeByMenuItemId(menuItemId: string): Promise<Recipe | undefined>;
  updateRecipe(id: string, updates: Partial<InsertRecipe>): Promise<Recipe>;
  
  // Recipe ingredients
  addRecipeIngredient(ingredient: InsertRecipeIngredient): Promise<RecipeIngredient>;
  getRecipeIngredients(recipeId: string): Promise<(RecipeIngredient & { rawMaterial: RawMaterial })[]>;
  updateRecipeIngredient(id: string, updates: Partial<InsertRecipeIngredient>): Promise<RecipeIngredient>;
  removeRecipeIngredient(id: string): Promise<void>;
  
  // Unit conversions
  getUnitConversions(): Promise<UnitConversion[]>;
  convertUnit(value: number, fromUnit: string, toUnit: string): Promise<number>;
  
  // Raw material movements  
  createRawMaterialMovement(movement: {
    restaurantId: string;
    rawMaterialId: string;
    movementType: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
    cloverOrderId?: string;
  }): Promise<void>;
  
  // Raw material purchases
  createRawMaterialPurchase(purchase: InsertRawMaterialPurchase): Promise<RawMaterialPurchase>;
  getRawMaterialPurchases(restaurantId: string): Promise<(RawMaterialPurchase & { items: RawMaterialPurchaseItem[]; user: User })[]>;
  getRawMaterialPurchase(id: string): Promise<RawMaterialPurchase | undefined>;
  
  // Raw material purchase items
  createRawMaterialPurchaseItem(item: InsertRawMaterialPurchaseItem): Promise<RawMaterialPurchaseItem>;
  getRawMaterialPurchaseItems(purchaseId: string): Promise<(RawMaterialPurchaseItem & { rawMaterial?: RawMaterial })[]>;
  updateRawMaterialPurchaseItem(id: string, updates: Partial<InsertRawMaterialPurchaseItem>): Promise<RawMaterialPurchaseItem>;
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
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
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

  async upsertRestaurant(restaurantData: any): Promise<any> {
    const [restaurant] = await db
      .insert(restaurants)
      .values(restaurantData)
      .onConflictDoUpdate({
        target: restaurants.cloverMerchantId,
        set: {
          ...restaurantData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return restaurant;
  }

  async createUserRestaurant(data: any): Promise<any> {
    const [userRestaurant] = await db
      .insert(userRestaurants)
      .values(data)
      .onConflictDoNothing()
      .returning();
    return userRestaurant;
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

  async getRestaurantInventory(restaurantId: string): Promise<any[]> {
    return await db
      .select({
        id: inventoryItems.id,
        restaurantId: inventoryItems.restaurantId,
        categoryId: inventoryItems.categoryId,
        name: inventoryItems.name,
        sku: inventoryItems.sku,
        description: inventoryItems.description,
        unit: inventoryItems.unit,
        currentStock: inventoryItems.currentStock,
        minLevel: inventoryItems.minLevel,
        maxLevel: inventoryItems.maxLevel,
        costPerUnit: inventoryItems.costPerUnit,
        cloverItemId: inventoryItems.cloverItemId,
        isActive: inventoryItems.isActive,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
        category: inventoryCategories,
      })
      .from(inventoryItems)
      .leftJoin(inventoryCategories, eq(inventoryItems.categoryId, inventoryCategories.id))
      .where(and(eq(inventoryItems.restaurantId, restaurantId), eq(inventoryItems.isActive, true)))
      .orderBy(inventoryItems.name);
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
      totalItems: Number(totalItemsResult.count),
      lowStockItems: Number(lowStockResult.count),
      todaySales: Number(todaySalesResult.total) || 0,
      activeUsers: Number(activeUsersResult.count),
    };
  }

  // Raw material categories
  async createRawMaterialCategory(category: InsertRawMaterialCategory): Promise<RawMaterialCategory> {
    const [newCategory] = await db
      .insert(rawMaterialCategories)
      .values(category)
      .returning();
    return newCategory;
  }

  async getRawMaterialCategories(restaurantId: string): Promise<RawMaterialCategory[]> {
    return await db
      .select()
      .from(rawMaterialCategories)
      .where(eq(rawMaterialCategories.restaurantId, restaurantId))
      .orderBy(rawMaterialCategories.name);
  }

  // Raw materials
  async createRawMaterial(material: InsertRawMaterial): Promise<RawMaterial> {
    const [newMaterial] = await db
      .insert(rawMaterials)
      .values(material)
      .returning();
    return newMaterial;
  }

  async getRawMaterials(restaurantId: string): Promise<any[]> {
    return await db
      .select({
        id: rawMaterials.id,
        restaurantId: rawMaterials.restaurantId,
        categoryId: rawMaterials.categoryId,
        name: rawMaterials.name,
        description: rawMaterials.description,
        sku: rawMaterials.sku,
        baseUnit: rawMaterials.baseUnit,
        currentStock: rawMaterials.currentStock,
        minLevel: rawMaterials.minLevel,
        maxLevel: rawMaterials.maxLevel,
        costPerUnit: rawMaterials.costPerUnit,
        isActive: rawMaterials.isActive,
        createdAt: rawMaterials.createdAt,
        updatedAt: rawMaterials.updatedAt,
        isHighPriority: rawMaterials.isHighPriority,
        lastAlertSent: rawMaterials.lastAlertSent,
        category: rawMaterialCategories,
      })
      .from(rawMaterials)
      .leftJoin(rawMaterialCategories, eq(rawMaterials.categoryId, rawMaterialCategories.id))
      .where(and(eq(rawMaterials.restaurantId, restaurantId), eq(rawMaterials.isActive, true)))
      .orderBy(rawMaterials.name);
  }

  async getRawMaterial(id: string): Promise<RawMaterial | undefined> {
    const [material] = await db
      .select()
      .from(rawMaterials)
      .where(eq(rawMaterials.id, id));
    return material;
  }

  async updateRawMaterial(id: string, updates: Partial<InsertRawMaterial>): Promise<RawMaterial> {
    const [updatedMaterial] = await db
      .update(rawMaterials)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rawMaterials.id, id))
      .returning();
    return updatedMaterial;
  }

  async getLowStockRawMaterials(restaurantId: string): Promise<RawMaterial[]> {
    return await db
      .select()
      .from(rawMaterials)
      .where(
        and(
          eq(rawMaterials.restaurantId, restaurantId),
          eq(rawMaterials.isActive, true),
          sql`${rawMaterials.currentStock} <= ${rawMaterials.minLevel}`
        )
      )
      .orderBy(rawMaterials.name);
  }

  // Menu items operations
  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [menuItem] = await db
      .insert(menuItems)
      .values(item)
      .returning();
    return menuItem;
  }

  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId))
      .orderBy(menuItems.name);
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [item] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id));
    return item;
  }

  async getMenuItemByCloverItemId(cloverItemId: string): Promise<MenuItem | undefined> {
    const [item] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.cloverItemId, cloverItemId));
    return item;
  }

  async updateMenuItem(id: string, updates: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [menuItem] = await db
      .update(menuItems)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, id))
      .returning();
    return menuItem;
  }

  async syncMenuItemsFromClover(restaurantId: string, cloverItems: any[]): Promise<void> {
    console.log('Syncing items:', cloverItems.map(item => ({ id: item.cloverItemId, name: item.name })));
    
    for (const cloverItem of cloverItems) {
      const existingItem = await this.getMenuItemByCloverItemId(cloverItem.cloverItemId);
      
      if (existingItem) {
        // Update existing item
        await this.updateMenuItem(existingItem.id, {
          name: cloverItem.name,
          description: cloverItem.description || '',
          category: cloverItem.category || '',
          price: cloverItem.price?.toString() || "0",
          sku: cloverItem.sku || '',
          isActive: cloverItem.isActive,
        });
        console.log('Updated existing menu item:', cloverItem.name);
      } else {
        // Create new item
        const newItem = await this.createMenuItem({
          restaurantId,
          cloverItemId: cloverItem.cloverItemId,
          name: cloverItem.name,
          description: cloverItem.description || '',
          category: cloverItem.category || '',
          price: cloverItem.price?.toString() || "0",
          sku: cloverItem.sku || '',
          isActive: cloverItem.isActive,
          hasRecipe: false,
        });
        console.log('Created new menu item:', newItem.name);
      }
    }
  }

  // Recipes
  async createRecipe(recipe: InsertRecipe): Promise<Recipe> {
    const [newRecipe] = await db
      .insert(recipes)
      .values(recipe)
      .returning();
    return newRecipe;
  }

  async getRecipes(restaurantId: string): Promise<Recipe[]> {
    return await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.restaurantId, restaurantId), eq(recipes.isActive, true)))
      .orderBy(recipes.name);
  }

  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(eq(recipes.id, id));
    return recipe;
  }

  async getRecipeByMenuItemId(menuItemId: string): Promise<Recipe | undefined> {
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.menuItemId, menuItemId), eq(recipes.isActive, true)));
    return recipe;
  }

  async updateRecipe(id: string, updates: Partial<InsertRecipe>): Promise<Recipe> {
    const [updatedRecipe] = await db
      .update(recipes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(recipes.id, id))
      .returning();
    return updatedRecipe;
  }

  // Recipe ingredients
  async addRecipeIngredient(ingredient: InsertRecipeIngredient): Promise<RecipeIngredient> {
    const [newIngredient] = await db
      .insert(recipeIngredients)
      .values(ingredient)
      .returning();
    return newIngredient;
  }

  async getRecipeIngredients(recipeId: string): Promise<(RecipeIngredient & { rawMaterial: RawMaterial })[]> {
    return await db
      .select({
        id: recipeIngredients.id,
        recipeId: recipeIngredients.recipeId,
        rawMaterialId: recipeIngredients.rawMaterialId,
        quantity: recipeIngredients.quantity,
        unit: recipeIngredients.unit,
        notes: recipeIngredients.notes,
        createdAt: recipeIngredients.createdAt,
        rawMaterial: rawMaterials,
      })
      .from(recipeIngredients)
      .innerJoin(rawMaterials, eq(recipeIngredients.rawMaterialId, rawMaterials.id))
      .where(eq(recipeIngredients.recipeId, recipeId))
      .orderBy(rawMaterials.name);
  }

  async updateRecipeIngredient(id: string, updates: Partial<InsertRecipeIngredient>): Promise<RecipeIngredient> {
    const [updatedIngredient] = await db
      .update(recipeIngredients)
      .set(updates)
      .where(eq(recipeIngredients.id, id))
      .returning();
    return updatedIngredient;
  }

  async removeRecipeIngredient(id: string): Promise<void> {
    await db
      .delete(recipeIngredients)
      .where(eq(recipeIngredients.id, id));
  }

  // Unit conversions
  async getUnitConversions(): Promise<UnitConversion[]> {
    return await db
      .select()
      .from(unitConversions)
      .orderBy(unitConversions.category, unitConversions.fromUnit);
  }

  async convertUnit(value: number, fromUnit: string, toUnit: string): Promise<number> {
    if (fromUnit === toUnit) return value;
    
    const [conversion] = await db
      .select()
      .from(unitConversions)
      .where(and(
        eq(unitConversions.fromUnit, fromUnit),
        eq(unitConversions.toUnit, toUnit)
      ));
    
    if (!conversion) {
      throw new Error(`Conversion from ${fromUnit} to ${toUnit} not found`);
    }
    
    return value * Number(conversion.conversionFactor);
  }
  
  async createRawMaterialMovement(movement: {
    restaurantId: string;
    rawMaterialId: string;
    movementType: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
    cloverOrderId?: string;
  }): Promise<void> {
    await db.execute(sql`
      INSERT INTO raw_material_movements (
        id, restaurant_id, raw_material_id, movement_type, quantity, 
        previous_stock, new_stock, reason, clover_order_id, created_at
      ) VALUES (
        gen_random_uuid(), ${movement.restaurantId}, ${movement.rawMaterialId}, 
        ${movement.movementType}, ${movement.quantity.toString()}, 
        ${movement.previousStock.toString()}, ${movement.newStock.toString()}, 
        ${movement.reason}, ${movement.cloverOrderId || null}, NOW()
      )
    `);
  }

  // Raw material purchases
  async createRawMaterialPurchase(purchase: InsertRawMaterialPurchase): Promise<RawMaterialPurchase> {
    const [newPurchase] = await db
      .insert(rawMaterialPurchases)
      .values(purchase)
      .returning();
    return newPurchase;
  }

  async getRawMaterialPurchases(restaurantId: string): Promise<any[]> {
    return await db
      .select({
        id: rawMaterialPurchases.id,
        restaurantId: rawMaterialPurchases.restaurantId,
        vendorName: rawMaterialPurchases.vendorName,
        invoiceNumber: rawMaterialPurchases.invoiceNumber,
        purchaseDate: rawMaterialPurchases.purchaseDate,
        totalAmount: rawMaterialPurchases.totalAmount,
        tax: rawMaterialPurchases.tax,
        notes: rawMaterialPurchases.notes,
        receiptImageUrl: rawMaterialPurchases.receiptImageUrl,
        processingMethod: rawMaterialPurchases.processingMethod,
        azureAnalysisResult: rawMaterialPurchases.azureAnalysisResult,
        userId: rawMaterialPurchases.userId,
        createdAt: rawMaterialPurchases.createdAt,
        updatedAt: rawMaterialPurchases.updatedAt,
        user: users,
        items: sql`COALESCE(
          (SELECT json_agg(row_to_json(items.*)) 
           FROM raw_material_purchase_items items 
           WHERE items.purchase_id = ${rawMaterialPurchases.id}), 
          '[]'::json
        )`.as('items')
      })
      .from(rawMaterialPurchases)
      .innerJoin(users, eq(rawMaterialPurchases.userId, users.id))
      .where(eq(rawMaterialPurchases.restaurantId, restaurantId))
      .orderBy(desc(rawMaterialPurchases.createdAt));
  }

  async getRawMaterialPurchase(id: string): Promise<RawMaterialPurchase | undefined> {
    const [purchase] = await db
      .select()
      .from(rawMaterialPurchases)
      .where(eq(rawMaterialPurchases.id, id));
    return purchase;
  }

  // Raw material purchase items
  async createRawMaterialPurchaseItem(item: InsertRawMaterialPurchaseItem): Promise<RawMaterialPurchaseItem> {
    const [newItem] = await db
      .insert(rawMaterialPurchaseItems)
      .values(item)
      .returning();
    return newItem;
  }

  async getRawMaterialPurchaseItems(purchaseId: string): Promise<any[]> {
    return await db
      .select({
        id: rawMaterialPurchaseItems.id,
        purchaseId: rawMaterialPurchaseItems.purchaseId,
        rawMaterialId: rawMaterialPurchaseItems.rawMaterialId,
        itemName: rawMaterialPurchaseItems.itemName,
        quantity: rawMaterialPurchaseItems.quantity,
        unit: rawMaterialPurchaseItems.unit,
        pricePerUnit: rawMaterialPurchaseItems.pricePerUnit,
        totalPrice: rawMaterialPurchaseItems.totalPrice,
        needsMatching: rawMaterialPurchaseItems.needsMatching,
        confidence: rawMaterialPurchaseItems.confidence,
        createdAt: rawMaterialPurchaseItems.createdAt,
        rawMaterial: rawMaterials,
      })
      .from(rawMaterialPurchaseItems)
      .leftJoin(rawMaterials, eq(rawMaterialPurchaseItems.rawMaterialId, rawMaterials.id))
      .where(eq(rawMaterialPurchaseItems.purchaseId, purchaseId))
      .orderBy(rawMaterialPurchaseItems.createdAt);
  }

  async updateRawMaterialPurchaseItem(id: string, updates: Partial<InsertRawMaterialPurchaseItem>): Promise<RawMaterialPurchaseItem> {
    const [updatedItem] = await db
      .update(rawMaterialPurchaseItems)
      .set(updates)
      .where(eq(rawMaterialPurchaseItems.id, id))
      .returning();
    return updatedItem;
  }
}

export const storage = new DatabaseStorage();
