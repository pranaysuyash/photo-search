/**
 * Advanced Query Parser for Boolean and Context-Aware Search
 * Handles complex queries like "beach NOT night", "dogs OR cats", etc.
 */

export interface QueryToken {
  text: string;
  type: 'keyword' | 'include' | 'exclude' | 'operator' | 'group';
  weight?: number;
  position: number;
  originalCase: string;
}

export interface BooleanExpression {
  type: 'AND' | 'OR' | 'NOT';
  operands: (BooleanExpression | QueryToken)[];
  weight?: number;
}

export interface QueryContext {
  timeContext?: 'day' | 'night' | 'sunset' | 'golden_hour' | 'dawn' | 'dusk';
  seasonContext?: 'spring' | 'summer' | 'fall' | 'winter';
  locationContext?: 'indoor' | 'outdoor' | 'urban' | 'nature' | 'water';
  activityContext?: 'portrait' | 'landscape' | 'action' | 'still_life' | 'event';
  qualityContext?: 'professional' | 'casual' | 'snapshot' | 'artistic';
  moodContext?: 'happy' | 'sad' | 'peaceful' | 'energetic' | 'dramatic';
}

export interface ParsedQuery {
  original: string;
  tokens: QueryToken[];
  booleanExpression?: BooleanExpression;
  context: QueryContext;
  expansions: string[];
  exclusions: string[];
  hasBooleanLogic: boolean;
  complexity: 'simple' | 'moderate' | 'complex';
}

export class AdvancedQueryParser {
  // Boolean operators and their variations
  private static readonly BOOLEAN_OPERATORS = {
    AND: ['and', '&', '+', 'plus'],
    OR: ['or', '|', ',', 'or'],
    NOT: ['not', 'without', 'excluding', '-', 'minus', 'except']
  };

  // Context keyword mappings
  private static readonly CONTEXT_KEYWORDS = {
    time: {
      day: ['day', 'daytime', 'daylight', 'morning', 'afternoon'],
      night: ['night', 'nighttime', 'evening', 'dark'],
      sunset: ['sunset', 'dusk', 'golden', 'golden hour'],
      dawn: ['dawn', 'sunrise', 'morning light']
    },
    season: {
      spring: ['spring', 'springtime'],
      summer: ['summer', 'summertime'],
      fall: ['fall', 'autumn'],
      winter: ['winter', 'wintertime']
    },
    location: {
      indoor: ['indoor', 'inside', 'interior'],
      outdoor: ['outdoor', 'outside', 'exterior'],
      urban: ['city', 'urban', 'street', 'buildings'],
      nature: ['nature', 'natural', 'forest', 'mountains', 'park'],
      water: ['water', 'beach', 'ocean', 'lake', 'river', 'sea']
    },
    activity: {
      portrait: ['portrait', 'person', 'people', 'face', 'headshot'],
      landscape: ['landscape', 'scenery', 'vista', 'panorama'],
      action: ['action', 'sports', 'movement', 'activity', 'hiking'],
      still_life: ['still life', 'object', 'food', 'product'],
      event: ['event', 'party', 'celebration', 'wedding', 'birthday']
    },
    quality: {
      professional: ['professional', 'pro', 'studio', 'high quality', 'artistic'],
      casual: ['casual', 'snapshot', 'quick', 'candid'],
      snapshot: ['snapshot', 'quick', 'candid', 'informal'],
      artistic: ['artistic', 'creative', 'fine art', 'dramatic']
    },
    mood: {
      happy: ['happy', 'joy', 'cheerful', 'smile', 'fun'],
      sad: ['sad', 'somber', 'melancholy', 'serious'],
      peaceful: ['peaceful', 'calm', 'serene', 'quiet', 'tranquil'],
      energetic: ['energetic', 'dynamic', 'lively', 'exciting'],
      dramatic: ['dramatic', 'intense', 'bold', 'striking']
    }
  };

  /**
   * Parse a natural language query into structured components
   */
  static parse(query: string): ParsedQuery {
    const normalized = query.toLowerCase().trim();
    const tokens = this.tokenize(normalized, query);
    const context = this.extractContext(tokens);
    const booleanExpression = this.parseBooleanExpression(tokens);
    const expansions = this.generateExpansions(tokens);
    const exclusions = this.extractExclusions(tokens);
    const complexity = this.assessComplexity(tokens, booleanExpression);

    return {
      original: query,
      tokens,
      booleanExpression,
      context,
      expansions,
      exclusions,
      hasBooleanLogic: booleanExpression !== undefined,
      complexity
    };
  }

