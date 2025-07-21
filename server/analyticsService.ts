import { eq, sql, desc, asc, and, gte, lte, between } from "drizzle-orm";
import { db } from "./db";
import { 
  restaurants, 
  rawMaterials, 
  rawMaterialMovements, 
  sales, 
  recipes, 
  recipeIngredients,
  menuItems,
  dailyAnalytics,
  recipeAnalytics,
  supplierAnalytics,
  demandForecasts,
  costOptimizations,
  rawMaterialPurchases
} from "@shared/schema";

interface AnalyticsFilter {
  restaurantId: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Check if restaurant has premium analytics access
 */
export async function hasAnalyticsAccess(restaurantId: string): Promise<boolean> {
  const [restaurant] = await db
    .select({ analyticsEnabled: restaurants.analyticsEnabled, subscriptionTier: restaurants.subscriptionTier })
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId));
  
  return restaurant?.analyticsEnabled === true && 
         (restaurant?.subscriptionTier === 'premium' || restaurant?.subscriptionTier === 'enterprise');
}

/**
 * 1. PROFITABILITY ANALYSIS
 * Calculate gross profit, margins, and cost breakdowns by recipe/item
 */
export async function getProfitabilityAnalysis(filter: AnalyticsFilter) {
  if (!await hasAnalyticsAccess(filter.restaurantId)) {
    throw new Error("Premium analytics access required");
  }

  // Recipe profitability with actual vs theoretical costs
  const recipeProfitability = await db
    .select({
      recipeId: recipeAnalytics.recipeId,
      recipeName: recipes.name,
      totalSold: sql<number>`sum(${recipeAnalytics.totalSold})`,
      totalRevenue: sql<number>`sum(${recipeAnalytics.revenue})`,
      theoreticalCost: sql<number>`sum(${recipeAnalytics.theoreticalFoodCost})`,
      actualCost: sql<number>`sum(${recipeAnalytics.actualFoodCost})`,
      costVariance: sql<number>`sum(${recipeAnalytics.costVariance})`,
      avgProfitMargin: sql<number>`avg(${recipeAnalytics.profitMargin})`,
    })
    .from(recipeAnalytics)
    .leftJoin(recipes, eq(recipeAnalytics.recipeId, recipes.id))
    .where(
      and(
        eq(recipeAnalytics.restaurantId, filter.restaurantId),
        between(recipeAnalytics.date, filter.startDate, filter.endDate)
      )
    )
    .groupBy(recipeAnalytics.recipeId, recipes.name)
    .orderBy(desc(sql`sum(${recipeAnalytics.revenue})`));

  // Daily profitability trends
  const dailyTrends = await db
    .select({
      date: dailyAnalytics.date,
      totalSales: dailyAnalytics.totalSales,
      totalCost: dailyAnalytics.totalCost,
      grossProfit: dailyAnalytics.grossProfit,
      grossMargin: dailyAnalytics.grossMargin,
      foodCostPercentage: dailyAnalytics.foodCostPercentage,
    })
    .from(dailyAnalytics)
    .where(
      and(
        eq(dailyAnalytics.restaurantId, filter.restaurantId),
        between(dailyAnalytics.date, filter.startDate, filter.endDate)
      )
    )
    .orderBy(asc(dailyAnalytics.date));

  return {
    recipeProfitability,
    dailyTrends,
    summary: {
      totalRevenue: dailyTrends.reduce((sum, day) => sum + parseFloat(day.totalSales || "0"), 0),
      totalCost: dailyTrends.reduce((sum, day) => sum + parseFloat(day.totalCost || "0"), 0),
      avgMargin: dailyTrends.reduce((sum, day) => sum + parseFloat(day.grossMargin || "0"), 0) / dailyTrends.length,
    }
  };
}

/**
 * 2. INVENTORY TURNOVER ANALYSIS
 * Track how efficiently inventory is being used
 */
