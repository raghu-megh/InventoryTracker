import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, type AuthenticatedRequest } from "./firebaseAuth";
import { WebhookService } from "./webhookService";
import { insertRestaurantSchema, insertInventoryItemSchema, insertInventoryCategorySchema } from "@shared/schema";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.get('/api/auth/user', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      // Auto-create user if they don't exist
      let user = await storage.getUser(userId);
      if (!user) {
        try {
          user = await storage.upsertUser({
            id: userId,
            email: req.user?.email || null,
            firstName: req.user?.name?.split(' ')[0] || null,
            lastName: req.user?.name?.split(' ').slice(1).join(' ') || null,
            profileImageUrl: null,
          });
        } catch (error: any) {
          if (error.code === '23505') {
            // Unique constraint violation - user already exists with this email
            // We need to create the user without the email conflict
            console.log('Email conflict, creating user without email initially');
            user = await storage.upsertUser({
              id: userId,
              email: null, // Don't set email to avoid conflict
              firstName: req.user?.name?.split(' ')[0] || null,
              lastName: req.user?.name?.split(' ').slice(1).join(' ') || null,
              profileImageUrl: null,
            });
          } else {
            throw error;
          }
        }
      }

      // Get user's restaurants
      const userRestaurants = await storage.getUserRestaurants(userId);
      
      res.json({
        ...user,
        restaurants: userRestaurants.map(ur => ({
          ...ur.restaurant,
          role: ur.role,
        })),
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Restaurant routes
  app.post('/api/restaurants', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const restaurantData = insertRestaurantSchema.parse(req.body);
      
      // Check if Clover Merchant ID already exists
      if (restaurantData.cloverMerchantId) {
        const existingRestaurant = await storage.getRestaurantByCloverMerchantId(restaurantData.cloverMerchantId);
        if (existingRestaurant) {
          return res.status(400).json({ 
            message: `A restaurant with Clover Merchant ID "${restaurantData.cloverMerchantId}" already exists. Please use a different Merchant ID.` 
          });
        }
      }
      
      // Generate webhook secret
      const webhookSecret = crypto.randomBytes(32).toString('hex');
      
      const restaurant = await storage.createRestaurant({
        ...restaurantData,
        webhookSecret,
      });

      // Add user as admin of the restaurant
      await storage.addUserToRestaurant({
        userId,
        restaurantId: restaurant.id,
        role: 'admin',
      });

      res.json(restaurant);
    } catch (error: any) {
      console.error("Error creating restaurant:", error);
      
      if (error.code === '23505' && error.constraint === 'restaurants_clover_merchant_id_unique') {
        return res.status(400).json({ 
          message: "This Clover Merchant ID is already registered with another restaurant. Please use a different Merchant ID." 
        });
      }
      
      res.status(500).json({ message: "Failed to create restaurant" });
    }
  });

  app.get('/api/restaurants/:id', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      res.json(restaurant);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  // Dashboard metrics
  app.get('/api/restaurants/:id/metrics', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      const metrics = await storage.getDashboardMetrics(restaurantId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Inventory categories
  app.post('/api/restaurants/:id/categories', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role || !['admin', 'manager'].includes(role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const categoryData = insertInventoryCategorySchema.parse({
        ...req.body,
        restaurantId,
      });

      const category = await storage.createInventoryCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.get('/api/restaurants/:id/categories', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      const categories = await storage.getRestaurantCategories(restaurantId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Inventory items
  app.post('/api/restaurants/:id/inventory', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role || !['admin', 'manager'].includes(role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const itemData = insertInventoryItemSchema.parse({
        ...req.body,
        restaurantId,
      });

      const item = await storage.createInventoryItem(itemData);
      res.json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.get('/api/restaurants/:id/inventory', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      const inventory = await storage.getRestaurantInventory(restaurantId);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get('/api/restaurants/:id/inventory/low-stock', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      const lowStockItems = await storage.getLowStockItems(restaurantId);
      res.json(lowStockItems);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  // Webhook events
  app.get('/api/restaurants/:id/webhook-events', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      const events = await storage.getRecentWebhookEvents(restaurantId, limit);
      res.json(events);
    } catch (error) {
      console.error("Error fetching webhook events:", error);
      res.status(500).json({ message: "Failed to fetch webhook events" });
    }
  });

  // User management
  app.get('/api/restaurants/:id/users', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role || !['admin', 'manager'].includes(role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const users = await storage.getRestaurantUsers(restaurantId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching restaurant users:", error);
      res.status(500).json({ message: "Failed to fetch restaurant users" });
    }
  });

  // Raw material categories routes
  app.get('/api/restaurants/:restaurantId/raw-material-categories', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const { restaurantId } = req.params;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) return res.status(403).json({ message: "Access denied" });
      
      const categories = await storage.getRawMaterialCategories(restaurantId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching raw material categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/restaurants/:restaurantId/raw-material-categories', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const { restaurantId } = req.params;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role || !['admin', 'manager'].includes(role)) return res.status(403).json({ message: "Access denied" });
      
      const categoryData = { ...req.body, restaurantId };
      const category = await storage.createRawMaterialCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating raw material category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Raw materials routes
  app.get('/api/restaurants/:restaurantId/raw-materials', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const { restaurantId } = req.params;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) return res.status(403).json({ message: "Access denied" });
      
      const materials = await storage.getRawMaterials(restaurantId);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching raw materials:", error);
      res.status(500).json({ message: "Failed to fetch raw materials" });
    }
  });

  app.post('/api/restaurants/:restaurantId/raw-materials', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const { restaurantId } = req.params;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role || !['admin', 'manager'].includes(role)) return res.status(403).json({ message: "Access denied" });
      
      const materialData = { ...req.body, restaurantId };
      const material = await storage.createRawMaterial(materialData);
      res.status(201).json(material);
    } catch (error) {
      console.error("Error creating raw material:", error);
      res.status(500).json({ message: "Failed to create raw material" });
    }
  });

  app.get('/api/restaurants/:restaurantId/raw-materials/low-stock', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const { restaurantId } = req.params;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) return res.status(403).json({ message: "Access denied" });
      
      const lowStockMaterials = await storage.getLowStockRawMaterials(restaurantId);
      res.json(lowStockMaterials);
    } catch (error) {
      console.error("Error fetching low stock raw materials:", error);
      res.status(500).json({ message: "Failed to fetch low stock materials" });
    }
  });

  // Unit conversions route
  app.get('/api/unit-conversions', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const conversions = await storage.getUnitConversions();
      res.json(conversions);
    } catch (error) {
      console.error("Error fetching unit conversions:", error);
      res.status(500).json({ message: "Failed to fetch unit conversions" });
    }
  });

  // Clover webhook endpoint (public, no auth required)
  app.post('/api/webhook/clover/:merchantId', async (req: Request, res: Response) => {
    try {
      const merchantId = req.params.merchantId;
      const signature = req.headers['clover-signature'] as string;
      const payload = JSON.stringify(req.body);

      // Find restaurant by Clover merchant ID
      const restaurant = await storage.getRestaurantByCloverMerchantId(merchantId);
      if (!restaurant) {
        console.error(`Restaurant not found for merchant ID: ${merchantId}`);
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Verify webhook signature if secret is configured
      if (restaurant.webhookSecret && signature) {
        const isValid = WebhookService.verifyCloverSignature(payload, signature, restaurant.webhookSecret);
        if (!isValid) {
          console.error(`Invalid webhook signature for merchant ID: ${merchantId}`);
          return res.status(401).json({ message: "Invalid signature" });
        }
      }

      // Process the webhook event
      await WebhookService.processWebhookEvent(req.body, restaurant.id);

      res.status(200).json({ message: "Webhook processed successfully" });
    } catch (error) {
      console.error("Error processing Clover webhook:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Inventory categories routes
  app.post('/api/restaurants/:restaurantId/categories', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.restaurantId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      const categoryData = insertInventoryCategorySchema.parse({
        ...req.body,
        restaurantId,
      });

      const category = await storage.createInventoryCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.get('/api/restaurants/:restaurantId/categories', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.restaurantId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      const categories = await storage.getRestaurantCategories(restaurantId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Inventory items routes
  app.post('/api/restaurants/:restaurantId/inventory', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.restaurantId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      const itemData = insertInventoryItemSchema.parse({
        ...req.body,
        restaurantId,
      });

      const item = await storage.createInventoryItem(itemData);
      res.json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.get('/api/restaurants/:restaurantId/inventory', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.restaurantId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      const inventory = await storage.getRestaurantInventory(restaurantId);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get('/api/restaurants/:restaurantId/inventory/low-stock', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const restaurantId = req.params.restaurantId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      const lowStockItems = await storage.getLowStockItems(restaurantId);
      res.json(lowStockItems);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
