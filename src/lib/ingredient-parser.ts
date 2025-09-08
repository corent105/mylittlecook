export interface ParsedIngredient {
  quantity: number;
  unit: string;
  name: string;
  notes?: string;
  category?: string;
}

export class IngredientParser {
  // Common units in French and English
  private static readonly UNITS = {
    // Volume
    'ml': 'ml',
    'millilitre': 'ml',
    'millilitres': 'ml',
    'cl': 'cl',
    'centilitre': 'cl',
    'centilitres': 'cl',
    'dl': 'dl',
    'décilitre': 'dl',
    'décilitres': 'dl',
    'l': 'l',
    'litre': 'l',
    'litres': 'l',
    'tasse': 'tasse',
    'tasses': 'tasse',
    'cup': 'tasse',
    'cups': 'tasse',
    'cuillère à café': 'c. à café',
    'cuillères à café': 'c. à café',
    'c. à café': 'c. à café',
    'cac': 'c. à café',
    'tsp': 'c. à café',
    'teaspoon': 'c. à café',
    'teaspoons': 'c. à café',
    'cuillère à soupe': 'c. à soupe',
    'cuillères à soupe': 'c. à soupe',
    'c. à soupe': 'c. à soupe',
    'cas': 'c. à soupe',
    'tbsp': 'c. à soupe',
    'tablespoon': 'c. à soupe',
    'tablespoons': 'c. à soupe',

    // Weight
    'g': 'g',
    'gramme': 'g',
    'grammes': 'g',
    'gr': 'g',
    'kg': 'kg',
    'kilogramme': 'kg',
    'kilogrammes': 'kg',
    'oz': 'oz',
    'ounce': 'oz',
    'ounces': 'oz',
    'lb': 'lb',
    'pound': 'lb',
    'pounds': 'lb',

    // Pieces
    'pièce': 'pièce',
    'pièces': 'pièce',
    'pc': 'pièce',
    'piece': 'pièce',
    'pieces': 'pièce',
    'unité': 'pièce',
    'unités': 'pièce',
    'item': 'pièce',
    'items': 'pièce',

    // Special measures
    'pincée': 'pincée',
    'pincées': 'pincée',
    'pinch': 'pincée',
    'poignée': 'poignée',
    'poignées': 'poignée',
    'handful': 'poignée',
    'tranche': 'tranche',
    'tranches': 'tranche',
    'slice': 'tranche',
    'slices': 'tranche',
    'gousse': 'gousse',
    'gousses': 'gousse',
    'clove': 'gousse',
    'cloves': 'gousse',
    'feuille': 'feuille',
    'feuilles': 'feuille',
    'leaf': 'feuille',
    'leaves': 'feuille',
    'botte': 'botte',
    'bottes': 'botte',
    'bunch': 'botte',
    'bunches': 'botte',
    'brin': 'brin',
    'brins': 'brin',
    'sprig': 'brin',
    'sprigs': 'brin',
  };

