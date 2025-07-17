export interface ReceiptAnalysisResult {
  totalAmount: number;
  tax: number;
  vendorName: string;
  purchaseDate: Date;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    totalPrice: number;
    pricePerUnit: number;
    confidence: number;
  }>;
  confidence: number;
  azureResult?: any;
}

export class AzureDocumentService {
  private endpoint: string;
  private apiKey: string;
  private modelId = "prebuilt-receipt";
  private apiVersion = "2024-11-30";

  constructor() {
    // Use the exact endpoint and API key from your working curl command
    this.endpoint = "https://cloversync.cognitiveservices.azure.com";
    this.apiKey = '8jmMXcoaEuBvuM6Yxvv6E8mRaPGEcrTEkFc5tIFzgEljOT5FRcS3JQQJ99BGAC4f1cMXJ3w3AAALACOG1gl4';
    
    console.log("Initializing Azure Document Intelligence with endpoint:", this.endpoint);
  }

  async analyzeReceipt(imageBuffer: Buffer): Promise<ReceiptAnalysisResult> {
    console.log("Starting Azure receipt analysis...");
    console.log("Image buffer size:", imageBuffer.length, "bytes");

    try {
      const url = `${this.endpoint}/documentintelligence/documentModels/${this.modelId}:analyze?api-version=${this.apiVersion}`;
      console.log("Full API URL:", url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base64Source: imageBuffer.toString('base64')
        })
      });

      console.log("Azure API response status:", response.status);
      
      if (response.status === 202) {
        // Handle async operation - get operation location from headers
        const operationLocation = response.headers.get('operation-location');
        console.log("Async operation started, polling for results at:", operationLocation);
        
        if (!operationLocation) {
          throw new Error("No operation location returned from Azure");
        }
        
        // Poll for results
        const result = await this.pollForResults(operationLocation);
        return this.parseReceiptResults(result);
        
      } else if (response.status !== 200) {
        const errorText = await response.text();
        console.error("Azure API error response:", errorText);
        throw new Error(`Azure AI analysis failed: ${response.status} - ${errorText}`);
      }

      // For synchronous response (status 200)
      const result = await response.json();
      return this.parseReceiptResults(result);

    } catch (error) {
      console.error("Azure Document Intelligence analysis failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes("404")) {
        throw new Error(`Azure resource not found at ${this.endpoint}. Please verify the endpoint URL and resource configuration.`);
      } else {
        throw new Error(`Azure analysis failed: ${errorMessage}`);
      }
    }
  }

  async pollForResults(operationLocation: string): Promise<any> {
    const maxAttempts = 30;
    const delayMs = 2000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`Polling attempt ${attempt + 1}/${maxAttempts}...`);
        
        const response = await fetch(operationLocation, {
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey
          }
        });
        
        const result = await response.json();
        console.log(`Poll result status: ${result.status}`);
        
        if (result.status === "succeeded") {
          console.log("Analysis completed successfully");
          return result;
        } else if (result.status === "failed") {
          throw new Error(`Azure analysis failed: ${JSON.stringify(result.error || result)}`);
        }
        
        // Still running, wait and try again
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
      } catch (error) {
        console.error(`Polling attempt ${attempt + 1} failed:`, error);
        if (attempt === maxAttempts - 1) throw error;
      }
    }
    
    throw new Error("Azure analysis timed out after maximum polling attempts");
  }

  parseReceiptResults(result: any): ReceiptAnalysisResult {
    const document = result.analyzeResult?.documents?.[0];
    
    if (!document) {
      throw new Error("No receipt document found in analysis");
    }

    const fields = document.fields || {};
    
    // Extract basic receipt information
    const totalAmount = this.extractFieldValue(fields.Total) || 0;
    const tax = this.extractFieldValue(fields.TotalTax) || 0;
    const vendorName = this.extractFieldValue(fields.MerchantName) || "Unknown Vendor";
    const transactionDate = this.extractFieldValue(fields.TransactionDate);
    
    // Parse purchase date
    let purchaseDate = new Date();
    if (transactionDate) {
      const parsedDate = new Date(transactionDate);
      if (!isNaN(parsedDate.getTime())) {
        purchaseDate = parsedDate;
      }
    }

    // Extract items
    const items: any[] = [];
    const itemsArray = fields.Items?.valueArray || [];
    
    for (const itemField of itemsArray) {
      const itemFields = itemField.valueObject || {};
      const name = this.extractFieldValue(itemFields.Description) || this.extractFieldValue(itemFields.Name) || "Unknown Item";
      const quantity = this.extractFieldValue(itemFields.Quantity) || 1;
      const totalPrice = this.extractFieldValue(itemFields.TotalPrice) || 0;
      
      // Try to determine unit and price per unit
      let unit = "each";
      let pricePerUnit = totalPrice / quantity;
      
      // Look for unit indicators in the name
      const unitMatches = name.match(/(\d+)\s*(lb|lbs|kg|g|oz|ml|l|liters?|pounds?|ounces?|grams?|kilograms?)/i);
      if (unitMatches) {
        const detectedQuantity = parseFloat(unitMatches[1]);
        const detectedUnit = unitMatches[2].toLowerCase();
        
        // Map common units
        const unitMap: Record<string, string> = {
          'lb': 'pounds', 'lbs': 'pounds', 'pounds': 'pounds', 'pound': 'pounds',
          'oz': 'ounces', 'ounces': 'ounces', 'ounce': 'ounces',
          'kg': 'kilograms', 'kilograms': 'kilograms', 'kilogram': 'kilograms',
          'g': 'grams', 'grams': 'grams', 'gram': 'grams',
          'ml': 'milliliters', 'l': 'liters', 'liters': 'liters', 'liter': 'liters'
        };
        
        unit = unitMap[detectedUnit] || detectedUnit;
        pricePerUnit = totalPrice / detectedQuantity;
      }

      items.push({
        name,
        quantity,
        unit,
        totalPrice,
        pricePerUnit,
        confidence: itemField.confidence || 0.5
      });
    }

    console.log("Successfully parsed receipt results");
    
    return {
      totalAmount,
      tax,
      vendorName,
      purchaseDate,
      items,
      confidence: document.confidence || 0.5,
      azureResult: result
    };
  }

  private extractFieldValue(field: any): any {
    if (!field) return null;
    
    if (field.content !== undefined) {
      return field.content;
    }
    
    if (field.value !== undefined) {
      return field.value;
    }
    
    if (field.valueString !== undefined) {
      return field.valueString;
    }
    
    if (field.valueNumber !== undefined) {
      return field.valueNumber;
    }
    
    if (field.valueDate !== undefined) {
      return field.valueDate;
    }
    
    return null;
  }

  async findBestRawMaterialMatch(itemName: string, rawMaterials: any[]): Promise<{ match: any | null; confidence: number }> {
    if (!itemName || !rawMaterials || rawMaterials.length === 0) {
      return { match: null, confidence: 0 };
    }

    const normalizedItemName = itemName.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const material of rawMaterials) {
      const materialName = material.name.toLowerCase().trim();
      
      // Exact match
      if (normalizedItemName === materialName) {
        return { match: material, confidence: 1.0 };
      }
      
      // Check if item name contains material name or vice versa
      const containsScore = this.calculateContainsScore(normalizedItemName, materialName);
      if (containsScore > bestScore) {
        bestScore = containsScore;
        bestMatch = material;
      }
      
      // Calculate similarity score
      const similarityScore = this.calculateSimilarityScore(normalizedItemName, materialName);
      if (similarityScore > bestScore) {
        bestScore = similarityScore;
        bestMatch = material;
      }
    }

    return { match: bestMatch, confidence: bestScore };
  }

  private calculateContainsScore(str1: string, str2: string): number {
    if (str1.includes(str2) || str2.includes(str1)) {
      const longerLength = Math.max(str1.length, str2.length);
      const shorterLength = Math.min(str1.length, str2.length);
      return shorterLength / longerLength;
    }
    return 0;
  }

  private calculateSimilarityScore(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

export const azureDocumentService = new AzureDocumentService();