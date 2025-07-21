import { eq, lt, and, isNull, or } from "drizzle-orm";
import { db } from "./db";
import { rawMaterials, restaurants } from "@shared/schema";

// Twilio client (will be initialized when TWILIO credentials are provided)
let twilioClient: any = null;

// Mailchimp setup
let mailchimpClient: any = null;

if (!process.env.MAILCHIMP_API_KEY) {
  console.warn("MAILCHIMP_API_KEY not set - email alerts disabled");
} else {
  const mailchimp = require('@mailchimp/mailchimp_transactional');
  mailchimpClient = mailchimp(process.env.MAILCHIMP_API_KEY);
  console.log("Mailchimp transactional client initialized");
}

// Initialize Twilio when credentials are available
function initializeTwilio() {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && !twilioClient) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log("Twilio SMS client initialized");
  }
}

interface LowStockItem {
  id: string;
  name: string;
  currentStock: string;
  minLevel: string;
  baseUnit: string;
  isHighPriority: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  alertEmail: string | null;
  alertPhone: string | null;
  enableEmailAlerts: boolean | null;
  enableSmsAlerts: boolean | null;
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
      item.isHighPriority && 
      (!item.lastAlertSent || new Date(item.lastAlertSent) < oneDayAgo)
    );

    // Send immediate alerts for high priority items
    if (highPriorityItems.length > 0 && (restaurant.enableEmailAlerts || restaurant.enableSmsAlerts)) {
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
        alertPhone: restaurants.alertPhone,
        enableEmailAlerts: restaurants.enableEmailAlerts,
        enableSmsAlerts: restaurants.enableSmsAlerts,
      })
      .from(restaurants)
      .where(
        and(
          eq(restaurants.isActive, true),
          or(
            eq(restaurants.enableEmailAlerts, true),
            eq(restaurants.enableSmsAlerts, true)
          )
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

  if (restaurant.enableSmsAlerts === true && restaurant.alertPhone) {
    const smsMessage = `URGENT: ${items.length} critical items low at ${restaurant.name}. Check email for details.`;
    await sendSmsAlert(restaurant.alertPhone, smsMessage);
  }
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

  if (restaurant.enableSmsAlerts === true && restaurant.alertPhone) {
    const smsMessage = `Daily Report: ${items.length} items below threshold at ${restaurant.name}. Check email for details.`;
    await sendSmsAlert(restaurant.alertPhone, smsMessage);
  }
}

/**
 * Format items list for alert messages
 */
function formatItemsList(items: LowStockItem[], highlightPriority: boolean): string {
  return items
    .sort((a, b) => {
      // Sort by priority first, then by name
      if (highlightPriority && a.isHighPriority !== b.isHighPriority) {
        return a.isHighPriority ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    })
    .map(item => {
      const priorityFlag = highlightPriority && item.isHighPriority ? "⚠️ " : "";
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

/**
 * Send SMS alert using Twilio
 */
async function sendSmsAlert(phone: string, message: string): Promise<void> {
  try {
    initializeTwilio();
    
    if (!twilioClient) {
      console.warn("Twilio not configured - skipping SMS alert");
      return;
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
      console.warn("TWILIO_PHONE_NUMBER not set - skipping SMS alert");
      return;
    }

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    console.log(`SMS alert sent to ${phone}`);
  } catch (error) {
    console.error("Error sending SMS alert:", error);
  }
}

/**
 * Test alert functionality
 */
export async function testAlert(restaurantId: string, type: 'email' | 'sms' | 'both'): Promise<boolean> {
  try {
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId));

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const testMessage = `Test alert from MyRestaurantInventory for ${restaurant.name}. Alert system is working correctly.`;

    if ((type === 'email' || type === 'both') && restaurant.alertEmail) {
      await sendEmailAlert(restaurant.alertEmail, "Test Alert - MyRestaurantInventory", testMessage);
    }

    if ((type === 'sms' || type === 'both') && restaurant.alertPhone) {
      await sendSmsAlert(restaurant.alertPhone, testMessage);
    }

    return true;
  } catch (error) {
    console.error("Error testing alert:", error);
    return false;
  }
}