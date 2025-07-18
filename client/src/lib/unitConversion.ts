// Unit conversion utilities for imperial/metric display and storage

export interface UnitConversion {
  imperial: string;
  metric: string;
  conversionFactor: number; // multiply imperial by this to get metric
}

export const UNIT_CONVERSIONS: Record<string, UnitConversion> = {
  // Weight conversions - metric to imperial
  kg: { imperial: "lbs", metric: "kg", conversionFactor: 0.453592 }, // lbs to kg
  grams: { imperial: "oz", metric: "grams", conversionFactor: 28.3495 }, // oz to grams
  g: { imperial: "oz", metric: "g", conversionFactor: 28.3495 }, // oz to g
  
  // Volume conversions - metric to imperial  
  l: { imperial: "gal", metric: "l", conversionFactor: 3.78541 }, // gal to l
  liters: { imperial: "gal", metric: "liters", conversionFactor: 3.78541 }, // gal to liters
  ml: { imperial: "fl oz", metric: "ml", conversionFactor: 29.5735 }, // fl oz to ml
  milliliters: { imperial: "fl oz", metric: "milliliters", conversionFactor: 29.5735 }, // fl oz to ml
  
  // Imperial units (for backwards compatibility)
  pounds: { imperial: "lbs", metric: "kg", conversionFactor: 0.453592 },
  ounces: { imperial: "oz", metric: "grams", conversionFactor: 28.3495 },
  gallons: { imperial: "gal", metric: "liters", conversionFactor: 3.78541 },
  quarts: { imperial: "qt", metric: "liters", conversionFactor: 0.946353 },
  pints: { imperial: "pt", metric: "milliliters", conversionFactor: 473.176 },
  cups: { imperial: "cups", metric: "milliliters", conversionFactor: 236.588 },
  
  // Length conversions (for some ingredients)
  cm: { imperial: "in", metric: "cm", conversionFactor: 2.54 }, // in to cm
  centimeters: { imperial: "in", metric: "centimeters", conversionFactor: 2.54 },
  m: { imperial: "ft", metric: "m", conversionFactor: 0.3048 }, // ft to m
  meters: { imperial: "ft", metric: "meters", conversionFactor: 0.3048 },
  
  // Items that don't need conversion
  pieces: { imperial: "pieces", metric: "pieces", conversionFactor: 1 },
  each: { imperial: "each", metric: "each", conversionFactor: 1 },
  dozens: { imperial: "dozen", metric: "dozen", conversionFactor: 1 },
};

// Get imperial display unit from metric storage unit
export function getImperialDisplayUnit(metricUnit: string): string {
  if (!metricUnit) return metricUnit;
  
  // Check direct key match first
  const directConversion = UNIT_CONVERSIONS[metricUnit.toLowerCase()];
  if (directConversion) {
    return directConversion.imperial;
  }
  
  // Check by metric value
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