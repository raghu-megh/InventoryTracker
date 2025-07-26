import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupCloverAuth, requireAuth } from "./cloverAuth";
import { WebhookService } from "./webhookService";
import { CloverService } from "./cloverService";
import { checkLowStockAndAlert, sendDailySummary, testAlert } from "./alertService";
import { 
  insertRestaurantSchema, 
  insertInventoryItemSchema, 
  insertInventoryCategorySchema,
  insertRawMaterialCategorySchema,
  insertRawMaterialSchema,
  insertMenuItemSchema,
  insertRecipeSchema,
  insertRecipeIngredientSchema,
} from "@shared/schema";
import crypto from "crypto";
import multer from 'multer';

// Use real Clover API to sync menu items
async function syncCloverMenuItems(restaurantId: string, cloverMerchantId: string): Promise<void> {
  await CloverService.syncMenuItems(restaurantId, cloverMerchantId);
}

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Clover OAuth authentication
  setupCloverAuth(app);

  // Auth endpoint for frontend authentication checking
  app.get('/api/auth/user', async (req: any, res: any) => {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Get user's restaurants
      const userRestaurants = await storage.getUserRestaurants(req.session.user.id);
      
      res.json({
        ...user,
        restaurants: userRestaurants.map(ur => ({
          ...ur.restaurant,
          role: ur.role,
        })),
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // All API routes below require authentication via Clover OAuth
  app.get('/api/restaurants', requireAuth, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const restaurants = await storage.getUserRestaurants(userId);
      res.json(restaurants);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  // Restaurant creation (users get their restaurant from Clover OAuth callback)
  app.post('/api/restaurants', requireAuth, async (req: any, res: any) => {
    try {
      const restaurantData = insertRestaurantSchema.parse(req.body);
      restaurantData.ownerId = req.session.user.id;
      
      const restaurant = await storage.createRestaurant(restaurantData);
      
      await storage.addUserToRestaurant({
        userId: req.session.user.id,
        restaurantId: restaurant.id,
        role: 'owner'
      });

      res.status(201).json(restaurant);
    } catch (error) {
      console.error("Error creating restaurant:", error);
      res.status(500).json({ message: "Failed to create restaurant" });
    }
  });

  // Get restaurant details
  app.get('/api/restaurants/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  // Inventory categories
  app.post('/api/restaurants/:restaurantId/categories', requireAuth, async (req: Request, res: Response) => {
    try {
      const categoryData = insertInventoryCategorySchema.parse(req.body);
      categoryData.restaurantId = req.params.restaurantId;
      
      const category = await storage.createInventoryCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.get('/api/restaurants/:restaurantId/categories', requireAuth, async (req: Request, res: Response) => {
    try {
      const categories = await storage.getRestaurantCategories(req.params.restaurantId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Inventory items
  app.post('/api/restaurants/:restaurantId/inventory', requireAuth, async (req: Request, res: Response) => {
    try {
      const itemData = insertInventoryItemSchema.parse(req.body);
      itemData.restaurantId = req.params.restaurantId;
      
      const item = await storage.createInventoryItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.get('/api/restaurants/:restaurantId/inventory', requireAuth, async (req: Request, res: Response) => {
    try {
      const inventory = await storage.getRestaurantInventory(req.params.restaurantId);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  // Raw materials
  app.get('/api/restaurants/:restaurantId/raw-materials', requireAuth, async (req: Request, res: Response) => {
    try {
      const rawMaterials = await storage.getRawMaterials(req.params.restaurantId);
      res.json(rawMaterials);
    } catch (error) {
      console.error("Error fetching raw materials:", error);
      res.status(500).json({ message: "Failed to fetch raw materials" });
    }
  });

  app.post('/api/restaurants/:restaurantId/raw-materials', requireAuth, async (req: Request, res: Response) => {
    try {
      const rawMaterialData = insertRawMaterialSchema.parse(req.body);
      rawMaterialData.restaurantId = req.params.restaurantId;
      
      const rawMaterial = await storage.createRawMaterial(rawMaterialData);
      res.status(201).json(rawMaterial);
    } catch (error) {
      console.error("Error creating raw material:", error);
      res.status(500).json({ message: "Failed to create raw material" });
    }
  });

  // Menu items (synced from Clover)
  app.get('/api/restaurants/:restaurantId/menu-items', requireAuth, async (req: Request, res: Response) => {
    try {
      const menuItems = await storage.getMenuItems(req.params.restaurantId);
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.post('/api/restaurants/:restaurantId/sync-menu', requireAuth, async (req: Request, res: Response) => {
    try {
      const restaurant = await storage.getRestaurant(req.params.restaurantId);
      if (!restaurant?.cloverMerchantId) {
        return res.status(400).json({ message: "Restaurant does not have Clover integration" });
      }

      console.log(`=== CLOVER MENU SYNC DEBUG ===`);
      console.log(`Restaurant ID: ${req.params.restaurantId}`);
      console.log(`Clover Merchant ID: ${restaurant.cloverMerchantId}`);
      console.log(`Clover API Base: ${process.env.CLOVER_API_BASE}`);
      console.log(`Clover API Key: ${process.env.CLOVER_API_KEY ? 'PRESENT' : 'MISSING'}`);
      
      await CloverService.syncMenuItems(req.params.restaurantId, restaurant.cloverMerchantId);
      res.json({ success: true, message: "Menu items synced successfully" });
    } catch (error) {
      console.error("Error syncing menu items:", error);
      res.status(500).json({ message: "Failed to sync menu items", error: error.message });
    }
  });

  // Recipes
  app.get('/api/restaurants/:restaurantId/recipes', requireAuth, async (req: Request, res: Response) => {
    try {
      const recipes = await storage.getRecipes(req.params.restaurantId);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.post('/api/restaurants/:restaurantId/recipes', requireAuth, async (req: Request, res: Response) => {
    try {
      const recipeData = insertRecipeSchema.parse(req.body);
      recipeData.restaurantId = req.params.restaurantId;
      
      const recipe = await storage.createRecipe(recipeData);
      res.status(201).json(recipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  // Clover webhook endpoint (public, no auth required but signature verified)
  app.post('/api/webhook/clover', async (req: Request, res: Response) => {
    try {
      await WebhookService.processWebhook(req.body, req.headers);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Test webhook endpoint
  app.post('/api/webhook/clover/test', requireAuth, async (req: Request, res: Response) => {
    try {
      // Simulate a test order for webhook processing
      const testOrder = {
        appId: 'TEST_APP',
        merchants: {
          'TEST_MERCHANT': [{
            objectId: 'test_order_123',
            type: 'CREATE',
            ts: Date.now()
          }]
        }
      };
      
      await WebhookService.processWebhook(testOrder, {});
      res.json({ success: true, message: "Test webhook processed" });
    } catch (error) {
      console.error("Test webhook error:", error);
      res.status(500).json({ message: "Failed to process test webhook" });
    }
  });

  // Alert testing
  app.post('/api/alerts/test', requireAuth, async (req: Request, res: Response) => {
    try {
      const { restaurantId, type } = req.body;
      await testAlert(restaurantId, type);
      res.json({ success: true, message: "Test alert sent" });
    } catch (error) {
      console.error("Test alert error:", error);
      res.status(500).json({ message: "Failed to send test alert" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}