export async function getInventoryTurnoverAnalysis(filter: AnalyticsFilter) {
  if (!await hasAnalyticsAccess(filter.restaurantId)) {
    throw new Error("Premium analytics access required");
  }

  // Calculate turnover rate for each raw material
  const turnoverAnalysis = await db
    .select({
      materialId: rawMaterials.id,
      materialName: rawMaterials.name,
      category: rawMaterials.categoryId,
      currentStock: rawMaterials.currentStock,
      totalUsage: sql<number>`
        COALESCE(SUM(CASE WHEN ${rawMaterialMovements.type} = 'usage' 
                     THEN ABS(${rawMaterialMovements.quantity}) ELSE 0 END), 0)
      `,
      totalPurchases: sql<number>`
        COALESCE(SUM(CASE WHEN ${rawMaterialMovements.type} = 'purchase' 
                     THEN ${rawMaterialMovements.quantity} ELSE 0 END), 0)
      `,
      avgStock: sql<number>`
        COALESCE(AVG(${rawMaterialMovements.newStock}), ${rawMaterials.currentStock})
      `,
      turnoverRate: sql<number>`
        CASE WHEN AVG(${rawMaterialMovements.newStock}) > 0 
        THEN COALESCE(SUM(CASE WHEN ${rawMaterialMovements.type} = 'usage' 
                          THEN ABS(${rawMaterialMovements.quantity}) ELSE 0 END), 0) / 
             AVG(${rawMaterialMovements.newStock})
        ELSE 0 END
      `,
      daysToDeplete: sql<number>`
        CASE WHEN COALESCE(SUM(CASE WHEN ${rawMaterialMovements.type} = 'usage' 
                               THEN ABS(${rawMaterialMovements.quantity}) ELSE 0 END), 0) > 0
        THEN (${rawMaterials.currentStock} / 
              (COALESCE(SUM(CASE WHEN ${rawMaterialMovements.type} = 'usage' 
                            THEN ABS(${rawMaterialMovements.quantity}) ELSE 0 END), 0) / 
               EXTRACT(DAYS FROM (${filter.endDate} - ${filter.startDate}))))
        ELSE 999 END
      `,
    })
    .from(rawMaterials)
    .leftJoin(rawMaterialMovements, and(
      eq(rawMaterialMovements.rawMaterialId, rawMaterials.id),
      between(rawMaterialMovements.createdAt, filter.startDate, filter.endDate)
    ))
    .where(eq(rawMaterials.restaurantId, filter.restaurantId))
    .groupBy(rawMaterials.id, rawMaterials.name, rawMaterials.categoryId, rawMaterials.currentStock)
    .orderBy(desc(sql`
      CASE WHEN AVG(${rawMaterialMovements.newStock}) > 0 
      THEN COALESCE(SUM(CASE WHEN ${rawMaterialMovements.type} = 'usage' 
                        THEN ABS(${rawMaterialMovements.quantity}) ELSE 0 END), 0) / 
           AVG(${rawMaterialMovements.newStock})
      ELSE 0 END
    `));

  return {
    materials: turnoverAnalysis,
    insights: {
      highTurnover: turnoverAnalysis.filter(m => (m.turnoverRate || 0) > 4), // Weekly turnover
      lowTurnover: turnoverAnalysis.filter(m => (m.turnoverRate || 0) < 0.5), // Slow moving
      overstock: turnoverAnalysis.filter(m => (m.daysToDeplete || 0) > 30),
    }
  };
}

/**
 * 3. DEMAND FORECASTING
 * Predict future demand based on historical patterns
 */