  /**
   * Tokenize the query into meaningful components
   */
  private static tokenize(normalized: string, original: string): QueryToken[] {
    const tokens: QueryToken[] = [];

    // Split by whitespace but preserve quoted phrases
    const regex = /("([^"]*)"|'([^']*)'|([^\s"]+))/g;
    let match;
    let position = 0;

    while ((match = regex.exec(normalized)) !== null) {
      const fullMatch = match[0];
      const quotedContent = match[2] || match[3]; // Content inside quotes
      const unquoted = match[4]; // Unquoted content

      const text = quotedContent || unquoted;
      if (!text) continue;

      // Handle special case for exclude operator at start of token
      if (text.startsWith('-') && text.length > 1) {
        // Split into exclude operator and keyword
        const operatorToken = {
          text: '-',
          type: 'exclude' as const,
          position,
          originalCase: '-'
        };
        const keywordToken = {
          text: text.substring(1).toLowerCase(),
          type: 'keyword' as const,
          position: position + 1,
          originalCase: text.substring(1)
        };
        tokens.push(operatorToken);
        tokens.push(keywordToken);
        position += 2;
        continue;
      }

      // Determine token type
      let type: QueryToken['type'] = 'keyword';

      if (AdvancedQueryParser.isBooleanOperator(text)) {
        type = 'operator';
      } else if (AdvancedQueryParser.isExcludeOperator(text)) {
        type = 'exclude';
      } else if (AdvancedQueryParser.isIncludeOperator(text)) {
        type = 'include';
      } else if (text === '(' || text === ')') {
        type = 'group';
      }

      // Find original case for this token
      const originalTokens = original.match(/("([^"]*)"|'([^']*)'|([^\s"]+))/g) || [];
      const originalToken = originalTokens[position] || fullMatch;

      tokens.push({
        text: text.toLowerCase(),
        type,
        position,
        originalCase: originalToken.replace(/['"]/g, '')
      });

      position++;
    }

    return tokens;
  }

  /**
   * Extract contextual information from query tokens
   */
  private static extractContext(tokens: QueryToken[]): QueryContext {
    const context: QueryContext = {};
    const tokenTexts = tokens.map(t => t.text);

    // Check for time context
    for (const [timeKey, keywords] of Object.entries(this.CONTEXT_KEYWORDS.time)) {
      if (keywords.some(kw => tokenTexts.includes(kw))) {
        context.timeContext = timeKey as QueryContext['timeContext'];
        break;
      }
    }

    // Check for season context
    for (const [seasonKey, keywords] of Object.entries(this.CONTEXT_KEYWORDS.season)) {
      if (keywords.some(kw => tokenTexts.includes(kw))) {
        context.seasonContext = seasonKey as QueryContext['seasonContext'];
        break;
      }
    }

    // Check for location context
    for (const [locationKey, keywords] of Object.entries(this.CONTEXT_KEYWORDS.location)) {
      if (keywords.some(kw => tokenTexts.some(token => token.includes(kw)))) {
        context.locationContext = locationKey as QueryContext['locationContext'];
        break;
      }
    }

    // Check for activity context
    for (const [activityKey, keywords] of Object.entries(this.CONTEXT_KEYWORDS.activity)) {
      if (keywords.some(kw => tokenTexts.some(token => token.includes(kw)))) {
        context.activityContext = activityKey as QueryContext['activityContext'];
        break;
      }
    }

    // Check for quality context
    for (const [qualityKey, keywords] of Object.entries(this.CONTEXT_KEYWORDS.quality)) {
      if (keywords.some(kw => tokenTexts.some(token => token.includes(kw)))) {
        context.qualityContext = qualityKey as QueryContext['qualityContext'];
        break;
      }
    }

    // Check for mood context
    for (const [moodKey, keywords] of Object.entries(this.CONTEXT_KEYWORDS.mood)) {
      if (keywords.some(kw => tokenTexts.some(token => token.includes(kw)))) {
        context.moodContext = moodKey as QueryContext['moodContext'];
        break;
      }
    }

    return context;
  }

  /**
   * Parse boolean expressions from tokens
   */
  private static parseBooleanExpression(tokens: QueryToken[]): BooleanExpression | undefined {
    if (tokens.length === 0) return undefined;

    // Simple case: no boolean operators, just keywords - return undefined (no boolean logic)
    if (!tokens.some(t => t.type === 'operator' || t.type === 'exclude')) {
      return undefined;
    }

    // Complex boolean parsing
    return this.parseComplexBoolean(tokens);
  }

  /**
   * Parse complex boolean expressions with proper operator precedence
   */
  private static parseComplexBoolean(tokens: QueryToken[]): BooleanExpression {
    // Convert to Reverse Polish Notation for proper precedence
    const rpn = this.shuntingYard(tokens);
    return this.evaluateRPN(rpn);
  }

  /**
   * Shunting Yard algorithm for operator precedence
   */
  private static shuntingYard(tokens: QueryToken[]): QueryToken[] {
    const output: QueryToken[] = [];
    const operators: QueryToken[] = [];

    const precedence = { 'NOT': 3, 'AND': 2, 'OR': 1 };
    const associativity = { 'NOT': 'right', 'AND': 'left', 'OR': 'left' };

    for (const token of tokens) {
      if (token.type === 'keyword' || token.type === 'include' || token.type === 'exclude') {
        output.push(token);
      } else if (token.type === 'operator' || token.type === 'exclude') {
        const opType = this.getOperatorType(token.text);
        while (
          operators.length > 0 &&
          operators[operators.length - 1].type !== 'group' &&
          (
            precedence[operators[operators.length - 1].text as keyof typeof precedence] > precedence[opType] ||
            (
              precedence[operators[operators.length - 1].text as keyof typeof precedence] === precedence[opType] &&
              associativity[opType] === 'left'
            )
          )
        ) {
          output.push(operators.pop()!);
        }
        operators.push({ ...token, text: opType });
      } else if (token.text === '(') {
        operators.push(token);
      } else if (token.text === ')') {
        while (operators.length > 0 && operators[operators.length - 1].text !== '(') {
          output.push(operators.pop()!);
        }
        if (operators.length > 0) {
          operators.pop(); // Remove '('
        }
      }
    }

    while (operators.length > 0) {
      output.push(operators.pop()!);
    }

    return output;
  }

  /**
   * Evaluate RPN to build boolean expression tree
   */
  private static evaluateRPN(rpn: QueryToken[]): BooleanExpression {
    const stack: (BooleanExpression | QueryToken)[] = [];

    for (const token of rpn) {
      if (token.type === 'keyword' || token.type === 'include' || token.type === 'exclude') {
        stack.push(token);
      } else if (token.type === 'operator') {
        const operand2 = stack.pop();
        const operand1 = stack.pop();

        if (operand1 && operand2) {
          stack.push({
            type: token.text as BooleanExpression['type'],
            operands: [operand1, operand2],
            weight: 1.0
          });
        } else if (operand1) {
          // Unary NOT
          stack.push({
            type: 'NOT',
            operands: [operand1],
            weight: 1.0
          });
        }
      }
    }

    if (stack.length === 1 && this.isBooleanExpression(stack[0])) {
      return stack[0] as BooleanExpression;
    }

    // Fallback to AND of all terms
    return {
      type: 'AND',
      operands: stack.filter(t => t.type === 'keyword' || t.type === 'include'),
      weight: 1.0
    };
  }

  /**
   * Generate query expansions using synonyms and related terms
   */
  private static generateExpansions(tokens: QueryToken[]): string[] {
    const expansions: string[] = [];
    const keywords = tokens.filter(t => t.type === 'keyword' || t.type === 'include');

    for (const token of keywords) {
      // Add context-aware expansions
      if (token.text === 'dog') {
        expansions.push('puppy', 'canine', 'pet');
      } else if (token.text === 'cat') {
        expansions.push('kitten', 'feline', 'pet');
      } else if (token.text === 'beach') {
        expansions.push('coast', 'shore', 'ocean', 'sea');
      } else if (token.text === 'mountain') {
        expansions.push('mountains', 'hiking', 'peak');
      }
    }

    return [...new Set(expansions)]; // Remove duplicates
  }

  /**
   * Extract exclusion terms from the query
   */
  private static extractExclusions(tokens: QueryToken[]): string[] {
    const exclusions: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Handle NOT operator and synonyms
      if (token.type === 'operator' && (token.text === 'NOT' || token.text === 'not' || token.text === 'without' || token.text === 'excluding') && i + 1 < tokens.length) {
        const nextToken = tokens[i + 1];
        if (nextToken.type === 'keyword' || nextToken.type === 'include') {
          exclusions.push(nextToken.text);
          i++; // Skip the next token since we've processed it
        }
      }
      // Handle exclude operators (-)
      else if (token.type === 'exclude' && i + 1 < tokens.length) {
        const nextToken = tokens[i + 1];
        if (nextToken.type === 'keyword' || nextToken.type === 'include') {
          exclusions.push(nextToken.text);
          i++; // Skip the next token since we've processed it
        }
      }
      // Handle standalone exclude tokens with content
      else if (token.type === 'exclude' && token.text.length > 1) {
        // Handle cases like "-night" where the exclude token directly contains the term
        const cleanText = token.text.replace(/^[^a-zA-Z0-9]+/, '');
        if (cleanText) {
          exclusions.push(cleanText);
        }
      }
    }

    return exclusions;
  }

  /**
   * Assess query complexity
   */
  private static assessComplexity(tokens: QueryToken[], expression?: BooleanExpression): ParsedQuery['complexity'] {
    const operatorCount = tokens.filter(t => t.type === 'operator').length;
    const excludeCount = tokens.filter(t => t.type === 'exclude').length;
    const groupCount = tokens.filter(t => t.type === 'group').length;

    if (operatorCount === 0 && excludeCount === 0 && groupCount === 0) {
      return 'simple';
    } else if (operatorCount <= 2 && excludeCount <= 1 && groupCount <= 2) {
      return 'moderate';
    } else {
      return 'complex';
    }
  }

  // Helper methods
  private static isBooleanOperator(text: string): boolean {
    return Object.values(this.BOOLEAN_OPERATORS).flat().includes(text);
  }

  private static isExcludeOperator(text: string): boolean {
    return this.BOOLEAN_OPERATORS.NOT.includes(text);
  }

  private static isIncludeOperator(text: string): boolean {
    return text === '+' || text === 'include';
  }

  private static getOperatorType(text: string): 'AND' | 'OR' | 'NOT' {
    if (this.BOOLEAN_OPERATORS.NOT.includes(text)) return 'NOT';
    if (this.BOOLEAN_OPERATORS.AND.includes(text)) return 'AND';
    if (this.BOOLEAN_OPERATORS.OR.includes(text)) return 'OR';
    return 'AND'; // Default
  }

  private static isBooleanExpression(obj: any): obj is BooleanExpression {
    return obj && typeof obj === 'object' && 'type' in obj && 'operands' in obj;
  }

  /**
   * Convert boolean expression back to search query string
   */
  static expressionToString(expression: BooleanExpression): string {
    if (expression.operands.length === 0) return '';

    if (expression.operands.length === 1) {
      const operand = expression.operands[0];
      if (this.isBooleanExpression(operand)) {
        return this.expressionToString(operand);
      } else {
        if (expression.type === 'NOT') {
          return `-${operand.text}`;
        }
        return operand.type === 'exclude' ? `-${operand.text}` : operand.text;
      }
    }

    const parts = expression.operands.map(operand => {
      if (this.isBooleanExpression(operand)) {
        return `(${this.expressionToString(operand)})`;
      } else {
        if (expression.type === 'NOT') {
          return `-${operand.text}`;
        }
        return operand.type === 'exclude' ? `-${operand.text}` : operand.text;
      }
    });

    return parts.join(` ${expression.type} `);
  }

  /**
   * Get search suggestions based on partial query
   */
  static getSuggestions(partialQuery: string, availableTags: string[]): string[] {
    const suggestions: string[] = [];
    const normalized = partialQuery.toLowerCase().trim();

    if (normalized.length === 0) return availableTags.slice(0, 10);

    // Filter available tags that match partial query
    const matchingTags = availableTags.filter(tag =>
      tag.toLowerCase().includes(normalized)
    );

    // Add boolean operator suggestions
    if (!this.isBooleanOperator(normalized)) {
      const lastWord = normalized.split(' ').pop() || '';
      if (lastWord && !this.isBooleanOperator(lastWord)) {
        suggestions.push(`${partialQuery} AND`);
        suggestions.push(`${partialQuery} OR`);
        suggestions.push(`${partialQuery} NOT`);
      }
    }

    return [...suggestions, ...matchingTags.slice(0, 10)];
  }
}

export default AdvancedQueryParser;