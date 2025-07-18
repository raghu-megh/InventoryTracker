// Unit conversion utilities for imperial/metric display and storage

export interface UnitConversion {
  imperial: string;
  metric: string;
  conversionFactor: number; // multiply imperial by this to get metric
}

export const UNIT_CONVERSIONS: Record<string, UnitConversion> = {
  // Weight conversions
  pounds: { imperial: "lbs", metric: "grams", conversionFactor: 453.592 },
  ounces: { imperial: "oz", metric: "grams", conversionFactor: 28.3495 },
  
  // Volume conversions
  gallons: { imperial: "gal", metric: "liters", conversionFactor: 3.78541 },
  quarts: { imperial: "qt", metric: "liters", conversionFactor: 0.946353 },
  pints: { imperial: "pt", metric: "milliliters", conversionFactor: 473.176 },
  cups: { imperial: "cups", metric: "milliliters", conversionFactor: 236.588 },
  
  // Length conversions (for some ingredients)
  inches: { imperial: "in", metric: "centimeters", conversionFactor: 2.54 },
  feet: { imperial: "ft", metric: "meters", conversionFactor: 0.3048 },
  
  // Items that don't need conversion
  pieces: { imperial: "pieces", metric: "pieces", conversionFactor: 1 },
  each: { imperial: "each", metric: "each", conversionFactor: 1 },
  dozens: { imperial: "dozen", metric: "dozen", conversionFactor: 1 },
};

// Get imperial display unit from metric storage unit
export function getImperialDisplayUnit(metricUnit: string): string {
  const conversion = Object.values(UNIT_CONVERSIONS).find(
    conv => conv.metric.toLowerCase() === metricUnit.toLowerCase()
  );
  return conversion?.imperial || metricUnit;
}

// Get metric storage unit from imperial display unit
export function getMetricStorageUnit(imperialUnit: string): string {
  const conversion = Object.values(UNIT_CONVERSIONS).find(
    conv => conv.imperial.toLowerCase() === imperialUnit.toLowerCase()
  );
  return conversion?.metric || imperialUnit;
}

// Convert imperial value to metric for storage
export function imperialToMetric(value: number, imperialUnit: string): number {
  const conversion = Object.values(UNIT_CONVERSIONS).find(
    conv => conv.imperial.toLowerCase() === imperialUnit.toLowerCase()
  );
  return conversion ? value * conversion.conversionFactor : value;
}

// Convert metric value to imperial for display
export function metricToImperial(value: number, metricUnit: string): number {
  const conversion = Object.values(UNIT_CONVERSIONS).find(
    conv => conv.metric.toLowerCase() === metricUnit.toLowerCase()
  );
  return conversion ? value / conversion.conversionFactor : value;
}

// Get all available imperial units for dropdown
export function getImperialUnits(): string[] {
  return Object.values(UNIT_CONVERSIONS).map(conv => conv.imperial);
}