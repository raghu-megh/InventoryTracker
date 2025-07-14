import crypto from "crypto";
import { storage } from "./storage";
import type { Restaurant, InventoryItem, InsertStockMovement, InsertSale } from "@shared/schema";

// New webhook payload structure based on user specification
interface CloverWebhookEvent {
  objectId: string;    // Format: "O:SS0ZDABHK0WGJ" where O = Order, I = Inventory, etc.
  type: string;        // CREATE, UPDATE, DELETE, etc.
  ts: number;          // Timestamp of the event
}

interface CloverWebhookPayload {
  appId: string;       // Clover app ID: "2J5KGC1P86S96"
  merchants: {
    [merchantId: string]: CloverWebhookEvent[];  // "QTQG5J1TGM7Z1": [events]
  };
}

// Legacy payload structure for backward compatibility
interface LegacyCloverWebhookPayload {
  appId: string;
  merchantId: string;
  type: string;
  objectId: string;
  ts: number;
  data?: any;
}

interface CloverPaymentPayload {
  created_time: string;
  message: string;
  status: string;
  type: string;
  id: string;
  merchant_id: string;
  data: string;
}

// Object type mapping based on Clover documentation
// https://docs.clover.com/dev/docs/webhooks#event-type-keys
const CLOVER_OBJECT_TYPES = {
  'A': 'APPS',           // App install/uninstall/subscription changes
  'C': 'CUSTOMERS',      // Customer CRUD operations
  'CA': 'CASH_ADJUSTMENTS', // Cash log events
  'E': 'EMPLOYEES',      // Employee CRUD operations  
  'I': 'INVENTORY',      // Inventory item CRUD operations
  'IC': 'INVENTORY_CATEGORY', // Inventory category CRUD operations
  'IG': 'INVENTORY_MODIFIER_GROUP', // Inventory modifier group CRUD operations
  'IM': 'INVENTORY_MODIFIER', // Inventory modifier CRUD operations
  'O': 'ORDERS',         // Order CRUD operations
  'M': 'MERCHANTS',      // Merchant property changes
  'P': 'PAYMENTS',       // Payment create/update operations
  'SH': 'SERVICE_HOURS'  // Service hour CRUD operations
} as const;

export class WebhookService {
  /**
   * Verify Clover webhook signature
   */
  static verifyCloverSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const [timestamp, hash] = signature.split(',');
      const t = timestamp.split('=')[1];
      const v1 = hash.split('=')[1];
      
      const expectedHash = crypto
        .createHmac('sha256', secret)
        .update(t + '.' + payload)
        .digest('hex');
      