export async function getDemandForecast(filter: AnalyticsFilter) {
  if (!await hasAnalyticsAccess(filter.restaurantId)) {
    throw new Error("Premium analytics access required");
  }

  // Historical demand patterns
  const historicalDemand = await db
    .select({
      materialId: rawMaterialMovements.rawMaterialId,
      materialName: rawMaterials.name,
      date: sql<Date>`DATE(${rawMaterialMovements.createdAt})`,
      dailyUsage: sql<number>`
        SUM(CASE WHEN ${rawMaterialMovements.type} = 'usage' 
            THEN ABS(${rawMaterialMovements.quantity}) ELSE 0 END)
      `,
    })
    .from(rawMaterialMovements)
    .leftJoin(rawMaterials, eq(rawMaterialMovements.rawMaterialId, rawMaterials.id))
    .where(
      and(
        eq(rawMaterialMovements.restaurantId, filter.restaurantId),
        eq(rawMaterialMovements.type, 'usage'),
        between(rawMaterialMovements.createdAt, filter.startDate, filter.endDate)
      )
    )
    .groupBy(rawMaterialMovements.rawMaterialId, rawMaterials.name, sql`DATE(${rawMaterialMovements.createdAt})`)
    .orderBy(rawMaterialMovements.rawMaterialId, sql`DATE(${rawMaterialMovements.createdAt})`);

  // Simple trend analysis (can be enhanced with ML later)
  const forecastAnalysis = await Promise.all(
    [...new Set(historicalDemand.map(d => d.materialId))].map(async (materialId) => {
      const materialData = historicalDemand.filter(d => d.materialId === materialId);
      const materialName = materialData[0]?.materialName || 'Unknown';
      
      if (materialData.length < 7) {
        return {
          materialId,
          materialName,
          forecast: null,
          confidence: 0,
          trend: 'insufficient_data'
        };
      }

      // Calculate 7-day moving average and trend
      const recent7Days = materialData.slice(-7);
      const previous7Days = materialData.slice(-14, -7);
      
      const recentAvg = recent7Days.reduce((sum, d) => sum + (d.dailyUsage || 0), 0) / 7;
      const previousAvg = previous7Days.length > 0 ? 
        previous7Days.reduce((sum, d) => sum + (d.dailyUsage || 0), 0) / previous7Days.length : recentAvg;
      
      const trendPercent = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
      
      return {
        materialId,
        materialName,
        forecast: {
          next7Days: recentAvg * 7,
          next30Days: recentAvg * 30,
          dailyAverage: recentAvg,
        },
        confidence: Math.min(95, Math.max(50, materialData.length * 2)), // Confidence based on data points
        trend: trendPercent > 10 ? 'increasing' : trendPercent < -10 ? 'decreasing' : 'stable',
        trendPercent,
      };
    })
  );

  return {
    forecasts: forecastAnalysis.filter(f => f.forecast !== null),
    insights: {
      highDemandItems: forecastAnalysis
        .filter(f => f.forecast && f.forecast.dailyAverage > 5)
        .sort((a, b) => (b.forecast?.dailyAverage || 0) - (a.forecast?.dailyAverage || 0)),
      trendingUp: forecastAnalysis.filter(f => f.trend === 'increasing'),
      trendingDown: forecastAnalysis.filter(f => f.trend === 'decreasing'),
    }
  };
}

/**
 * 4. WASTE ANALYSIS
 * Track food waste patterns and cost impact
 */
