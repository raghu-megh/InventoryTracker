import { Router } from "express";
import { requireAuth, setupCloverAuth } from "../cloverAuth";
import { WebhookService } from "../webhookService";
import { CloverService } from "../cloverService";
import {
  checkLowStockAndAlert,
  sendDailySummary,
  testAlert,
} from "../alertService";
import { storage } from "../storage";
import multer from "multer";
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
import { authRoutes } from "./cloverAuthRoutes";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Clover OAuth setup
router.use("/auth/clover", authRoutes);

// Auth user info
router.get("/auth/user", async (req: any, res) => {
  if (!req.session?.user)
    return res.status(401).json({ error: "Not authenticated" });
  const user = await storage.getUser(req.session.user.id);
  if (!user) return res.status(401).json({ error: "User not found" });
  const restaurants = await storage.getUserRestaurants(req.session.user.id);
  res.json({
    ...user,
    restaurants: restaurants.map((ur) => ({ ...ur.restaurant, role: ur.role })),
  });
});

// Restaurants
router.get("/restaurants", requireAuth, async (req: any, res) => {
  const data = await storage.getUserRestaurants(req.session.user.id);
  res.json(data);
});

router.post("/restaurants", requireAuth, async (req: any, res) => {
  const data = insertRestaurantSchema.parse(req.body);
  data.cloverMerchantId = req.session.user.id;
  const restaurant = await storage.createRestaurant(data);
  await storage.addUserToRestaurant({
    userId: req.session.user.id,
    restaurantId: restaurant.id,
    role: "owner",
  });
  res.status(201).json(restaurant);
});

router.get("/restaurants/:id", requireAuth, async (req, res) => {
  const data = await storage.getRestaurant(req.params.id);
  if (!data) return res.status(404).json({ message: "Not found" });
  res.json(data);
});

// Inventory
router.post(
  "/restaurants/:restaurantId/categories",
  requireAuth,
  async (req, res) => {
    const data = insertInventoryCategorySchema.parse(req.body);
    data.restaurantId = req.params.restaurantId;
    res.status(201).json(await storage.createInventoryCategory(data));
  }
);

router.get(
  "/restaurants/:restaurantId/categories",
  requireAuth,
  async (req, res) => {
    res.json(await storage.getRestaurantCategories(req.params.restaurantId));
  }
);

router.post(
  "/restaurants/:restaurantId/inventory",
  requireAuth,
  async (req, res) => {
    const data = insertInventoryItemSchema.parse(req.body);
    data.restaurantId = req.params.restaurantId;
    res.status(201).json(await storage.createInventoryItem(data));
  }
);

router.get(
  "/restaurants/:restaurantId/inventory",
  requireAuth,
  async (req, res) => {
    res.json(await storage.getRestaurantInventory(req.params.restaurantId));
  }
);

// Raw Materials
router.get(
  "/restaurants/:restaurantId/raw-materials",
  requireAuth,
  async (req, res) => {
    res.json(await storage.getRawMaterials(req.params.restaurantId));
  }
);

router.post(
  "/restaurants/:restaurantId/raw-materials",
  requireAuth,
  async (req, res) => {
    const data = insertRawMaterialSchema.parse(req.body);
    data.restaurantId = req.params.restaurantId;
    res.status(201).json(await storage.createRawMaterial(data));
  }
);

// Menu
router.get(
  "/restaurants/:restaurantId/menu-items",
  requireAuth,
  async (req, res) => {
    res.json(await storage.getMenuItems(req.params.restaurantId));
  }
);

router.post(
  "/restaurants/:restaurantId/sync-menu",
  requireAuth,
  async (req, res) => {
    const restaurant = await storage.getRestaurant(req.params.restaurantId);
    if (!restaurant?.cloverMerchantId)
      return res.status(400).json({ message: "Missing Clover integration" });
    await CloverService.syncMenuItems(
      req.params.restaurantId,
      restaurant.cloverMerchantId
    );
    res.json({ success: true });
  }
);

router.get(
  "/restaurants/:restaurantId/clover-status",
  requireAuth,
  async (req, res) => {
    const r = await storage.getRestaurant(req.params.restaurantId);
    if (!r) return res.status(404).json({ message: "Restaurant not found" });
    res.json({
      hasCloverIntegration: !!r.cloverMerchantId,
      cloverMerchantId: r.cloverMerchantId,
      hasAccessToken: !!r.cloverAccessToken,
      accessTokenPreview: r.cloverAccessToken?.substring(0, 10) ?? null,
      apiEndpoint: `${process.env.CLOVER_API_BASE}/merchants/${r.cloverMerchantId}/items`,
      oauthStatus: r.cloverAccessToken ? "OAuth2 Ready" : "OAuth2 Required",
    });
  }
);

// Recipes
router.get(
  "/restaurants/:restaurantId/recipes",
  requireAuth,
  async (req, res) => {
    res.json(await storage.getRecipes(req.params.restaurantId));
  }
);

router.post(
  "/restaurants/:restaurantId/recipes",
  requireAuth,
  async (req, res) => {
    const data = insertRecipeSchema.parse(req.body);
    data.restaurantId = req.params.restaurantId;
    res.status(201).json(await storage.createRecipe(data));
  }
);

// Webhooks
router.post("/webhook/clover", async (req, res) => {
  await WebhookService.processWebhook(req.body, req.headers);
  res.status(200).json({ success: true });
});

router.post("/webhook/clover/test", requireAuth, async (req, res) => {
  await WebhookService.processWebhook(
    {
      appId: "TEST_APP",
      merchants: {
        TEST_MERCHANT: [
          { objectId: "test_order_123", type: "CREATE", ts: Date.now() },
        ],
      },
    },
    {}
  );
  res.json({ success: true });
});

// Alerts
router.post("/alerts/test", requireAuth, async (req, res) => {
  const { restaurantId } = req.body;
  await testAlert(restaurantId);
  res.json({ success: true });
});

export default router;
