import crypto from "crypto";
import { storage } from "./storage";
import { CloverService } from "./cloverService";
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
      console.log(`Processing order ${event.type}: ${orderId} for merchant ${merchantId}`);

      // Process inventory deduction for CREATE events (when order is placed)
      if (event.type === 'CREATE') {
        await this.processOrderInventoryDeduction(orderId, merchantId, restaurantId);
      }

      // For UPDATE events, check if order state changed to paid and create sale record
      if (event.type === 'UPDATE') {
        await this.processOrderUpdate(orderId, merchantId, restaurantId, event.ts);
      }

      console.log(`Order processed: ${orderId} for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error handling order event:', error);
    }
  }

  /**
   * Process order inventory deduction based on line items and recipes
   */
  private static async processOrderInventoryDeduction(orderId: string, merchantId: string, restaurantId: string): Promise<void> {
    try {
      // Fetch order line items from Clover API
      const lineItems = await CloverService.fetchOrderLineItems(merchantId, orderId);
      if (!lineItems || lineItems.length === 0) {
        console.log(`No line items found for order ${orderId}`);
        return;
      }

      console.log(`Processing ${lineItems.length} line items for order ${orderId}`);

      // Process each line item
      for (const lineItem of lineItems) {
        if (!lineItem.isRevenue || lineItem.refunded || lineItem.exchanged) {
          console.log(`Skipping non-revenue or refunded line item ${lineItem.id}`);
          continue;
        }

        await this.processLineItemInventoryDeduction(lineItem, restaurantId, orderId);
      }
    } catch (error) {
      console.error(`Error processing inventory deduction for order ${orderId}:`, error);
    }
  }

  /**
   * Process individual line item inventory deduction
   */
  private static async processLineItemInventoryDeduction(lineItem: any, restaurantId: string, orderId: string): Promise<void> {
    try {
      const cloverItemId = lineItem.item.id;
      const itemName = lineItem.item.name || lineItem.name;
      const quantity = lineItem.unitQty || 1;

      console.log(`Processing line item: ${itemName} (${cloverItemId}) x${quantity}`);

      // Find menu item in our database by Clover item ID
      const menuItem = await storage.getMenuItemByCloverItemId(cloverItemId);
      if (!menuItem) {
        console.log(`Menu item with Clover ID ${cloverItemId} not found in database, skipping inventory deduction`);
        return;
      }

      // Find recipe for this menu item
      const recipe = await storage.getRecipeByMenuItemId(menuItem.id);
      if (!recipe) {
        console.log(`No recipe found for menu item ${menuItem.name}, skipping raw material deduction`);
        return;
      }

      // Get recipe ingredients
      const ingredients = await storage.getRecipeIngredients(recipe.id);
      if (!ingredients || ingredients.length === 0) {
        console.log(`No ingredients found for recipe ${recipe.name}`);
        return;
      }

      console.log(`Found recipe "${recipe.name}" with ${ingredients.length} ingredients for menu item "${menuItem.name}"`);

      // Deduct raw materials based on recipe ingredients
      for (const ingredient of ingredients) {
        const deductionAmount = parseFloat(ingredient.quantity.toString()) * quantity;
        
        // Get current stock of raw material
        const rawMaterial = await storage.getRawMaterial(ingredient.rawMaterialId);
        if (!rawMaterial) {
          console.warn(`Raw material ${ingredient.rawMaterialId} not found`);
          continue;
        }

        // Convert units if necessary
        let convertedAmount = deductionAmount;
        const ingredientUnit = ingredient.unit;
        const rawMaterialUnit = rawMaterial.baseUnit;
        
        if (ingredientUnit && rawMaterialUnit && ingredientUnit !== rawMaterialUnit) {
          try {
            convertedAmount = await this.convertUnits(deductionAmount, ingredientUnit, rawMaterialUnit);
            console.log(`Converted ${deductionAmount} ${ingredientUnit} to ${convertedAmount} ${rawMaterialUnit}`);
          } catch (error) {
            console.log(`Unit conversion failed from ${ingredientUnit} to ${rawMaterialUnit}, using original value:`, error);
            convertedAmount = deductionAmount; // Fallback to original amount
          }
        }

        // Calculate current and new stock
        const currentStock = parseFloat(rawMaterial.currentStock.toString());
        const newStock = Math.max(0, currentStock - convertedAmount);
        
        // Update raw material stock
        await storage.updateRawMaterial(rawMaterial.id, {
          currentStock: newStock.toString()
        });

        // Create raw material movement record for audit trail 
        await storage.createRawMaterialMovement({
          restaurantId,
          rawMaterialId: rawMaterial.id,
          movementType: 'sale',
          quantity: convertedAmount,
          previousStock: currentStock,
          newStock: newStock,
          reason: `Order ${orderId} - ${itemName} x${quantity}`,
          cloverOrderId: orderId,
        });

        console.log(`Deducted ${convertedAmount} ${rawMaterialUnit} of "${rawMaterial.name}" (${currentStock} → ${newStock})`);
      }
    } catch (error) {
      console.error(`Error processing line item inventory deduction:`, error);
    }
  }

  /**
   * Process order update (e.g., when order state changes to paid)
   */
  private static async processOrderUpdate(orderId: string, merchantId: string, restaurantId: string, timestamp: number): Promise<void> {
    try {
      // Fetch order details to check if it's paid
      const orderDetails = await CloverService.fetchOrderDetails(merchantId, orderId);
      if (!orderDetails) return;

      // Create sale record if order is paid
      if (orderDetails.state === 'paid') {
        const totalAmount = orderDetails.total || 0;
        
        // Check if sale record already exists
        const existingSales = await storage.getRestaurantSales(restaurantId);
        const existingSale = existingSales.find(sale => sale.cloverOrderId === orderId);
        
        if (!existingSale) {
          await storage.createSale({
            restaurantId,
            cloverOrderId: orderId,
            cloverPaymentId: '', // Will be updated when payment webhook arrives
            amount: totalAmount.toString(),
            tax: "0", // Clover API doesn't provide tax breakdown in order details
            tip: "0", // Clover API doesn't provide tip breakdown in order details
            total: totalAmount.toString(),
            status: 'completed',
            saleDate: new Date(timestamp),
          });

          console.log(`Created sale record for paid order ${orderId}: $${(totalAmount/100).toFixed(2)}`);
        }
      }
    } catch (error) {
      console.error(`Error processing order update for ${orderId}:`, error);
    }
  }

  /**
   * Convert units between different measurement systems
   */
  private static async convertUnits(value: number, fromUnit: string, toUnit: string): Promise<number> {
    try {
      // If units are the same, no conversion needed
      if (fromUnit === toUnit) {
        return value;
      }

      // Use the unit conversion from storage
      return await storage.convertUnit(value, fromUnit, toUnit);
    } catch (error) {
      console.warn(`Unit conversion failed from ${fromUnit} to ${toUnit}, using original value:`, error);
      return value;
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
          currentStock: (itemDetails.stockCount || 0).toString(),
          costPerUnit: (itemDetails.price || 0).toString(),
        });
      } else {
        // Create new item
        await storage.createInventoryItem({
          restaurantId,
          name: itemDetails.name,
          sku: itemDetails.code || '',
          unit: 'pieces',
          currentStock: (itemDetails.stockCount || 0).toString(),
          minLevel: "10", // Default minimum level
          costPerUnit: (itemDetails.price || 0).toString(),
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
          amount: amount.toString(),
          tax: "0",
          tip: "0",
          total: amount.toString(),
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
   * Fetch payment details from Clover API
   */
  private static async fetchCloverPaymentDetails(restaurant: any, paymentId: string): Promise<any> {
    try {
      const apiBase = process.env.NODE_ENV === "production" 
        ? "https://api.clover.com" 
        : "https://apisandbox.dev.clover.com";
      
      const response = await fetch(
        `${apiBase}/v3/merchants/${restaurant.cloverMerchantId}/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${restaurant.cloverAccessToken}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch payment ${paymentId}: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching payment ${paymentId}:`, error);
      return null;
    }
  }

  /**
   * Fetch inventory details from Clover API
   */
  private static async fetchCloverInventoryDetails(restaurant: any, itemId: string): Promise<any> {
    try {
      const apiBase = process.env.NODE_ENV === "production" 
        ? "https://api.clover.com" 
        : "https://apisandbox.dev.clover.com";
      
      const response = await fetch(
        `${apiBase}/v3/merchants/${restaurant.cloverMerchantId}/items/${itemId}`,
        {
          headers: {
            Authorization: `Bearer ${restaurant.cloverAccessToken}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch inventory item ${itemId}: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching inventory item ${itemId}:`, error);
      return null;
    }
  }

  /**
   * Process individual webhook event (simplified version)
   */
  private static async processEvent(event: CloverWebhookEvent, restaurantId: string, merchantId: string): Promise<void> {
    try {
      const { objectType, id } = this.parseObjectId(event.objectId);
      
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
        default:
          console.log(`${objectType} event ${event.type} for ${id} - logged for analysis`);
          break;
      }
    } catch (error) {
      console.error('Error processing webhook event:', error);
    }
  }

  /**
   * Handle multi-merchant webhook payload format
   */
  private static async handleMultiMerchantWebhook(payload: CloverWebhookPayload): Promise<void> {
    for (const [merchantId, events] of Object.entries(payload.merchants)) {
      const restaurant = await storage.getRestaurantByCloverMerchantId(merchantId);
      if (!restaurant) {
        console.warn(`Restaurant not found for merchant ${merchantId}`);
        continue;
      }

      for (const event of events) {
        await this.processEvent(event, restaurant.id, merchantId);
      }
    }
  }

  /**
   * Handle legacy single merchant webhook payload format
   */
  private static async handleLegacyWebhook(payload: LegacyCloverWebhookPayload): Promise<void> {
    const restaurant = await storage.getRestaurantByCloverMerchantId(payload.merchantId);
    if (!restaurant) {
      console.warn(`Restaurant not found for merchant ${payload.merchantId}`);
      return;
    }

    const event: CloverWebhookEvent = {
      objectId: payload.objectId,
      type: payload.type,
      ts: payload.ts,
    };

    await this.processEvent(event, restaurant.id, payload.merchantId);
  }

  /**
   * Main webhook processing entry point
   */
  static async processWebhook(payload: any, headers: any): Promise<void> {
    try {
      console.log('=== CLOVER WEBHOOK RECEIVED ===');
      console.log('Payload:', JSON.stringify(payload, null, 2));
      
      // Handle different webhook payload formats
      if (payload.merchants && typeof payload.merchants === 'object') {
        // New webhook format with multiple merchants
        await this.handleMultiMerchantWebhook(payload as CloverWebhookPayload);
      } else if (payload.merchantId) {
        // Legacy single merchant format
        await this.handleLegacyWebhook(payload as LegacyCloverWebhookPayload);
      } else if (payload.merchant_id && payload.type === 'HOSTED_CHECKOUT') {
        // Hosted checkout payment format
        await this.handleHostedCheckoutPayment(payload as CloverPaymentPayload, '');
      } else {
        console.warn('Unknown webhook payload format:', payload);
      }
      
      console.log('=== WEBHOOK PROCESSING COMPLETED ===');
    } catch (error) {
      console.error('Error in webhook processing:', error);
      throw error;
    }
  }
}