export async function getWasteAnalysis(filter: AnalyticsFilter) {
  if (!await hasAnalyticsAccess(filter.restaurantId)) {
    throw new Error("Premium analytics access required");
  }

  const wasteData = await db
    .select({
      materialId: rawMaterialMovements.rawMaterialId,
      materialName: rawMaterials.name,
      category: rawMaterials.categoryId,
      totalWaste: sql<number>`SUM(ABS(${rawMaterialMovements.quantity}))`,
      wasteCost: sql<number>`SUM(ABS(${rawMaterialMovements.totalCost}))`,
      wasteCount: sql<number>`COUNT(*)`,
      avgWastePerIncident: sql<number>`AVG(ABS(${rawMaterialMovements.quantity}))`,
      date: sql<Date>`DATE(${rawMaterialMovements.createdAt})`,
    })
    .from(rawMaterialMovements)
    .leftJoin(rawMaterials, eq(rawMaterialMovements.rawMaterialId, rawMaterials.id))
    .where(
      and(
        eq(rawMaterialMovements.restaurantId, filter.restaurantId),
        eq(rawMaterialMovements.type, 'waste'),
        between(rawMaterialMovements.createdAt, filter.startDate, filter.endDate)
      )
    )
    .groupBy(rawMaterialMovements.rawMaterialId, rawMaterials.name, rawMaterials.categoryId, sql`DATE(${rawMaterialMovements.createdAt})`)
    .orderBy(desc(sql`SUM(ABS(${rawMaterialMovements.totalCost}))`));

  // Waste trends over time
  const dailyWaste = await db
    .select({
      date: sql<Date>`DATE(${rawMaterialMovements.createdAt})`,
      totalWasteAmount: sql<number>`SUM(ABS(${rawMaterialMovements.quantity}))`,
      totalWasteCost: sql<number>`SUM(ABS(${rawMaterialMovements.totalCost}))`,
      wasteIncidents: sql<number>`COUNT(*)`,
    })
    .from(rawMaterialMovements)
    .where(
      and(
        eq(rawMaterialMovements.restaurantId, filter.restaurantId),
        eq(rawMaterialMovements.type, 'waste'),
        between(rawMaterialMovements.createdAt, filter.startDate, filter.endDate)
      )
    )
    .groupBy(sql`DATE(${rawMaterialMovements.createdAt})`)
    .orderBy(sql`DATE(${rawMaterialMovements.createdAt})`);

  return {
    wasteByMaterial: wasteData,
    dailyTrends: dailyWaste,
    summary: {
      totalWasteCost: wasteData.reduce((sum, item) => sum + (item.wasteCost || 0), 0),
      totalWasteAmount: wasteData.reduce((sum, item) => sum + (item.totalWaste || 0), 0),
      avgDailyWaste: dailyWaste.reduce((sum, day) => sum + (day.totalWasteCost || 0), 0) / Math.max(dailyWaste.length, 1),
      highestWasteItems: wasteData.slice(0, 5),
    }
  };
}

/**
 * 5. SUPPLIER PERFORMANCE ANALYSIS
 * Evaluate supplier efficiency, cost, and reliability
 */
export async function getSupplierAnalysis(filter: AnalyticsFilter) {
  if (!await hasAnalyticsAccess(filter.restaurantId)) {
    throw new Error("Premium analytics access required");
  }

  // Analyze purchase patterns by supplier (extracted from purchase descriptions/notes)
  const supplierData = await db
    .select({
      supplierId: rawMaterialPurchases.id,
      supplierInfo: rawMaterialPurchases.notes, // Contains supplier name
      totalSpent: sql<number>`SUM(${rawMaterialPurchases.totalAmount})`,
      orderCount: sql<number>`COUNT(*)`,
      avgOrderValue: sql<number>`AVG(${rawMaterialPurchases.totalAmount})`,
      uniqueItems: sql<number>`COUNT(DISTINCT ${rawMaterialPurchases.id})`,
      lastOrderDate: sql<Date>`MAX(${rawMaterialPurchases.purchaseDate})`,
    })
    .from(rawMaterialPurchases)
    .where(
      and(
        eq(rawMaterialPurchases.restaurantId, filter.restaurantId),
        between(rawMaterialPurchases.purchaseDate, filter.startDate, filter.endDate)
      )
    )
    .groupBy(rawMaterialPurchases.id, rawMaterialPurchases.notes)
    .orderBy(desc(sql`SUM(${rawMaterialPurchases.totalAmount})`));

  return {
    suppliers: supplierData,
    insights: {
      topSuppliers: supplierData.slice(0, 5),
      frequentSuppliers: supplierData.filter(s => (s.orderCount || 0) > 5),
      singleOrderSuppliers: supplierData.filter(s => (s.orderCount || 0) === 1),
    }
  };
}

