import { storage } from './storage';

interface CloverItem {
  id: string;
  hidden: boolean;
  available: boolean;
  autoManage: boolean;
  name: string;
  sku?: string;
  price: number;
  priceType: string;
  defaultTaxRates: boolean;
  cost?: number;
  isRevenue: boolean;
  modifiedTime: number;
  deleted: boolean;
}

interface CloverItemsResponse {
  elements: CloverItem[];
  href: string;
}

interface CloverOrderLineItem {
  id: string;
  orderRef: {
    id: string;
  };
  item: {
    id: string;
    name: string;
  };
  name: string;
  unitQty: number;
  price: number;
  printed: boolean;
  exchanged: boolean;
  refunded: boolean;
  isRevenue: boolean;
}

interface CloverOrderLineItemsResponse {
  elements: CloverOrderLineItem[];
  href: string;
}

interface CloverOrder {
  id: string;
  currency: string;
  employee: {
    id: string;
  };
  total: number;
  taxRemoved: boolean;
  isVat: boolean;
  state: string;
  manualTransaction: boolean;
  groupLineItems: boolean;
  testMode: boolean;
  createdTime: number;
  clientCreatedTime: number;
  modifiedTime: number;
}

export class CloverService {
  private static baseUrl = process.env.CLOVER_API_BASE;
  private static apiKey = process.env.CLOVER_API_KEY;

  /**
   * Fetch items from Clover API for a specific merchant
   */
  static async fetchMerchantItems(merchantId: string): Promise<CloverItem[]> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Clover API credentials not configured');
    }

    const url = `${this.baseUrl}/merchants/${merchantId}/items`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Clover API error: ${response.status} ${response.statusText}`);
      }

      const data: CloverItemsResponse = await response.json();
      return data.elements || [];
    } catch (error) {
      console.error('Error fetching items from Clover:', error);
      throw error;
    }
  }

  /**
   * Sync menu items from Clover to database
   */
  static async syncMenuItems(restaurantId: string, merchantId: string): Promise<void> {
    try {
      console.log(`Syncing menu items for restaurant ${restaurantId} from Clover merchant ${merchantId}`);
      
      const cloverItems = await this.fetchMerchantItems(merchantId);
      console.log(`Fetched ${cloverItems.length} items from Clover`);

      // Filter out hidden, deleted, or unavailable items
      const activeItems = cloverItems.filter(item => 
        !item.hidden && 
        !item.deleted && 
        item.available && 
        item.isRevenue
      );

      console.log(`${activeItems.length} active items to sync`);

      // Convert Clover items to our menu item format
      const menuItems = activeItems.map(item => ({
        restaurantId,
        cloverItemId: item.id,
        name: item.name,
        description: '', // Clover API doesn't provide description in this endpoint
        category: this.categorizeItem(item.name, item.sku),
        price: (item.price / 100).toFixed(2), // Convert cents to dollars
        sku: item.sku || item.id,
        isActive: true,
        hasRecipe: false,
        syncedAt: new Date(),
      }));

      // Use the existing syncMenuItemsFromClover method
      await storage.syncMenuItemsFromClover(restaurantId, menuItems);
      
      console.log(`Successfully synced ${menuItems.length} menu items`);
    } catch (error) {
      console.error('Error syncing menu items:', error);
      throw error;
    }
  }

  /**
   * Categorize item based on name and SKU
   */
  private static categorizeItem(name: string, sku?: string): string {
    const nameUpper = name.toUpperCase();
    const skuUpper = sku?.toUpperCase() || '';
    
    if (nameUpper.includes('PIZZA') || skuUpper.includes('PIZ')) {
      return 'Pizza';
    }
    if (nameUpper.includes('COFFEE') || nameUpper.includes('ESPRESSO') || skuUpper.includes('CFE')) {
      return 'Beverage';
    }
    if (nameUpper.includes('SALAD') || skuUpper.includes('SAL')) {
      return 'Salad';
    }
    if (nameUpper.includes('BURGER') || nameUpper.includes('SANDWICH')) {
      return 'Main Course';
    }
    if (nameUpper.includes('DESSERT') || nameUpper.includes('CAKE') || nameUpper.includes('ICE CREAM')) {
      return 'Dessert';
    }
    if (nameUpper.includes('APPETIZER') || nameUpper.includes('STARTER')) {
      return 'Appetizer';
    }
    if (nameUpper.includes('SIDE') || nameUpper.includes('FRIES')) {
      return 'Side Dish';
    }
    
    return 'Other';
  }

  /**
   * Fetch order details from Clover API
   */
  static async fetchOrderDetails(merchantId: string, orderId: string): Promise<CloverOrder | null> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Clover API credentials not configured');
    }

    const url = `${this.baseUrl}/merchants/${merchantId}/orders/${orderId}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Order ${orderId} not found in Clover`);
          return null;
        }
        throw new Error(`Clover API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching order details from Clover:', error);
      throw error;
    }
  }

  /**
   * Fetch order line items from Clover API
   */
  static async fetchOrderLineItems(merchantId: string, orderId: string): Promise<CloverOrderLineItem[]> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Clover API credentials not configured');
    }

    const url = `${this.baseUrl}/merchants/${merchantId}/orders/${orderId}/line_items`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Order line items for ${orderId} not found in Clover`);
          return [];
        }
        throw new Error(`Clover API error: ${response.status} ${response.statusText}`);
      }

      const data: CloverOrderLineItemsResponse = await response.json();
      return data.elements || [];
    } catch (error) {
      console.error('Error fetching order line items from Clover:', error);
      throw error;
    }
  }

  /**
   * Test Clover API connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      if (!this.baseUrl || !this.apiKey) {
        console.log('Missing Clover credentials:', { 
          hasBaseUrl: !!this.baseUrl, 
          hasApiKey: !!this.apiKey,
          baseUrl: this.baseUrl,
          apiKeyLength: this.apiKey?.length 
        });
        return false;
      }

      // Test with the known working merchant ID
      const testUrl = `${this.baseUrl}/merchants/QTQG5J1TGM7Z1/items?limit=1`;
      console.log('Testing Clover API with URL:', testUrl);
      console.log('Using API key length:', this.apiKey.length);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Clover API test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Clover API test successful, items found:', data.elements?.length || 0);
        return true;
      } else {
        const errorText = await response.text();
        console.log('Clover API test failed:', response.status, response.statusText, errorText);
        return false;
      }
    } catch (error) {
      console.error('Clover API connection test failed:', error);
      return false;
    }
  }
}