  // Common ingredient categories
  private static readonly CATEGORIES = {
    // Légumes
    'légumes': ['tomate', 'tomates', 'oignon', 'oignons', 'carotte', 'carottes', 'poivron', 'poivrons', 'courgette', 'courgettes', 'aubergine', 'aubergines', 'pomme de terre', 'pommes de terre', 'patate', 'patates', 'champignon', 'champignons', 'épinards', 'salade', 'laitue', 'concombre', 'radis', 'navet', 'chou', 'brocoli', 'chou-fleur', 'haricot', 'haricots', 'petit pois', 'petits pois', 'artichaut', 'asperge', 'asperges'],
    
    // Fruits
    'fruits': ['pomme', 'pommes', 'poire', 'poires', 'banane', 'bananes', 'orange', 'oranges', 'citron', 'citrons', 'lime', 'limes', 'fraise', 'fraises', 'cerise', 'cerises', 'pêche', 'pêches', 'abricot', 'abricots', 'prune', 'prunes', 'raisin', 'raisins', 'melon', 'pastèque', 'ananas', 'kiwi', 'mangue', 'avocat', 'avocats'],
    
    // Viandes
    'viandes': ['bœuf', 'porc', 'agneau', 'veau', 'poulet', 'poule', 'canard', 'dinde', 'lapin', 'jambon', 'lard', 'bacon', 'saucisse', 'saucisses', 'merguez', 'chorizo', 'steak', 'escalope', 'côte', 'côtes', 'rôti'],
    
    // Poissons
    'poissons': ['saumon', 'thon', 'cabillaud', 'morue', 'sole', 'truite', 'bar', 'dorade', 'sardine', 'sardines', 'anchois', 'maquereau', 'hareng', 'crevette', 'crevettes', 'moule', 'moules', 'huître', 'huîtres', 'crabe', 'homard', 'calamar'],
    
    // Produits laitiers
    'produits laitiers': ['lait', 'crème', 'beurre', 'fromage', 'yaourt', 'yogourt', 'fromage blanc', 'mascarpone', 'ricotta', 'mozzarella', 'gruyère', 'emmental', 'parmesan', 'chèvre', 'roquefort', 'camembert', 'brie'],
    
    // Céréales et féculents
    'céréales': ['farine', 'riz', 'pâtes', 'spaghetti', 'macaroni', 'quinoa', 'boulgour', 'semoule', 'avoine', 'orge', 'blé', 'pain', 'biscottes', 'céréales'],
    
    // Épices et herbes
    'épices': ['sel', 'poivre', 'paprika', 'cumin', 'curry', 'thym', 'romarin', 'basilic', 'persil', 'ciboulette', 'origan', 'laurier', 'cannelle', 'vanille', 'gingembre', 'ail', 'échalote', 'moutarde'],
    
    // Huiles et condiments
    'condiments': ['huile', "huile d'olive", 'vinaigre', 'moutarde', 'mayonnaise', 'ketchup', 'sauce soja', 'tabasco', 'worcestershire'],
    
    // Autres
    'autres': ['œuf', 'œufs', 'sucre', 'miel', 'levure', 'bicarbonate', 'gélatine', 'chocolat', 'cacao', 'café', 'thé', 'eau']
  };

  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/['']/g, "'")  // Normalize apostrophes
      .replace(/\s+/g, ' ');  // Normalize spaces
  }

  private static parseQuantity(text: string): { quantity: number; remaining: string } {
    const normalized = this.normalizeText(text);
    
    // Pattern for numbers (including fractions, decimals, and mixed numbers)
    const patterns = [
      // Mixed numbers like "1 1/2", "2 3/4"
      /^(\d+)\s+(\d+)\/(\d+)/,
      // Fractions like "1/2", "3/4"
      /^(\d+)\/(\d+)/,
      // Decimals like "1.5", "2,5" (French decimal)
      /^(\d+)[.,](\d+)/,
      // Whole numbers
      /^(\d+)/,
      // Words for small quantities
      /^(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)/
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        let quantity: number;
        let remaining = normalized.replace(pattern, '').trim();

        if (match[0].includes('/')) {
          // Handle fractions
          if (match[2] && match[3]) {
            // Mixed number (e.g., "1 1/2")
            quantity = parseInt(match[1]) + parseInt(match[2]) / parseInt(match[3]);
          } else {
            // Simple fraction (e.g., "1/2")
            quantity = parseInt(match[1]) / parseInt(match[2]);
          }
        } else if (match[0].includes('.') || match[0].includes(',')) {
          // Handle decimals
          quantity = parseFloat(match[0].replace(',', '.'));
        } else if (match[1] && /^\d+$/.test(match[1])) {
          // Handle whole numbers
          quantity = parseInt(match[1]);
        } else {
          // Handle word numbers
          const wordNumbers: { [key: string]: number } = {
            'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4,
            'cinq': 5, 'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10
          };
          quantity = wordNumbers[match[1]] || 1;
        }

        return { quantity, remaining };
      }
    }

    return { quantity: 1, remaining: normalized };
  }

  private static parseUnit(text: string): { unit: string; remaining: string } {
    const normalized = this.normalizeText(text);
    
    // Try to find a unit at the beginning of the text
    for (const [unitVariation, standardUnit] of Object.entries(this.UNITS)) {
      const pattern = new RegExp(`^${unitVariation}\\b`, 'i');
      if (pattern.test(normalized)) {
        const remaining = normalized.replace(pattern, '').trim();
        return { unit: standardUnit, remaining };
      }
    }

    return { unit: 'pièce', remaining: normalized };
  }

  private static extractNotes(text: string): { cleanText: string; notes?: string } {
    const normalized = text.trim();
    
    // Extract parentheses content as notes
    const parenthesesMatch = normalized.match(/^(.*?)\s*\(([^)]+)\)\s*(.*)$/);
    if (parenthesesMatch) {
      const [, before, notes, after] = parenthesesMatch;
      return {
        cleanText: (before + ' ' + after).trim(),
        notes: notes.trim()
      };
    }

    // Extract comma-separated notes at the end
    const commaMatch = normalized.match(/^(.*?),\s*([^,]+)$/);
    if (commaMatch) {
      const [, main, possibleNote] = commaMatch;
      // Check if the part after comma looks like a preparation note
      if (/\b(haché|râpé|coupé|tranché|émincé|en dés|en rondelles|finement|grossièrement)\b/i.test(possibleNote)) {
        return {
          cleanText: main.trim(),
          notes: possibleNote.trim()
        };
      }
    }

    return { cleanText: normalized };
  }

  private static categorizeIngredient(name: string): string {
    const normalized = this.normalizeText(name);
    
    for (const [category, ingredients] of Object.entries(this.CATEGORIES)) {
      for (const ingredient of ingredients) {
        if (normalized.includes(ingredient)) {
          return category;
        }
      }
    }
    
    return 'autres';
  }

  static parseIngredient(ingredientText: string): ParsedIngredient {
    let text = this.normalizeText(ingredientText);
    
    // Remove leading dashes, bullets, or checkboxes
    text = text.replace(/^[-•*\s]*(\[[x\s]\])?\s*/, '');
    
    // Parse quantity
    const { quantity, remaining: afterQuantity } = this.parseQuantity(text);
    
    // Parse unit
    const { unit, remaining: afterUnit } = this.parseUnit(afterQuantity);
    
    // Extract notes and clean the ingredient name
    const { cleanText: ingredientName, notes } = this.extractNotes(afterUnit);
    
    // Remove common connecting words
    const cleanName = ingredientName
      .replace(/^(de|d'|du|des|la|le|les|un|une)\s+/i, '')
      .trim();

    // Categorize the ingredient
    const category = this.categorizeIngredient(cleanName);

    return {
      quantity,
      unit,
      name: cleanName,
      notes,
      category
    };
  }

  static parseIngredientList(ingredients: string[]): ParsedIngredient[] {
    return ingredients
      .filter(ingredient => ingredient.trim().length > 0)
      .map(ingredient => this.parseIngredient(ingredient));
  }
}