/**
 * 6. COST OPTIMIZATION RECOMMENDATIONS
 * AI-powered suggestions for cost reduction
 */
export async function getCostOptimizations(filter: AnalyticsFilter) {
  if (!await hasAnalyticsAccess(filter.restaurantId)) {
    throw new Error("Premium analytics access required");
  }

  const recommendations: any[] = [];

  // 1. High waste items recommendation
  const wasteAnalysis = await getWasteAnalysis(filter);
  wasteAnalysis.summary.highestWasteItems.slice(0, 3).forEach(item => {
    if ((item.wasteCost || 0) > 50) {
      recommendations.push({
        type: 'waste_reduction',
        title: `Reduce waste for ${item.materialName}`,
        description: `This item has generated $${(item.wasteCost || 0).toFixed(2)} in waste. Consider portion control training or better storage.`,
        potentialSavings: (item.wasteCost || 0) * 0.5, // Assume 50% reduction possible
        priority: 'high',
        relatedItemId: item.materialId,
        relatedItemType: 'raw_material'
      });
    }
  });

  // 2. Low turnover items recommendation
  const turnoverAnalysis = await getInventoryTurnoverAnalysis(filter);
  turnoverAnalysis.insights.overstock.slice(0, 3).forEach(item => {
    recommendations.push({
      type: 'inventory_optimization',
      title: `Reduce inventory for ${item.materialName}`,
      description: `This item has ${(item.daysToDeplete || 0).toFixed(0)} days of stock. Consider reducing order quantities.`,
      potentialSavings: parseFloat(item.currentStock || "0") * 0.3, // Assume 30% reduction
      priority: 'medium',
      relatedItemId: item.materialId,
      relatedItemType: 'raw_material'
    });
  });

  // 3. Recipe cost optimization
  const profitabilityAnalysis = await getProfitabilityAnalysis(filter);
  const lowMarginRecipes = profitabilityAnalysis.recipeProfitability
    .filter(recipe => (recipe.avgProfitMargin || 0) < 20)
    .slice(0, 3);

  lowMarginRecipes.forEach(recipe => {
    recommendations.push({
      type: 'recipe_optimization',
      title: `Optimize recipe: ${recipe.recipeName}`,
      description: `Profit margin is only ${(recipe.avgProfitMargin || 0).toFixed(1)}%. Consider ingredient substitutions or price adjustments.`,
      potentialSavings: (recipe.totalRevenue || 0) * 0.05, // Assume 5% improvement
      priority: 'medium',
      relatedItemId: recipe.recipeId,
      relatedItemType: 'recipe'
    });
  });

  return {
    recommendations: recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings),
    totalPotentialSavings: recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0)
  };
}

/**
 * Generate comprehensive analytics dashboard data
 */
export async function getAnalyticsDashboard(filter: AnalyticsFilter) {
  if (!await hasAnalyticsAccess(filter.restaurantId)) {
    throw new Error("Premium analytics access required");
  }

  const [
    profitability,
    inventory,
    demand,
    waste,
    supplier,
    optimizations
  ] = await Promise.all([
    getProfitabilityAnalysis(filter),
    getInventoryTurnoverAnalysis(filter),
    getDemandForecast(filter),
    getWasteAnalysis(filter),
    getSupplierAnalysis(filter),
    getCostOptimizations(filter)
  ]);

  return {
    profitability,
    inventory,
    demand,
    waste,
    supplier,
    optimizations,
    generatedAt: new Date(),
    period: {
      startDate: filter.startDate,
      endDate: filter.endDate,
      days: Math.ceil((filter.endDate.getTime() - filter.startDate.getTime()) / (1000 * 60 * 60 * 24))
    }
  };
}