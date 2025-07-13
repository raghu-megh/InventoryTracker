import crypto from "crypto";
import { storage } from "./storage";
import type { Restaurant, InventoryItem, InsertStockMovement, InsertSale } from "@shared/schema";

interface CloverWebhookPayload {
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
   * Process webhook event from Clover
   */
  static async processWebhookEvent(payload: CloverWebhookPayload | CloverPaymentPayload, restaurantId: string): Promise<void> {
    try {
      // Log the webhook event
      await storage.createWebhookEvent({
        restaurantId,
        eventType: payload.type,
        cloverObjectId: 'objectId' in payload ? payload.objectId : payload.id,
        payload: payload as any,
        processed: false,
      });

      // Process based on event type
      if ('type' in payload) {
        switch (payload.type) {
          case 'PAYMENT_CREATED':
            await this.handlePaymentCreated(payload, restaurantId);
            break;
          case 'ORDER_UPDATED':
          case 'ORDER_CREATED':
            await this.handleOrderEvent(payload, restaurantId);
            break;
          case 'INVENTORY_UPDATED':
            await this.handleInventoryUpdated(payload, restaurantId);
            break;
          case 'PAYMENT':
            await this.handleHostedCheckoutPayment(payload as CloverPaymentPayload, restaurantId);
            break;
          default:
            console.log(`Unhandled webhook event type: ${payload.type}`);
        }
      }
    } catch (error) {
      console.error('Error processing webhook event:', error);
      throw error;
    }
  }

  /**
   * Handle payment created event
   */
  private static async handlePaymentCreated(payload: CloverWebhookPayload, restaurantId: string): Promise<void> {
    try {
      // In a real implementation, you would fetch the payment details from Clover API
      // For now, we'll create a basic sale record
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) return;

      // Fetch payment details from Clover API
      const paymentDetails = await this.fetchCloverPaymentDetails(restaurant, payload.objectId);
      if (!paymentDetails) return;

      // Create sale record
      await storage.createSale({
        restaurantId,
        cloverOrderId: paymentDetails.order?.id || payload.objectId,
        cloverPaymentId: payload.objectId,
        amount: paymentDetails.amount || 0,
        tax: paymentDetails.taxAmount || 0,
        tip: paymentDetails.tipAmount || 0,
        total: paymentDetails.amount || 0,
        status: 'completed',
        saleDate: new Date(payload.ts),
      });

      console.log(`Payment created: ${payload.objectId} for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error handling payment created:', error);
    }
  }

  /**
   * Handle order events (created/updated)
   */
  private static async handleOrderEvent(payload: CloverWebhookPayload, restaurantId: string): Promise<void> {
    try {
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) return;

      // Fetch order details from Clover API
      const orderDetails = await this.fetchCloverOrderDetails(restaurant, payload.objectId);
      if (!orderDetails) return;

      // Process line items and update inventory
      if (orderDetails.lineItems) {
        for (const lineItem of orderDetails.lineItems) {
          await this.updateInventoryForLineItem(lineItem, restaurantId, payload.objectId);
        }
      }

      console.log(`Order processed: ${payload.objectId} for restaurant ${restaurantId}`);
    } catch (error) {
      console.error('Error handling order event:', error);
    }
  }

  /**
   * Handle inventory updated event
   */
  private static async handleInventoryUpdated(payload: CloverWebhookPayload, restaurantId: string): Promise<void> {
    try {
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) return;

      // Fetch inventory item details from Clover API
      const itemDetails = await this.fetchCloverInventoryDetails(restaurant, payload.objectId);
      if (!itemDetails) return;

      // Find or create inventory item in our system
      const inventoryItems = await storage.getRestaurantInventory(restaurantId);
      const existingItem = inventoryItems.find(item => item.cloverItemId === payload.objectId);

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
          cloverItemId: payload.objectId,
          isActive: true,
        });
      }

      console.log(`Inventory updated: ${payload.objectId} for restaurant ${restaurantId}`);
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
   * Update inventory for a line item
   */
  private static async updateInventoryForLineItem(lineItem: any, restaurantId: string, orderId: string): Promise<void> {
    try {
      if (!lineItem.item?.id) return;

      const inventoryItems = await storage.getRestaurantInventory(restaurantId);
      const inventoryItem = inventoryItems.find(item => item.cloverItemId === lineItem.item.id);

      if (inventoryItem) {
        const quantitySold = lineItem.unitQty || 1;
        const previousStock = Number(inventoryItem.currentStock);
        const newStock = Math.max(0, previousStock - quantitySold);

        // Update inventory
        await storage.updateInventoryItem(inventoryItem.id, {
          currentStock: newStock.toString(),
        });

        // Record stock movement
        await storage.createStockMovement({
          inventoryItemId: inventoryItem.id,
          movementType: 'sale',
          quantity: -quantitySold,
          previousStock: previousStock.toString(),
          newStock: newStock.toString(),
          reason: 'POS Sale',
          cloverOrderId: orderId,
        });
      }
    } catch (error) {
      console.error('Error updating inventory for line item:', error);
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