      return expectedHash === v1;
    } catch (error) {
      console.error('Error verifying Clover signature:', error);
      return false;
    }
  }

  /**
   * Parse object ID to get type and ID
   * Handles both single character (O, I, P) and multi-character (CA, IC, IG, IM, SH) prefixes
   */
  static parseObjectId(objectId: string): { objectType: string; id: string } {
    if (!objectId.includes(':')) {
      return { objectType: 'UNKNOWN', id: objectId };
    }

    const [typeCode, id] = objectId.split(':');
    
    // Check for multi-character codes first (CA, IC, IG, IM, SH)
    const multiCharCodes = ['CA', 'IC', 'IG', 'IM', 'SH'];
    if (multiCharCodes.includes(typeCode)) {
      const objectType = CLOVER_OBJECT_TYPES[typeCode as keyof typeof CLOVER_OBJECT_TYPES] || 'UNKNOWN';
      return { objectType, id: id || objectId };
    }
    
    // Single character codes (A, C, E, I, O, M, P)
    const objectType = CLOVER_OBJECT_TYPES[typeCode as keyof typeof CLOVER_OBJECT_TYPES] || 'UNKNOWN';
    return { objectType, id: id || objectId };
  }

  /**
   * Process new webhook payload structure
   */
  static async processCloverWebhook(payload: CloverWebhookPayload): Promise<void> {
    console.log('Processing Clover webhook:', JSON.stringify(payload, null, 2));

    for (const [merchantId, events] of Object.entries(payload.merchants)) {
      // Get restaurant by Clover merchant ID
      const restaurant = await storage.getRestaurantByCloverMerchantId(merchantId);
      if (!restaurant) {
        console.warn(`Restaurant not found for Clover merchant ID: ${merchantId}`);
        continue;
      }

      // Process each event for this merchant
      for (const event of events) {
        await this.processWebhookEvent(event, restaurant.id, merchantId, payload.appId);
      }
    }
  }

  /**
   * Process individual webhook event
   */
  static async processWebhookEvent(
    event: CloverWebhookEvent, 
    restaurantId: string, 
    merchantId: string,
    appId: string
  ): Promise<void> {
    try {
      const { objectType, id } = this.parseObjectId(event.objectId);
      
      // Log the webhook event
      await storage.createWebhookEvent({
        restaurantId,
        eventType: `${objectType}_${event.type}`,
        cloverObjectId: event.objectId,
        payload: { event, merchantId, appId } as any,
        processed: false,
      });

      console.log(`Processing webhook event: ${objectType}_${event.type} for restaurant ${restaurantId}`);
      
      // Process based on object type and event type
      switch (objectType) {
        case 'ORDERS':
          await this.handleOrderEvent(event, restaurantId, merchantId);
          break;
        case 'INVENTORY':
          await this.handleInventoryEvent(event, restaurantId, merchantId);
          break;
        case 'PAYMENTS':
          await this.handlePaymentEvent(event, restaurantId, merchantId);
          break;
        case 'CUSTOMERS':
          console.log(`Customer event ${event.type} for customer ${id} - logged for analysis`);
          break;
        case 'EMPLOYEES':
          console.log(`Employee event ${event.type} for employee ${id} - logged for analysis`);
          break;
        case 'APPS':
          console.log(`App event ${event.type} for app ${id} - logged for analysis`);
          break;
        case 'MERCHANTS':
          console.log(`Merchant event ${event.type} for merchant ${id} - logged for analysis`);
          break;
        case 'INVENTORY_CATEGORY':
        case 'INVENTORY_MODIFIER_GROUP':
        case 'INVENTORY_MODIFIER':
          console.log(`${objectType} event ${event.type} for ${id} - logged for analysis`);
          break;
        case 'CASH_ADJUSTMENTS':
        case 'SERVICE_HOURS':
          console.log(`${objectType} event ${event.type} for ${id} - logged for analysis`);
          break;
        default:
          console.log(`Unknown object type: ${objectType} for event: ${event.type}`);
          break;
      }
      
      // Mark event as processed
      const webhookEvents = await storage.getRecentWebhookEvents(restaurantId, 1);
      if (webhookEvents.length > 0) {
        await storage.markWebhookEventProcessed(webhookEvents[0].id);
      }
    } catch (error) {
      console.error('Error processing webhook event:', error);
      throw error;
    }
  }

  /**
   * Handle payment events
   */
  private static async handlePaymentEvent(event: CloverWebhookEvent, restaurantId: string, merchantId: string): Promise<void> {
    try {
      const { id: paymentId } = this.parseObjectId(event.objectId);
      
      if (event.type === 'CREATE') {
        await this.handlePaymentCreated(event, restaurantId, merchantId);
      } else {
        console.log(`Payment event ${event.type} for payment ${paymentId} - logged for analysis`);
      }
    } catch (error) {
      console.error('Error handling payment event:', error);
    }
  }

  /**
   * Handle inventory events  
   */
  private static async handleInventoryEvent(event: CloverWebhookEvent, restaurantId: string, merchantId: string): Promise<void> {
    try {
      const { id: itemId } = this.parseObjectId(event.objectId);
      
      if (event.type === 'UPDATE') {
        await this.handleInventoryUpdated(event, restaurantId, merchantId);
      } else {
        console.log(`Inventory event ${event.type} for item ${itemId} - logged for analysis`);
      }
    } catch (error) {
      console.error('Error handling inventory event:', error);
    }
  }

  /**
   * Handle payment created event
   */
  private static async handlePaymentCreated(event: CloverWebhookEvent, restaurantId: string, merchantId: string): Promise<void> {
    try {
      const { id: paymentId } = this.parseObjectId(event.objectId);
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) return;

      // Fetch payment details from Clover API
      const paymentDetails = await this.fetchCloverPaymentDetails(restaurant, paymentId);
      if (!paymentDetails) return;

      // Create sale record
      await storage.createSale({
        restaurantId,
        cloverOrderId: paymentDetails.order?.id || paymentId,
        cloverPaymentId: paymentId,
        amount: paymentDetails.amount || 0,
        tax: paymentDetails.taxAmount || 0,
        tip: paymentDetails.tipAmount || 0,
        total: paymentDetails.amount || 0,
        status: 'completed',
        saleDate: new Date(event.ts),
      });

      console.log(`Payment created: ${paymentId} for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error handling payment created:', error);
    }
  }

  /**
   * Handle order events (created/updated/paid)
   */
  private static async handleOrderEvent(event: CloverWebhookEvent, restaurantId: string, merchantId: string): Promise<void> {
    try {
      const { id: orderId } = this.parseObjectId(event.objectId);
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) return;

      console.log(`Processing order ${event.type}: ${orderId}`);

      // Only process inventory deduction for paid/updated orders to avoid duplicate processing
      if (event.type === 'UPDATE' || event.type === 'CREATE') {
        // Fetch order details from Clover API
        const orderDetails = await this.fetchCloverOrderDetails(restaurant, orderId);
        if (!orderDetails) return;

        // Process line items and update inventory/raw materials
        if (orderDetails.lineItems && orderDetails.lineItems.length > 0) {
          console.log(`Processing ${orderDetails.lineItems.length} line items for order ${orderId}`);
          
          for (const lineItem of orderDetails.lineItems) {
            await this.updateInventoryForLineItem(lineItem, restaurantId, orderId);
          }
          
          // Create sale record for paid orders
          if (orderDetails.state === 'paid') {
            const totalAmount = orderDetails.total || 0;
            await storage.createSale({
              restaurantId,
              cloverOrderId: orderId,
              cloverPaymentId: orderDetails.paymentId || '',
              amount: totalAmount,
              tax: orderDetails.tax || 0,
              tip: orderDetails.tip || 0,
              total: totalAmount,
              status: 'completed',
              saleDate: new Date(event.ts),
            });
          }
        }
      }

      console.log(`Order processed: ${orderId} for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error handling order event:', error);
    }
  }

  /**
   * Handle inventory updated event
   */
  private static async handleInventoryUpdated(event: CloverWebhookEvent, restaurantId: string, merchantId: string): Promise<void> {
    try {
      const { id: itemId } = this.parseObjectId(event.objectId);
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) return;

      // Fetch inventory item details from Clover API
      const itemDetails = await this.fetchCloverInventoryDetails(restaurant, itemId);
      if (!itemDetails) return;

      // Find or create inventory item in our system
      const inventoryItems = await storage.getRestaurantInventory(restaurantId);
      const existingItem = inventoryItems.find(item => item.cloverItemId === itemId);

      if (existingItem) {
        // Update existing item
        await storage.updateInventoryItem(existingItem.id, {
          name: itemDetails.name,
          currentStock: itemDetails.stockCount || 0,
          costPerUnit: itemDetails.price || 0,
        });
      } else {
        // Create new item
        await storage.createInventoryItem({
          restaurantId,
          name: itemDetails.name,
          sku: itemDetails.code || '',
          unit: 'pieces',
          currentStock: itemDetails.stockCount || 0,
          minLevel: 10, // Default minimum level
          costPerUnit: itemDetails.price || 0,
          cloverItemId: itemId,
          isActive: true,
        });
      }

      console.log(`Inventory updated: ${itemId} for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error handling inventory updated:', error);
    }
  }

  /**
   * Handle hosted checkout payment
   */
  private static async handleHostedCheckoutPayment(payload: CloverPaymentPayload, restaurantId: string): Promise<void> {
    try {
      if (payload.status === 'APPROVED') {
        // Extract amount from message (e.g., "Approved for 100")
        const amountMatch = payload.message.match(/Approved for (\d+)/);
        const amount = amountMatch ? parseInt(amountMatch[1]) : 0;

        await storage.createSale({
          restaurantId,
          cloverOrderId: payload.data, // checkout session ID
          cloverPaymentId: payload.id,
          amount,
          tax: 0,
          tip: 0,
          total: amount,
          status: 'completed',
          saleDate: new Date(payload.created_time),
        });
      }

      console.log(`Hosted checkout payment: ${payload.id} for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error handling hosted checkout payment:', error);
    }
  }

  /**
   * Update inventory for a line item - handles both direct inventory and recipe-based raw material deduction
   */
  private static async updateInventoryForLineItem(lineItem: any, restaurantId: string, orderId: string): Promise<void> {
    try {
      const itemId = lineItem.item?.id || lineItem.itemId;
      const itemName = lineItem.item?.name || lineItem.name;
      const quantity = lineItem.unitQty || lineItem.quantity || 1;
      
      if (!itemId && !itemName) return;
      
      // Try to find matching recipe first by name or Clover item ID
      const recipes = await storage.getRecipes(restaurantId);
      const matchingRecipe = recipes.find(recipe => 
        recipe.cloverItemId === itemId || 
        (itemName && recipe.name.toLowerCase().includes(itemName.toLowerCase())) ||
        (itemName && itemName.toLowerCase().includes(recipe.name.toLowerCase()))
      );

      if (matchingRecipe) {
        // Recipe found - deduct raw materials based on recipe ingredients
        await this.deductRawMaterialsFromRecipe(matchingRecipe.id, quantity, restaurantId, orderId);
        console.log(`Processed recipe-based sale: ${matchingRecipe.name} x${quantity}`);
      } else {
        // No recipe found - try direct inventory deduction
        await this.deductDirectInventory(lineItem, quantity, restaurantId, orderId);
      }
    } catch (error) {
      console.error('Error updating inventory for line item:', error);
    }
  }

  /**
   * Deduct raw materials based on recipe ingredients
   */
  private static async deductRawMaterialsFromRecipe(recipeId: string, quantity: number, restaurantId: string, orderId: string): Promise<void> {
    try {
      // Get recipe ingredients
      const ingredients = await storage.getRecipeIngredients(recipeId);
      
      for (const ingredient of ingredients) {
        const rawMaterial = ingredient.rawMaterial;
        if (!rawMaterial) continue;

        // Calculate total quantity needed (ingredient quantity * number of servings sold)
        const totalQuantityNeeded = Number(ingredient.quantity) * quantity;
        
        // Convert units if necessary (using the existing conversion system)
        let quantityToDeduct = totalQuantityNeeded;
        if (ingredient.unit !== rawMaterial.unit) {
          try {
            quantityToDeduct = await storage.convertUnit(totalQuantityNeeded, ingredient.unit, rawMaterial.unit);
          } catch (error) {
            console.warn(`Could not convert ${ingredient.unit} to ${rawMaterial.unit}, using original quantity`);
          }
        }

        // Update raw material stock
        const previousStock = Number(rawMaterial.currentStock);
        const newStock = Math.max(0, previousStock - quantityToDeduct);
        await storage.updateRawMaterial(rawMaterial.id, {
          currentStock: newStock,
        });

        // Create stock movement record
        await storage.createStockMovement({
          inventoryItemId: rawMaterial.id,
          movementType: 'recipe_sale',
          quantity: -quantityToDeduct,
          previousStock: previousStock.toString(),
          newStock: newStock.toString(),
          reason: `Recipe sale - Order ${orderId}`,
          cloverOrderId: orderId,
        });

        console.log(`Deducted raw material ${rawMaterial.name}: ${quantityToDeduct}${rawMaterial.unit} (${previousStock} -> ${newStock})`);
      }
    } catch (error) {
      console.error('Error deducting raw materials from recipe:', error);
    }
  }

  /**
   * Deduct direct inventory (fallback when no recipe is found)
   */
  private static async deductDirectInventory(lineItem: any, quantity: number, restaurantId: string, orderId: string): Promise<void> {
    try {
      const itemId = lineItem.item?.id || lineItem.itemId;
      if (!itemId) return;

      // Find inventory item by Clover item ID
      const inventoryItems = await storage.getRestaurantInventory(restaurantId);
      const inventoryItem = inventoryItems.find(item => item.cloverItemId === itemId);
      
      if (!inventoryItem) {
        console.log(`No inventory item or recipe found for: ${lineItem.item?.name || lineItem.name} (Clover ID: ${itemId})`);
        return;
      }

      const previousStock = Number(inventoryItem.currentStock);
      const newStock = Math.max(0, previousStock - quantity);

      // Update inventory stock
      await storage.updateInventoryItem(inventoryItem.id, {
        currentStock: newStock.toString(),
      });

      // Create stock movement record
      await storage.createStockMovement({
        inventoryItemId: inventoryItem.id,
        movementType: 'sale',
        quantity: -quantity,
        previousStock: previousStock.toString(),
        newStock: newStock.toString(),
        reason: `Direct sale - Order ${orderId}`,
        cloverOrderId: orderId,
      });

      console.log(`Updated direct inventory for ${inventoryItem.name}: ${previousStock} -> ${newStock}`);
    } catch (error) {
      console.error('Error updating direct inventory:', error);
    }
  }

  /**
   * Fetch payment details from Clover API
   */
  private static async fetchCloverPaymentDetails(restaurant: Restaurant, paymentId: string): Promise<any> {
    try {
      // In a real implementation, you would use the Clover API to fetch payment details
      // This requires proper API credentials and access tokens
      // For now, return mock data structure
      return {
        id: paymentId,
        amount: Math.floor(Math.random() * 5000), // Mock amount in cents
        taxAmount: Math.floor(Math.random() * 500),
        tipAmount: Math.floor(Math.random() * 1000),
        order: {
          id: `order_${Date.now()}`,
        },
      };
    } catch (error) {
      console.error('Error fetching Clover payment details:', error);
      return null;
    }
  }

  /**
   * Fetch order details from Clover API
   */
  private static async fetchCloverOrderDetails(restaurant: Restaurant, orderId: string): Promise<any> {
    try {
      // In a real implementation, you would use the Clover API to fetch order details
      // This requires proper API credentials and access tokens
      // For now, return mock data structure
      return {
        id: orderId,
        lineItems: [
          {
            item: {
              id: `item_${Date.now()}`,
              name: 'Sample Item',
            },
            unitQty: Math.floor(Math.random() * 3) + 1,
          },
        ],
      };
    } catch (error) {
      console.error('Error fetching Clover order details:', error);
      return null;
    }
  }

  /**
   * Fetch inventory details from Clover API
   */
  private static async fetchCloverInventoryDetails(restaurant: Restaurant, itemId: string): Promise<any> {
    try {
      // In a real implementation, you would use the Clover API to fetch inventory details
      // This requires proper API credentials and access tokens
      // For now, return mock data structure
      return {
        id: itemId,
        name: `Item ${itemId.slice(-6)}`,
        code: `SKU_${itemId.slice(-4)}`,
        stockCount: Math.floor(Math.random() * 100),
        price: Math.floor(Math.random() * 2000), // Price in cents
      };
    } catch (error) {
      console.error('Error fetching Clover inventory details:', error);
      return null;
    }
  }
}
