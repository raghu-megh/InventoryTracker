import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, type AuthenticatedRequest } from "./firebaseAuth";
import { WebhookService } from "./webhookService";
import { CloverService } from "./cloverService";
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

      // If Clover Merchant ID is provided, sync menu items from Clover
      if (restaurantData.cloverMerchantId) {
        try {
          await syncCloverMenuItems(restaurant.id, restaurantData.cloverMerchantId);
          console.log(`Synced menu items for restaurant ${restaurant.id} from Clover merchant ${restaurantData.cloverMerchantId}`);
        } catch (syncError) {
          console.error('Error syncing Clover menu items:', syncError);
          // Don't fail restaurant creation if sync fails
        }
      }

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
      console.log("Inventory API response sample:", JSON.stringify(inventory.slice(0, 2), null, 2));
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
      
      let materialData = { ...req.body, restaurantId };
      
      // Convert units to metric if needed
      const inputUnit = materialData.baseUnit;
      let metricUnit = inputUnit;
      let conversionFactor = 1;
      
      // Define target metric units for each type
      const metricTargets = {
        weight: ['kg', 'g'],
        volume: ['l', 'ml'],
        count: ['pieces']
      };
      
      // Check if we need to convert to metric
      const isAlreadyMetric = Object.values(metricTargets).flat().includes(inputUnit);
      
      if (!isAlreadyMetric) {
        // Find conversion to appropriate metric unit
        try {
          // Try converting to kg first for weight units
          if (['lbs', 'pounds', 'lb'].includes(inputUnit)) {
            conversionFactor = await storage.convertUnit(1, inputUnit, 'kg');
            metricUnit = 'kg';
          }
          // Try converting to g for smaller weight units
          else if (['oz', 'ounces'].includes(inputUnit)) {
            conversionFactor = await storage.convertUnit(1, inputUnit, 'g');
            metricUnit = 'g';
          }
          // Try converting to liters for large volume units
          else if (['gallon', 'gallons', 'quart', 'quarts'].includes(inputUnit)) {
            conversionFactor = await storage.convertUnit(1, inputUnit, 'l');
            metricUnit = 'l';
          }
          // Try converting to ml for smaller volume units
          else if (['cups', 'cup', 'pint', 'pints', 'fl oz', 'tbsp', 'tsp', 'tablespoons', 'teaspoons'].includes(inputUnit)) {
            conversionFactor = await storage.convertUnit(1, inputUnit, 'ml');
            metricUnit = 'ml';
          }
          
          // Convert all quantity values
          materialData.currentStock = materialData.currentStock * conversionFactor;
          materialData.minLevel = materialData.minLevel * conversionFactor;
          if (materialData.maxLevel) {
            materialData.maxLevel = materialData.maxLevel * conversionFactor;
          }
          // Note: cost per unit should be divided by conversion factor since it's per converted unit
          if (materialData.costPerUnit) {
            materialData.costPerUnit = materialData.costPerUnit / conversionFactor;
          }
          
          materialData.baseUnit = metricUnit;
          
          console.log(`Converted ${inputUnit} to ${metricUnit} with factor ${conversionFactor}`);
        } catch (conversionError) {
          console.warn(`Could not convert ${inputUnit} to metric:`, conversionError);
          // Continue with original unit if conversion fails
        }
      }
      
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

  // Recipe routes
  app.get('/api/restaurants/:restaurantId/recipes', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const { restaurantId } = req.params;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) return res.status(403).json({ message: "Access denied" });
      
      const recipes = await storage.getRecipes(restaurantId);
      
      // Add ingredients to each recipe
      const recipesWithIngredients = await Promise.all(
        recipes.map(async (recipe) => {
          const ingredients = await storage.getRecipeIngredients(recipe.id);
          return { ...recipe, ingredients };
        })
      );
      
      res.json(recipesWithIngredients);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  // Get recipe ingredients
  app.get('/api/restaurants/:restaurantId/recipes/:recipeId/ingredients', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const { restaurantId, recipeId } = req.params;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) return res.status(403).json({ message: "Access denied" });
      
      const ingredients = await storage.getRecipeIngredients(recipeId);
      res.json(ingredients);
    } catch (error) {
      console.error("Error fetching recipe ingredients:", error);
      res.status(500).json({ message: "Failed to fetch recipe ingredients" });
    }
  });

  // Update recipe
  app.put('/api/restaurants/:restaurantId/recipes/:recipeId', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const { restaurantId, recipeId } = req.params;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role || !['admin', 'manager'].includes(role)) return res.status(403).json({ message: "Access denied" });
      
      let recipeData = { ...req.body };
      const ingredients = recipeData.ingredients || [];
      delete recipeData.ingredients;
      
      console.log('Updating recipe:', recipeId, 'with data:', recipeData);
      console.log('Updating ingredients:', ingredients);

      // Update the recipe
      const updatedRecipe = await storage.updateRecipe(recipeId, recipeData);
      
      // Handle ingredients update
      if (ingredients.length > 0) {
        // Get existing ingredients
        const existingIngredients = await storage.getRecipeIngredients(recipeId);
        const existingIds = new Set(existingIngredients.map(ing => ing.id));
        
        // Process each ingredient
        for (const ingredient of ingredients) {
          const inputUnit = ingredient.unit;
          let metricUnit = inputUnit;
          let conversionFactor = 1;
          
          // Check if we need to convert to metric
          const isAlreadyMetric = ['kg', 'g', 'l', 'ml', 'pieces'].includes(inputUnit);
          
          if (!isAlreadyMetric) {
            try {
              // Convert to appropriate metric unit
              if (['lbs', 'pounds', 'lb'].includes(inputUnit)) {
                conversionFactor = await storage.convertUnit(1, inputUnit, 'kg');
                metricUnit = 'kg';
              }
              else if (['oz', 'ounces'].includes(inputUnit)) {
                conversionFactor = await storage.convertUnit(1, inputUnit, 'g');
                metricUnit = 'g';
              }
              else if (['gallon', 'gallons', 'quart', 'quarts'].includes(inputUnit)) {
                conversionFactor = await storage.convertUnit(1, inputUnit, 'l');
                metricUnit = 'l';
              }
              else if (['cups', 'cup', 'pint', 'pints', 'fl oz', 'tbsp', 'tsp', 'tablespoons', 'teaspoons'].includes(inputUnit)) {
                conversionFactor = await storage.convertUnit(1, inputUnit, 'ml');
                metricUnit = 'ml';
              }
              
              console.log(`Converting ingredient ${inputUnit} to ${metricUnit} with factor ${conversionFactor}`);
            } catch (conversionError) {
              console.warn(`Could not convert ${inputUnit} to metric:`, conversionError);
            }
          }

          const ingredientData = {
            recipeId,
            rawMaterialId: ingredient.rawMaterialId,
            quantity: ingredient.quantity * conversionFactor,
            unit: metricUnit
          };

          if (ingredient.id && existingIds.has(ingredient.id)) {
            // Update existing ingredient
            await storage.updateRecipeIngredient(ingredient.id, ingredientData);
          } else {
            // Add new ingredient
            await storage.addRecipeIngredient(ingredientData);
          }
        }

        // Remove ingredients that are no longer in the update
        const updatedIngredientIds = new Set(ingredients.filter(ing => ing.id).map(ing => ing.id));
        for (const existingIngredient of existingIngredients) {
          if (!updatedIngredientIds.has(existingIngredient.id)) {
            await storage.removeRecipeIngredient(existingIngredient.id);
          }
        }
      }
      
      res.json(updatedRecipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ message: "Failed to update recipe" });
    }
  });

  app.post('/api/restaurants/:restaurantId/recipes', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const { restaurantId } = req.params;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role || !['admin', 'manager'].includes(role)) return res.status(403).json({ message: "Access denied" });
      
      let recipeData = { ...req.body, restaurantId };
      const ingredients = recipeData.ingredients || [];
      delete recipeData.ingredients;
      
      console.log('Received recipe data:', recipeData);
      console.log('Received ingredients:', ingredients);

      // Convert ingredient units to metric if needed
      const convertedIngredients = [];
      for (const ingredient of ingredients) {
        const inputUnit = ingredient.unit;
        let metricUnit = inputUnit;
        let conversionFactor = 1;
        
        // Check if we need to convert to metric
        const isAlreadyMetric = ['kg', 'g', 'l', 'ml', 'pieces'].includes(inputUnit);
        
        if (!isAlreadyMetric) {
          try {
            // Convert to appropriate metric unit
            if (['lbs', 'pounds', 'lb'].includes(inputUnit)) {
              conversionFactor = await storage.convertUnit(1, inputUnit, 'kg');
              metricUnit = 'kg';
            }
            else if (['oz', 'ounces'].includes(inputUnit)) {
              conversionFactor = await storage.convertUnit(1, inputUnit, 'g');
              metricUnit = 'g';
            }
            else if (['gallon', 'gallons', 'quart', 'quarts'].includes(inputUnit)) {
              conversionFactor = await storage.convertUnit(1, inputUnit, 'l');
              metricUnit = 'l';
            }
            else if (['cups', 'cup', 'pint', 'pints', 'fl oz', 'tbsp', 'tsp', 'tablespoons', 'teaspoons'].includes(inputUnit)) {
              conversionFactor = await storage.convertUnit(1, inputUnit, 'ml');
              metricUnit = 'ml';
            }
            
            console.log(`Converting ingredient ${inputUnit} to ${metricUnit} with factor ${conversionFactor}`);
          } catch (conversionError) {
            console.warn(`Could not convert ${inputUnit} to metric:`, conversionError);
          }
        }

        convertedIngredients.push({
          rawMaterialId: ingredient.rawMaterialId,
          quantity: ingredient.quantity * conversionFactor,
          unit: metricUnit
        });
      }
      
      // Create the recipe
      const recipe = await storage.createRecipe(recipeData);
      
      // Add ingredients to the recipe
      for (const ingredient of convertedIngredients) {
        await storage.addRecipeIngredient({
          recipeId: recipe.id,
          ...ingredient
        });
      }
      
      res.status(201).json(recipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  app.get('/api/restaurants/:restaurantId/recipes/:recipeId', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const { restaurantId, recipeId } = req.params;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const role = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!role) return res.status(403).json({ message: "Access denied" });
      
      const recipe = await storage.getRecipe(recipeId);
      if (!recipe || recipe.restaurantId !== restaurantId) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      const ingredients = await storage.getRecipeIngredients(recipeId);
      res.json({ ...recipe, ingredients });
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
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

  // Menu items routes
  app.get('/api/restaurants/:restaurantId/menu-items', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { restaurantId } = req.params;

      // Check user access to restaurant
      const userRole = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const menuItems = await storage.getMenuItems(restaurantId);
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.post('/api/restaurants/:restaurantId/sync-clover-menu', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { restaurantId } = req.params;

      // Check if user has admin access to restaurant
      const userRole = await storage.getUserRestaurantRole(userId, restaurantId);
      if (!userRole || userRole !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || !restaurant.cloverMerchantId) {
        return res.status(400).json({ message: "Restaurant not found or Clover Merchant ID not configured" });
      }

      await syncCloverMenuItems(restaurantId, restaurant.cloverMerchantId);
      
      const menuItems = await storage.getMenuItems(restaurantId);
      res.json({ message: "Menu items synced successfully from Clover POS", menuItems });
    } catch (error: any) {
      console.error("Error syncing Clover menu items:", error);
      if (error.message?.includes('Clover API')) {
        res.status(502).json({ message: `Clover API Error: ${error.message}` });
      } else if (error.message?.includes('credentials not configured')) {
        res.status(500).json({ message: "Clover API credentials not configured" });
      } else {
        res.status(500).json({ message: "Failed to sync menu items" });
      }
    }
  });

  // Test endpoint for new Clover webhook structure (public, no auth required)
  // IMPORTANT: This must come BEFORE the parameterized route to avoid conflicts
  app.post('/api/webhook/clover/test', async (req: Request, res: Response) => {
    try {
      console.log('Received test Clover webhook:', req.body);

      // Use the direct payload if provided, otherwise create a test payload
      const testPayload = req.body.appId ? req.body : (req.body.payload || {
        appId: "2J5KGC1P86S96",
        merchants: {
          "QTQG5J1TGM7Z1": [{
            objectId: "O:SS0ZDABHK0WGJ",
            type: "CREATE", 
            ts: Date.now()
          }]
        }
      });

      // Process the test webhook
      await WebhookService.processCloverWebhook(testPayload);

      res.status(200).json({ 
        message: "Test webhook processed successfully",
        processedPayload: testPayload
      });
    } catch (error) {
      console.error("Error processing test Clover webhook:", error);
      res.status(500).json({ 
        message: "Test webhook failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Clover webhook endpoint with OAuth security
  // Handles new webhook payload structure: {"appId":"...", "merchants":{"merchantId":[events]}}
  app.post('/api/webhook/clover', async (req: Request, res: Response) => {
    try {
      const signature = req.headers['clover-signature'] as string;
      const authCode = req.headers['x-clover-auth'] as string;
      const payload = JSON.stringify(req.body);

      console.log('Received Clover webhook with headers:', {
        signature: signature ? 'present' : 'missing',
        authCode: authCode ? 'present' : 'missing'
      });

      // Validate that payload has the expected structure
      if (!req.body.appId || !req.body.merchants || typeof req.body.merchants !== 'object') {
        console.error('Invalid webhook payload structure');
        return res.status(400).json({ message: "Invalid payload structure" });
      }

      // Security validation for each merchant
      const merchantIds = Object.keys(req.body.merchants);
      for (const merchantId of merchantIds) {
        // Find restaurant by merchant ID
        const restaurant = await storage.getRestaurantByCloverMerchantId(merchantId);
        if (!restaurant) {
          console.error(`Restaurant not found for merchant ID: ${merchantId}`);
          return res.status(404).json({ message: `Restaurant not found for merchant ${merchantId}` });
        }

        // Verify webhook signature if restaurant has webhook secret configured
        if (restaurant.webhookSecret && signature) {
          const isValidSignature = WebhookService.verifyCloverSignature(payload, signature, restaurant.webhookSecret);
          if (!isValidSignature) {
            console.error(`Invalid webhook signature for merchant ${merchantId}`);
            return res.status(401).json({ message: "Invalid webhook signature" });
          }
          console.log(`Webhook signature verified for merchant ${merchantId}`);
        }

        // Verify auth code if provided (additional security layer)
        if (authCode && restaurant.cloverAuthCode && authCode !== restaurant.cloverAuthCode) {
          console.error(`Invalid auth code for merchant ${merchantId}`);
          return res.status(401).json({ message: "Invalid authentication code" });
        }
      }

      // Process the webhook payload using the new structure
      await WebhookService.processCloverWebhook(req.body);

      res.status(200).json({ message: "Webhook processed successfully" });
    } catch (error) {
      console.error("Error processing Clover webhook:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Legacy webhook endpoint for backward compatibility
  app.post('/api/webhook/clover/:merchantId', async (req: Request, res: Response) => {
    try {
      const merchantId = req.params.merchantId;
      const signature = req.headers['clover-signature'] as string;
      const payload = JSON.stringify(req.body);

      console.log(`Received legacy Clover webhook for merchant ${merchantId}:`, req.body);

      // Find restaurant by Clover merchant ID
      const restaurant = await storage.getRestaurantByCloverMerchantId(merchantId);
      if (!restaurant) {
        console.error(`Restaurant not found for merchant ID: ${merchantId}`);
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Convert legacy payload to new format and process
      const newFormatPayload = {
        appId: req.body.appId || 'legacy',
        merchants: {
          [merchantId]: [{
            objectId: req.body.objectId,
            type: req.body.type,
            ts: req.body.ts || Date.now()
          }]
        }
      };

      await WebhookService.processCloverWebhook(newFormatPayload);

      res.status(200).json({ message: "Webhook processed successfully" });
    } catch (error) {
      console.error("Error processing legacy Clover webhook:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Test endpoint for simulating Clover webhook notifications (development only)
  app.post('/api/webhook/clover/:merchantId/test', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const merchantId = req.params.merchantId;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Find restaurant and verify user access
      const restaurant = await storage.getRestaurantByCloverMerchantId(merchantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const role = await storage.getUserRestaurantRole(userId, restaurant.id);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Create test order payload
      const testOrderPayload = {
        appId: "test-app",
        merchantId: merchantId,
        type: "ORDER_PAID",
        objectId: `test-order-${Date.now()}`,
        ts: Date.now(),
        data: {
          lineItems: req.body.lineItems || [
            {
              item: {
                id: "test-item-1",
                name: "Test Pizza"
              },
              unitQty: 2
            }
          ]
        }
      };

      // Process the test webhook
      await WebhookService.processWebhookEvent(testOrderPayload, restaurant.id);

      res.status(200).json({ 
        message: "Test webhook processed successfully",
        payload: testOrderPayload 
      });
    } catch (error) {
      console.error("Error processing test webhook:", error);
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

  // Test Clover API connection
  app.get('/api/clover/test', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const isConnected = await CloverService.testConnection();
      res.json({ 
        connected: isConnected,
        message: isConnected ? 'Clover API connection successful' : 'Clover API connection failed - check credentials'
      });
    } catch (error) {
      console.error("Error testing Clover connection:", error);
      res.status(500).json({ 
        connected: false,
        message: "Failed to test Clover connection" 
      });
    }
  });

  // Test Clover sync with specific merchant ID
  app.post('/api/clover/test-sync', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const { merchantId, restaurantId } = req.body;
      
      if (!merchantId || !restaurantId) {
        return res.status(400).json({ message: "merchantId and restaurantId are required" });
      }

      await CloverService.syncMenuItems(restaurantId, merchantId);
      const menuItems = await storage.getMenuItems(restaurantId);
      
      res.json({ 
        message: `Successfully synced ${menuItems.length} menu items from Clover merchant ${merchantId}`,
        menuItems
      });
    } catch (error: any) {
      console.error("Error testing Clover sync:", error);
      res.status(500).json({ 
        message: `Failed to sync from Clover: ${error.message}` 
      });
    }
  });

  // Get recipe by menu item ID
  app.get('/api/menu-items/:menuItemId/recipe', isAuthenticated as any, async (req: any, res: any) => {
    try {
      const userId = req.user?.uid;
      const menuItemId = req.params.menuItemId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get the menu item to check restaurant access
      const menuItem = await storage.getMenuItem(menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      // Check if user has access to this restaurant
      const role = await storage.getUserRestaurantRole(userId, menuItem.restaurantId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }

      const recipe = await storage.getRecipeByMenuItemId(menuItemId);
      res.json(recipe || null);
    } catch (error) {
      console.error("Error fetching recipe for menu item:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  // Test endpoint for Azure receipt analysis (no auth required for testing)
  app.post('/api/test-receipt', upload.single('receipt'), async (req: any, res: any) => {
    try {
      console.log("=== RECEIPT ANALYSIS TEST STARTED ===");
      
      if (!req.file) {
        return res.status(400).json({ message: "No receipt image provided" });
      }

      console.log("File received:", {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      const { azureDocumentService } = await import('./azureDocumentServiceNew');
      
      console.log("Calling Azure Document Intelligence...");
      const analysisResult = await azureDocumentService.analyzeReceipt(req.file.buffer);
      console.log("Azure analysis completed successfully!");
      
      res.json({
        success: true,
        analysis: analysisResult,
        fileInfo: {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
      
    } catch (error) {
      console.error("=== RECEIPT ANALYSIS TEST FAILED ===");
      console.error("Error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to analyze receipt", 
        error: error.message,
        stack: error.stack
      });
    }
  });

  // Raw material purchases routes
  app.post('/api/restaurants/:restaurantId/purchases', isAuthenticated as any, async (req: any, res: any) => {
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

      const { items, ...purchaseData } = req.body;

      // Create the purchase record
      const purchase = await storage.createRawMaterialPurchase({
        ...purchaseData,
        userId,
        restaurantId,
      });

      // Create purchase items and update raw material stock
      for (const item of items) {
        // Create purchase item
        await storage.createRawMaterialPurchaseItem({
          purchaseId: purchase.id,
          ...item,
        });

        // Update raw material stock if rawMaterialId is provided
        if (item.rawMaterialId) {
          const rawMaterial = await storage.getRawMaterial(item.rawMaterialId);
          if (rawMaterial) {
            const previousStock = Number(rawMaterial.currentStock);
            const addedQuantity = Number(item.quantity);
            const newStock = previousStock + addedQuantity;

            // Update the raw material stock
            await storage.updateRawMaterial(item.rawMaterialId, {
              currentStock: newStock.toString(),
            });

            // Create movement record
            await storage.createRawMaterialMovement({
              restaurantId,
              rawMaterialId: item.rawMaterialId,
              movementType: 'purchase',
              quantity: addedQuantity,
              previousStock,
              newStock,
              reason: `Purchase from ${purchaseData.vendorName}`,
            });
          }
        }
      }

      res.json(purchase);
    } catch (error) {
      console.error("Error creating purchase:", error);
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  app.get('/api/restaurants/:restaurantId/purchases', isAuthenticated as any, async (req: any, res: any) => {
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

      const purchases = await storage.getRawMaterialPurchases(restaurantId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // Receipt analysis endpoint
  app.post('/api/restaurants/:restaurantId/analyze-receipt', 
    isAuthenticated as any, 
    upload.single('receipt'), 
    async (req: any, res: any) => {
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

        if (!req.file) {
          return res.status(400).json({ message: "No receipt image provided" });
        }

        try {
          console.log("Processing receipt file:", req.file.originalname, "Size:", req.file.size);
          
          const { azureDocumentService } = await import('./azureDocumentServiceNew');
          
          // Analyze the receipt using Azure Document Intelligence
          const analysisResult = await azureDocumentService.analyzeReceipt(req.file.buffer);
          
          // Get existing raw materials for matching
          const rawMaterials = await storage.getRawMaterials(restaurantId);
          
          // Try to match detected items with existing raw materials
          for (const item of analysisResult.items) {
            const matchResult = await azureDocumentService.findBestRawMaterialMatch(item.name, rawMaterials);
            if (matchResult.match && matchResult.confidence > 0.6) {
              item.suggestedRawMaterial = matchResult.match;
              item.matchConfidence = matchResult.confidence;
            }
          }
          
          res.json(analysisResult);
          
        } catch (error) {
          console.error("Error analyzing receipt with Azure AI:", error);
          
          // Provide helpful error message for Azure configuration issues
          if (error.message.includes('Azure endpoints failed') || error.message.includes('ENOTFOUND')) {
            res.status(500).json({ 
              message: "Azure Document Intelligence configuration error", 
              error: error.message,
              suggestion: "Please check your Azure resource configuration and provide the correct endpoint URL"
            });
          } else {
            res.status(500).json({ 
              message: "Failed to analyze receipt", 
              error: error.message 
            });
          }
        }

      } catch (error) {
        console.error("Error processing receipt:", error);
        res.status(500).json({ message: "Failed to process receipt" });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
