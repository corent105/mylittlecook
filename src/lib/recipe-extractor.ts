import { parse } from 'node-html-parser';
import { IngredientParser, type ParsedIngredient } from './ingredient-parser';

export interface ExtractedRecipe {
  title: string;
  description?: string;
  ingredients: string[];
  parsedIngredients: ParsedIngredient[];
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
  imageUrl?: string;
  sourceUrl: string;
  markdown: string;
}

export class RecipeExtractor {
  private static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  private static extractTimeFromText(text: string): number | undefined {
    // Extract time patterns like "30 min", "1 h 30", "2 hours"
    const patterns = [
      /(\d+)\s*(?:h|hours?|heures?)\s*(\d+)?/i,
      /(\d+)\s*(?:min|minutes?)/i,
      /(\d+)\s*(?:hrs?)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        return pattern.source.includes('min') ? hours : hours * 60 + minutes;
      }
    }
    return undefined;
  }

  private static extractServingsFromText(text: string): number | undefined {
    const patterns = [
      /(\d+)\s*(?:servings?|portions?|personnes?|parts?)/i,
      /pour\s*(\d+)\s*personnes?/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return undefined;
  }

  private static extractJsonLd(html: string): any[] {
    const root = parse(html);
    const scripts = root.querySelectorAll('script[type="application/ld+json"]');
    const jsonLdData: any[] = [];

    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.innerHTML);
        if (Array.isArray(data)) {
          jsonLdData.push(...data);
        } else {
          jsonLdData.push(data);
        }
      } catch (error) {
        console.warn('Failed to parse JSON-LD:', error);
      }
    });

    return jsonLdData;
  }

  private static extractFromJsonLd(jsonLdData: any[]): Partial<ExtractedRecipe> | null {
    const recipeData = jsonLdData.find(item => 
      item['@type'] === 'Recipe' || 
      (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
    );

    if (!recipeData) return null;

    const extracted: Partial<ExtractedRecipe> = {};

    if (recipeData.name) extracted.title = this.cleanText(recipeData.name);
    if (recipeData.description) extracted.description = this.cleanText(recipeData.description);

    // Extract ingredients
    if (recipeData.recipeIngredient && Array.isArray(recipeData.recipeIngredient)) {
      extracted.ingredients = recipeData.recipeIngredient.map((ing: string) => this.cleanText(ing));
    }

    // Extract instructions
    if (recipeData.recipeInstructions && Array.isArray(recipeData.recipeInstructions)) {
      extracted.instructions = recipeData.recipeInstructions.map((inst: any) => {
        if (typeof inst === 'string') return this.cleanText(inst);
        if (inst.text) return this.cleanText(inst.text);
        return '';
      }).filter(Boolean);
    }

    // Extract timing
    if (recipeData.prepTime) {
      const prepMatch = recipeData.prepTime.match(/PT(\d+)M/) || recipeData.prepTime.match(/(\d+)/);
      if (prepMatch) extracted.prepTime = parseInt(prepMatch[1]);
    }

    if (recipeData.cookTime) {
      const cookMatch = recipeData.cookTime.match(/PT(\d+)M/) || recipeData.cookTime.match(/(\d+)/);
      if (cookMatch) extracted.cookTime = parseInt(cookMatch[1]);
    }

    if (recipeData.totalTime) {
      const totalMatch = recipeData.totalTime.match(/PT(\d+)M/) || recipeData.totalTime.match(/(\d+)/);
      if (totalMatch) extracted.totalTime = parseInt(totalMatch[1]);
    }

    // Extract servings
    if (recipeData.recipeYield) {
      if (typeof recipeData.recipeYield === 'number') {
        extracted.servings = recipeData.recipeYield;
      } else if (typeof recipeData.recipeYield === 'string') {
        const servings = this.extractServingsFromText(recipeData.recipeYield);
        if (servings) extracted.servings = servings;
      }
    }

    // Extract image
    if (recipeData.image) {
      if (typeof recipeData.image === 'string') {
        extracted.imageUrl = recipeData.image;
      } else if (recipeData.image.url) {
        extracted.imageUrl = recipeData.image.url;
      } else if (Array.isArray(recipeData.image) && recipeData.image[0]) {
        extracted.imageUrl = typeof recipeData.image[0] === 'string' 
          ? recipeData.image[0] 
          : recipeData.image[0].url;
      }
    }

    return extracted;
  }

  private static extractFromHtml(html: string): Partial<ExtractedRecipe> {
    const root = parse(html);
    const extracted: Partial<ExtractedRecipe> = {};

    // Try to extract title
    const titleSelectors = [
      'h1[class*="recipe"]',
      'h1[class*="title"]',
      '.recipe-title h1',
      '.recipe-header h1',
      'h1'
    ];

    for (const selector of titleSelectors) {
      const element = root.querySelector(selector);
      if (element && element.innerText) {
        extracted.title = this.cleanText(element.innerText);
        break;
      }
    }

    // Try to extract ingredients
    const ingredientSelectors = [
      '.recipe-ingredients li',
      '.ingredients li',
      '[class*="ingredient"] li',
      'ul[class*="ingredient"] li',
      '.recipe-ingredient',
    ];

    for (const selector of ingredientSelectors) {
      const elements = root.querySelectorAll(selector);
      if (elements.length > 0) {
        extracted.ingredients = elements
          .map(el => this.cleanText(el.innerText))
          .filter(text => text.length > 2);
        break;
      }
    }

    // Try to extract instructions
    const instructionSelectors = [
      '.recipe-instructions li',
      '.instructions li',
      '.recipe-method li',
      '.method li',
      '[class*="instruction"] li',
      '.recipe-step',
      '.step'
    ];

    for (const selector of instructionSelectors) {
      const elements = root.querySelectorAll(selector);
      if (elements.length > 0) {
        extracted.instructions = elements
          .map(el => this.cleanText(el.innerText))
          .filter(text => text.length > 5);
        break;
      }
    }

    // Try to extract times and servings from various text elements
    const metaSelectors = [
      '.recipe-meta',
      '.recipe-info',
      '.prep-time',
      '.cook-time',
      '.servings',
      '.yield'
    ];

    metaSelectors.forEach(selector => {
      const elements = root.querySelectorAll(selector);
      elements.forEach(element => {
        const text = element.innerText;
        if (text.toLowerCase().includes('prep')) {
          const time = this.extractTimeFromText(text);
          if (time && !extracted.prepTime) extracted.prepTime = time;
        }
        if (text.toLowerCase().includes('cook')) {
          const time = this.extractTimeFromText(text);
          if (time && !extracted.cookTime) extracted.cookTime = time;
        }
        const servings = this.extractServingsFromText(text);
        if (servings && !extracted.servings) extracted.servings = servings;
      });
    });

    // Try to extract main image
    const imageSelectors = [
      '.recipe-image img',
      '.recipe-photo img',
      'img[class*="recipe"]',
      'img[class*="hero"]'
    ];

    for (const selector of imageSelectors) {
      const img = root.querySelector(selector);
      if (img && img.getAttribute('src')) {
        extracted.imageUrl = img.getAttribute('src');
        break;
      }
    }

    return extracted;
  }

  private static generateMarkdown(extracted: ExtractedRecipe): string {
    let markdown = `# ${extracted.title}\n\n`;

    if (extracted.description) {
      markdown += `${extracted.description}\n\n`;
    }

    // Add metadata
    const meta = [];
    if (extracted.prepTime) meta.push(`⏱️ **Préparation**: ${extracted.prepTime} min`);
    if (extracted.cookTime) meta.push(`🔥 **Cuisson**: ${extracted.cookTime} min`);
    if (extracted.servings) meta.push(`👥 **Portions**: ${extracted.servings} personnes`);

    if (meta.length > 0) {
      markdown += `${meta.join(' • ')}\n\n`;
    }

    // Add instructions (ingredients are handled separately)
    if (extracted.instructions && extracted.instructions.length > 0) {
      markdown += `## Instructions\n\n`;
      extracted.instructions.forEach((instruction, index) => {
        markdown += `${index + 1}. **Étape ${index + 1}**: ${instruction}\n\n`;
      });
    }

    // Add notes section
    markdown += `## Notes\n\nAjoutez ici vos notes personnelles, astuces ou variations de la recette.\n\n`;

    return markdown;
  }

  static async extractFromUrl(url: string): Promise<ExtractedRecipe> {
    try {
      // Fetch the webpage
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();

      // Try JSON-LD first (most reliable)
      const jsonLdData = this.extractJsonLd(html);
      let extracted = this.extractFromJsonLd(jsonLdData);

      // If JSON-LD extraction didn't work well, try HTML parsing
      if (!extracted || !extracted.title || !extracted.ingredients) {
        const htmlExtracted = this.extractFromHtml(html);
        extracted = { ...htmlExtracted, ...extracted };
      }

      // Ensure we have at least a title
      if (!extracted.title) {
        const root = parse(html);
        const titleTag = root.querySelector('title');
        extracted.title = titleTag ? this.cleanText(titleTag.innerText) : 'Recette importée';
      }

      // Create the final recipe object
      const recipe: ExtractedRecipe = {
        title: extracted.title || 'Recette importée',
        description: extracted.description,
        ingredients: extracted.ingredients || [],
        parsedIngredients: [],
        instructions: extracted.instructions || [],
        prepTime: extracted.prepTime,
        cookTime: extracted.cookTime,
        servings: extracted.servings,
        imageUrl: extracted.imageUrl,
        sourceUrl: url,
        markdown: ''
      };

      // Parse ingredients into structured format
      if (recipe.ingredients.length > 0) {
        recipe.parsedIngredients = IngredientParser.parseIngredientList(recipe.ingredients);
      }

      // Generate markdown
      recipe.markdown = this.generateMarkdown(recipe);

      return recipe;

    } catch (error) {
      console.error('Recipe extraction error:', error);
      throw new Error(`Impossible d'extraire la recette: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }
}