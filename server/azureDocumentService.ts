import AzureAIDocumentIntelligence from "@azure-rest/ai-document-intelligence";
import { RawMaterialPurchaseItem } from "@shared/schema";

export interface ReceiptAnalysisResult {
  totalAmount: number;
  tax: number;
  vendorName: string;
  purchaseDate: Date;
  items: {
    name: string;
    quantity: number;
    unit: string;
    totalPrice: number;
    pricePerUnit?: number;
    confidence: number;
  }[];
  confidence: number;
  azureResult: any;
}

export class AzureDocumentService {
  private client: any;
  private endpoint = "https://image-to-document.cognitiveservices.azure.com/";
  private modelId = "prebuilt-receipt";

  constructor() {
    if (!process.env.AZURE_DOCUMENT_AI_KEY) {
      console.warn("AZURE_DOCUMENT_AI_KEY not configured - receipt processing will be disabled");
      return;
    }
    
    this.client = AzureAIDocumentIntelligence(
      this.endpoint,
      { key: process.env.AZURE_DOCUMENT_AI_KEY }
    );
  }

  async analyzeReceipt(imageBuffer: Buffer): Promise<ReceiptAnalysisResult> {
    if (!this.client) {
      throw new Error("Azure Document Intelligence not configured");
    }

    try {
      // Analyze the receipt using Azure AI
      const analyzeResult = await this.client.path("/documentModels/{modelId}:analyze", this.modelId).post({
        contentType: "application/json",
        body: {
          base64Source: imageBuffer.toString('base64')
        },
        queryParameters: {
          stringIndexType: "textElements"
        }
      });

      if (analyzeResult.status !== "200") {
        throw new Error(`Azure AI analysis failed: ${analyzeResult.status}`);
      }

      // Parse the Azure response
      const result = analyzeResult.body;
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

      // Extract line items
      const items: ReceiptAnalysisResult['items'] = [];
      const itemsArray = fields.Items?.valueArray || [];
      
      for (const item of itemsArray) {
        const itemFields = item.valueObject || {};
        const name = this.extractFieldValue(itemFields.Description) || 
                    this.extractFieldValue(itemFields.Name) || 
                    "Unknown Item";
        const totalPrice = this.extractFieldValue(itemFields.TotalPrice) || 0;
        const quantity = this.extractFieldValue(itemFields.Quantity) || 1;
        const pricePerUnit = quantity > 0 ? totalPrice / quantity : totalPrice;
        
        // Try to extract unit information from the description
        const unit = this.extractUnitFromDescription(name);
        
        items.push({
          name: this.cleanItemName(name),
          quantity,
          unit,
          totalPrice,
          pricePerUnit,
          confidence: item.confidence || 0.5
        });
      }

      // If no items were extracted, try to extract from line items
      if (items.length === 0 && result.analyzeResult?.pages) {
        for (const page of result.analyzeResult.pages) {
          if (page.lines) {
            const extractedItems = this.extractItemsFromLines(page.lines);
            items.push(...extractedItems);
          }
        }
      }

      return {
        totalAmount,
        tax,
        vendorName,
        purchaseDate,
        items,
        confidence: document.confidence || 0.5,
        azureResult: result
      };

    } catch (error) {
      console.error("Receipt analysis failed:", error);
      throw new Error(`Receipt analysis failed: ${error.message}`);
    }
  }

  private extractFieldValue(field: any): any {
    if (!field) return null;
    if (field.valueNumber !== undefined) return field.valueNumber;
    if (field.valueString !== undefined) return field.valueString;
    if (field.valueDate !== undefined) return field.valueDate;
    if (field.content !== undefined) return field.content;
    return null;
  }

  private extractUnitFromDescription(description: string): string {
    const unitPatterns = [
      /(\d+)\s*(lbs?|pounds?)/i,
      /(\d+)\s*(oz|ounces?)/i,
      /(\d+)\s*(kg|kilograms?)/i,
      /(\d+)\s*(g|grams?)/i,
      /(\d+)\s*(l|liters?|litres?)/i,
      /(\d+)\s*(ml|milliliters?|millilitres?)/i,
      /(\d+)\s*(pcs?|pieces?|each)/i,
      /(\d+)\s*(bags?)/i,
      /(\d+)\s*(boxes?)/i,
      /(\d+)\s*(cans?)/i,
      /(\d+)\s*(bottles?)/i
    ];

    for (const pattern of unitPatterns) {
      const match = description.match(pattern);
      if (match) {
        return match[2].toLowerCase();
      }
    }

    // Default unit
    return "pieces";
  }

  private cleanItemName(name: string): string {
    // Remove quantity and unit information from the name
    return name
      .replace(/\d+\s*(lbs?|pounds?|oz|ounces?|kg|kilograms?|g|grams?|l|liters?|ml|milliliters?|pcs?|pieces?|bags?|boxes?|cans?|bottles?)\s*/gi, '')
      .replace(/^\s*\d+\s*/, '') // Remove leading numbers
      .trim();
  }

  private extractItemsFromLines(lines: any[]): ReceiptAnalysisResult['items'] {
    const items: ReceiptAnalysisResult['items'] = [];
    
    for (const line of lines) {
      const content = line.content || "";
      
      // Look for lines that might be items (contain price patterns)
      const priceMatch = content.match(/\$?(\d+\.?\d*)/);
      if (priceMatch && content.length > 5) {
        const price = parseFloat(priceMatch[1]);
        const name = content.replace(/\$?\d+\.?\d*.*$/, '').trim();
        
        if (name && price > 0) {
          items.push({
            name: this.cleanItemName(name),
            quantity: 1,
            unit: this.extractUnitFromDescription(name),
            totalPrice: price,
            pricePerUnit: price,
            confidence: 0.3 // Lower confidence for extracted items
          });
        }
      }
    }
    
    return items;
  }

  // Helper method to match items to existing raw materials
  async findBestRawMaterialMatch(itemName: string, existingRawMaterials: any[]): Promise<{
    match: any | null;
    confidence: number;
  }> {
    if (!existingRawMaterials || existingRawMaterials.length === 0) {
      return { match: null, confidence: 0 };
    }

    const cleanItemName = itemName.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    for (const material of existingRawMaterials) {
      const materialName = material.name.toLowerCase().trim();
      
      // Exact match
      if (cleanItemName === materialName) {
        return { match: material, confidence: 1.0 };
      }
      
      // Contains match
      if (cleanItemName.includes(materialName) || materialName.includes(cleanItemName)) {
        const score = Math.min(cleanItemName.length, materialName.length) / 
                     Math.max(cleanItemName.length, materialName.length);
        if (score > bestScore) {
          bestMatch = material;
          bestScore = score;
        }
      }
      
      // Fuzzy matching for similar words
      const similarity = this.calculateStringSimilarity(cleanItemName, materialName);
      if (similarity > 0.7 && similarity > bestScore) {
        bestMatch = material;
        bestScore = similarity;
      }
    }

    return { 
      match: bestMatch, 
      confidence: bestScore > 0.6 ? bestScore : 0 
    };
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
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