import { eq, lt, and, isNull, or } from "drizzle-orm";
import { db } from "./db";
import { rawMaterials, restaurants } from "@shared/schema";

// Mailchimp setup for email alerts
let mailchimpClient: any = null;

if (!process.env.MAILCHIMP_API_KEY) {
  console.warn("MAILCHIMP_API_KEY not set - email alerts disabled");
} else {
  const mailchimp = require('@mailchimp/mailchimp_transactional');
  mailchimpClient = mailchimp(process.env.MAILCHIMP_API_KEY);
  console.log("Mailchimp transactional client initialized");
}

interface LowStockItem {
  id: string;
  name: string;
  currentStock: string;
  minLevel: string;
  baseUnit: string;
  isHighPriority: boolean | null;
}

interface Restaurant {
  id: string;
  name: string;
  alertEmail: string | null;
  enableEmailAlerts: boolean | null;
}

/**
 * Check for low stock items and send immediate alerts for high priority items
 */
export async function checkLowStockAndAlert(restaurantId: string): Promise<void> {
  try {
    // Get restaurant alert settings
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId));

    if (!restaurant) {
      console.error(`Restaurant ${restaurantId} not found`);
      return;
    }

    // Find low stock items
    const lowStockItems = await db
      .select({
        id: rawMaterials.id,
        name: rawMaterials.name,
        currentStock: rawMaterials.currentStock,
        minLevel: rawMaterials.minLevel,
        baseUnit: rawMaterials.baseUnit,
        isHighPriority: rawMaterials.isHighPriority,
        lastAlertSent: rawMaterials.lastAlertSent,
      })
      .from(rawMaterials)
      .where(
        and(
          eq(rawMaterials.restaurantId, restaurantId),
          eq(rawMaterials.isActive, true),
          lt(rawMaterials.currentStock, rawMaterials.minLevel)
        )
      );

    if (lowStockItems.length === 0) {
      console.log(`No low stock items found for restaurant ${restaurant.name}`);
      return;
    }

    console.log(`Found ${lowStockItems.length} low stock items for ${restaurant.name}`);

    // Separate high priority items that need immediate alerts
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const highPriorityItems = lowStockItems.filter(item => 
      item.isHighPriority === true && 
      (!item.lastAlertSent || new Date(item.lastAlertSent) < oneDayAgo)
    );

    // Send immediate alerts for high priority items (email only)
    if (highPriorityItems.length > 0 && restaurant.enableEmailAlerts) {
      await sendImmediateAlert(restaurant, highPriorityItems);
      
      // Update last alert sent timestamp
      for (const item of highPriorityItems) {
        await db
          .update(rawMaterials)
          .set({ lastAlertSent: now })
          .where(eq(rawMaterials.id, item.id));
      }
    }

  } catch (error) {
    console.error("Error checking low stock:", error);
  }
}

/**
 * Send daily summary of all low stock items
 */
export async function sendDailySummary(): Promise<void> {
  try {
    console.log("Starting daily low stock summary...");

    const restaurantsWithAlerts = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        alertEmail: restaurants.alertEmail,
        enableEmailAlerts: restaurants.enableEmailAlerts,
      })
      .from(restaurants)
      .where(
        and(
          eq(restaurants.isActive, true),
          eq(restaurants.enableEmailAlerts, true)
        )
      );

    for (const restaurant of restaurantsWithAlerts) {
      const lowStockItems = await db
        .select({
          id: rawMaterials.id,
          name: rawMaterials.name,
          currentStock: rawMaterials.currentStock,
          minLevel: rawMaterials.minLevel,
          baseUnit: rawMaterials.baseUnit,
          isHighPriority: rawMaterials.isHighPriority,
        })
        .from(rawMaterials)
        .where(
          and(
            eq(rawMaterials.restaurantId, restaurant.id),
            eq(rawMaterials.isActive, true),
            lt(rawMaterials.currentStock, rawMaterials.minLevel)
          )
        );

      if (lowStockItems.length > 0) {
        await sendDailySummaryAlert(restaurant, lowStockItems);
      }
    }

    console.log("Daily summary completed");
  } catch (error) {
    console.error("Error sending daily summary:", error);
  }
}

/**
 * Send immediate alert for high priority low stock items
 */
async function sendImmediateAlert(restaurant: Restaurant, items: LowStockItem[]): Promise<void> {
  const subject = `🚨 URGENT: Low Stock Alert - ${restaurant.name}`;
  const message = `Critical inventory items are running low at ${restaurant.name}:\n\n${formatItemsList(items, true)}`;

  if (restaurant.enableEmailAlerts === true && restaurant.alertEmail) {
    await sendEmailAlert(restaurant.alertEmail, subject, message);
  }

  // SMS alerts removed - now email-only
}

/**
 * Send daily summary alert
 */
async function sendDailySummaryAlert(restaurant: Restaurant, items: LowStockItem[]): Promise<void> {
  const subject = `📊 Daily Inventory Report - ${restaurant.name}`;
  const message = `Daily low stock summary for ${restaurant.name}:\n\n${formatItemsList(items, false)}`;

  if (restaurant.enableEmailAlerts === true && restaurant.alertEmail) {
    await sendEmailAlert(restaurant.alertEmail, subject, message);
  }

  // SMS alerts removed - now email-only
}

/**
 * Format items list for alert messages
 */
function formatItemsList(items: LowStockItem[], highlightPriority: boolean): string {
  return items
    .sort((a, b) => {
      // Sort by priority first, then by name
      if (highlightPriority && a.isHighPriority !== b.isHighPriority) {
        return a.isHighPriority === true ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    })
    .map(item => {
      const priorityFlag = highlightPriority && item.isHighPriority === true ? "⚠️ " : "";
      const currentStock = parseFloat(item.currentStock).toFixed(2);
      const minLevel = parseFloat(item.minLevel).toFixed(2);
      
      return `${priorityFlag}${item.name}:\n  Current: ${currentStock} ${item.baseUnit}\n  Minimum: ${minLevel} ${item.baseUnit}`;
    })
    .join('\n\n');
}

/**
 * Send email alert using Mailchimp Transactional
 */
async function sendEmailAlert(email: string, subject: string, message: string): Promise<void> {
  try {
    if (!mailchimpClient) {
      console.warn("Mailchimp not configured - skipping email alert");
      return;
    }

    const emailData = {
      message: {
        from_email: 'alerts@myrestaurantinventory.app',
        from_name: 'MyRestaurantInventory Alerts',
        to: [
          {
            email: email,
            type: 'to'
          }
        ],
        subject: subject,
        text: message,
        html: message.replace(/\n/g, '<br>')
      }
    };

    await mailchimpClient.messages.send(emailData);
    console.log(`Email alert sent to ${email} via Mailchimp`);
  } catch (error) {
    console.error("Error sending email alert via Mailchimp:", error);
  }
}

// SMS functionality removed - Twilio dependency eliminated

/**
 * Test email alert functionality
 */
export async function testAlert(restaurantId: string): Promise<boolean> {
  try {
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId));

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const testMessage = `Test alert from MyRestaurantInventory for ${restaurant.name}. Alert system is working correctly.`;

    if (restaurant.alertEmail) {
      await sendEmailAlert(restaurant.alertEmail, "Test Alert - MyRestaurantInventory", testMessage);
      return true;
    } else {
      throw new Error("No email address configured for alerts");
    }
  } catch (error) {
    console.error("Error testing alert:", error);
    return false;
  }
}