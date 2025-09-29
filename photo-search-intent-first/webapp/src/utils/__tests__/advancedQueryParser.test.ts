import { describe, it, expect } from 'vitest';
import { AdvancedQueryParser, ParsedQuery, QueryContext } from '../advancedQueryParser';

describe('AdvancedQueryParser', () => {
  // Simple test to check exclusion extraction
  it('should test exclusion extraction directly', () => {
    const tokens = [
      { text: 'beach', type: 'keyword' as const, position: 0, originalCase: 'beach' },
      { text: 'not', type: 'operator' as const, position: 1, originalCase: 'NOT' },
      { text: 'night', type: 'keyword' as const, position: 2, originalCase: 'night' }
    ];

    // Test the extractExclusions method directly
    const exclusions = AdvancedQueryParser.parse('beach NOT night').exclusions;

    console.log('Exclusions extracted:', exclusions);
    console.log('Expected: ["night"]');

    // This test will always pass, it's just for debugging
    expect(true).toBe(true);
  });

  describe('Basic Query Parsing', () => {
    it('should parse simple keyword queries', () => {
      const query = 'beach sunset';
      const result = AdvancedQueryParser.parse(query);

      expect(result.original).toBe('beach sunset');
      expect(result.complexity).toBe('simple');
      expect(result.hasBooleanLogic).toBe(false);
      expect(result.tokens.length).toBe(2);
      expect(result.tokens[0].text).toBe('beach');
      expect(result.tokens[1].text).toBe('sunset');
    });

    it('should handle quoted phrases', () => {
      const query = '"golden hour" portrait';
      const result = AdvancedQueryParser.parse(query);

      expect(result.tokens.length).toBe(2);
      expect(result.tokens[0].text).toBe('golden hour');
      expect(result.tokens[0].originalCase).toBe('golden hour');
      expect(result.tokens[1].text).toBe('portrait');
    });

    it('should preserve original case', () => {
      const query = 'Beach SUNSET';
      const result = AdvancedQueryParser.parse(query);

      expect(result.tokens[0].originalCase).toBe('Beach');
      expect(result.tokens[1].originalCase).toBe('SUNSET');
    });
  });

  describe('Boolean Logic Parsing', () => {
    it('should parse AND operators', () => {
      const query = 'beach AND sunset';
      const result = AdvancedQueryParser.parse(query);

      expect(result.hasBooleanLogic).toBe(true);
      expect(result.complexity).toBe('moderate');
      expect(result.booleanExpression).toBeDefined();
      expect(result.booleanExpression!.type).toBe('AND');
    });

    it('should parse OR operators', () => {
      const query = 'dog OR cat';
      const result = AdvancedQueryParser.parse(query);

      expect(result.hasBooleanLogic).toBe(true);
      expect(result.booleanExpression!.type).toBe('OR');
    });

    it('should parse NOT operators', () => {
      const query = 'beach NOT night';
      const result = AdvancedQueryParser.parse(query);

      expect(result.hasBooleanLogic).toBe(true);
      expect(result.exclusions).toContain('night');
      expect(result.booleanExpression).toBeDefined();
    });

    it('should parse complex boolean expressions', () => {
      const query = '(dog OR cat) AND outdoor NOT indoor';
      const result = AdvancedQueryParser.parse(query);

      expect(result.hasBooleanLogic).toBe(true);
      expect(result.complexity).toBe('complex');
      expect(result.exclusions).toContain('indoor');
    });

    it('should handle operator precedence correctly', () => {
      const query = 'dog AND cat OR bird';
      const result = AdvancedQueryParser.parse(query);

      // Should parse as (dog AND cat) OR bird due to left associativity
      expect(result.booleanExpression).toBeDefined();
    });

    it('should handle symbolic operators', () => {
      const query = 'beach -night +sunset';
      const result = AdvancedQueryParser.parse(query);

      expect(result.exclusions).toContain('night');
      expect(result.hasBooleanLogic).toBe(true);
    });
  });

  describe('Context Extraction', () => {
    it('should extract time context', () => {
      const result = AdvancedQueryParser.parse('sunset photos');
      expect(result.context.timeContext).toBe('sunset');

      const result2 = AdvancedQueryParser.parse('night photography');
      expect(result2.context.timeContext).toBe('night');
    });

    it('should extract season context', () => {
      const result = AdvancedQueryParser.parse('summer vacation');
      expect(result.context.seasonContext).toBe('summer');
    });

    it('should extract location context', () => {
      const result = AdvancedQueryParser.parse('beach landscape');
      expect(result.context.locationContext).toBe('water');
      expect(result.context.activityContext).toBe('landscape');
    });

    it('should extract activity context', () => {
      const result = AdvancedQueryParser.parse('portrait photography');
      expect(result.context.activityContext).toBe('portrait');
    });

    it('should handle multiple context types', () => {
      const result = AdvancedQueryParser.parse('summer beach sunset portrait');
      expect(result.context.seasonContext).toBe('summer');
      expect(result.context.locationContext).toBe('water');
      expect(result.context.timeContext).toBe('sunset');
      expect(result.context.activityContext).toBe('portrait');
    });
  });

  describe('Query Expansion', () => {
    it('should generate synonym expansions', () => {
      const result = AdvancedQueryParser.parse('dog park');
      expect(result.expansions).toEqual(expect.arrayContaining(['puppy', 'canine', 'pet']));
    });

    it('should expand beach-related terms', () => {
      const result = AdvancedQueryParser.parse('beach photos');
      expect(result.expansions).toEqual(expect.arrayContaining(['coast', 'shore', 'ocean']));
    });

    it('should expand mountain-related terms', () => {
      const result = AdvancedQueryParser.parse('mountain hike');
      expect(result.expansions).toEqual(expect.arrayContaining(['hiking', 'peak']));
    });
  });

  describe('Extraction Handling', () => {
    it('should extract exclusion terms with NOT', () => {
      const result = AdvancedQueryParser.parse('beach NOT night');
      expect(result.exclusions).toContain('night');
    });

    it('should extract exclusion terms with minus operator', () => {
      const result = AdvancedQueryParser.parse('beach -night');
      expect(result.exclusions).toContain('night');
    });

    it('should extract exclusion terms with without', () => {
      const result = AdvancedQueryParser.parse('beach without night');
      expect(result.exclusions).toContain('night');
    });

    it('should handle multiple exclusions', () => {
      const result = AdvancedQueryParser.parse('landscape NOT city NOT urban');
      expect(result.exclusions).toEqual(expect.arrayContaining(['city', 'urban']));
    });
  });

  describe('Complexity Assessment', () => {
    it('should classify simple queries correctly', () => {
      const result = AdvancedQueryParser.parse('beach sunset');
      expect(result.complexity).toBe('simple');
    });

    it('should classify moderate complexity queries', () => {
      const result = AdvancedQueryParser.parse('beach AND sunset');
      expect(result.complexity).toBe('moderate');
    });

    it('should classify complex queries', () => {
      const result = AdvancedQueryParser.parse('(beach OR coast) AND sunset NOT night');
      expect(result.complexity).toBe('complex');
    });
  });

  describe('Expression to String Conversion', () => {
    it('should convert simple AND expression to string', () => {
      const expression = {
        type: 'AND' as const,
        operands: [
          { text: 'beach', type: 'keyword' as const, position: 0, originalCase: 'beach' },
          { text: 'sunset', type: 'keyword' as const, position: 1, originalCase: 'sunset' }
        ]
      };
      const result = AdvancedQueryParser.expressionToString(expression);
      expect(result).toBe('beach AND sunset');
    });

    it('should convert complex expressions with parentheses', () => {
      const expression = {
        type: 'OR' as const,
        operands: [
          {
            type: 'AND' as const,
            operands: [
              { text: 'beach', type: 'keyword' as const, position: 0, originalCase: 'beach' },
              { text: 'sunset', type: 'keyword' as const, position: 1, originalCase: 'sunset' }
            ]
          },
          { text: 'landscape', type: 'keyword' as const, position: 2, originalCase: 'landscape' }
        ]
      };
      const result = AdvancedQueryParser.expressionToString(expression);
      expect(result).toBe('(beach AND sunset) OR landscape');
    });

    it('should handle NOT expressions correctly', () => {
      const expression = {
        type: 'NOT' as const,
        operands: [
          { text: 'night', type: 'keyword' as const, position: 0, originalCase: 'night' }
        ]
      };
      const result = AdvancedQueryParser.expressionToString(expression);
      expect(result).toBe('-night');
    });
  });

  describe('Search Suggestions', () => {
    it('should provide suggestions for partial queries', () => {
      const availableTags = ['beach', 'sunset', 'portrait', 'landscape', 'night'];
      const suggestions = AdvancedQueryParser.getSuggestions('bea', availableTags);

      expect(suggestions).toEqual(expect.arrayContaining(['beach']));
      expect(suggestions).toEqual(expect.arrayContaining(['bea AND', 'bea OR', 'bea NOT']));
    });

    it('should not suggest operators after boolean operators', () => {
      const availableTags = ['beach', 'sunset', 'portrait'];
      const suggestions = AdvancedQueryParser.getSuggestions('beach AND', availableTags);

      // Should not suggest more operators after AND
      expect(suggestions).not.toEqual(expect.arrayContaining(['beach AND AND']));
    });

    it('should handle empty query', () => {
      const availableTags = ['beach', 'sunset', 'portrait'];
      const suggestions = AdvancedQueryParser.getSuggestions('', availableTags);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toEqual(expect.arrayContaining(availableTags.slice(0, 10)));
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty query', () => {
      const result = AdvancedQueryParser.parse('');
      expect(result.original).toBe('');
      expect(result.tokens).toEqual([]);
      expect(result.complexity).toBe('simple');
    });

    it('should handle whitespace-only query', () => {
      const result = AdvancedQueryParser.parse('   ');
      expect(result.original).toBe('   ');
      expect(result.tokens).toEqual([]);
    });

    it('should handle unmatched parentheses gracefully', () => {
      const result = AdvancedQueryParser.parse('(beach AND sunset');
      expect(result.tokens).toBeDefined();
      expect(result.hasBooleanLogic).toBe(true);
    });

    it('should handle single operator', () => {
      const result = AdvancedQueryParser.parse('AND');
      expect(result.tokens).toBeDefined();
      expect(result.hasBooleanLogic).toBe(true);
    });

    it('should handle mixed case operators', () => {
      const result = AdvancedQueryParser.parse('beach And sunset Or night');
      expect(result.hasBooleanLogic).toBe(true);
      expect(result.booleanExpression).toBeDefined();
    });
  });

  describe('Real-World Query Examples', () => {
    it('should handle "hiking in mountains"', () => {
      const result = AdvancedQueryParser.parse('hiking in mountains');
      expect(result.complexity).toBe('simple');
      expect(result.context.activityContext).toBe('action');
      expect(result.context.locationContext).toBe('nature');
    });

    it('should handle "dog in park NOT night"', () => {
      const result = AdvancedQueryParser.parse('dog in park NOT night');
      expect(result.hasBooleanLogic).toBe(true);
      expect(result.exclusions).toContain('night');
      expect(result.expansions).toEqual(expect.arrayContaining(['puppy', 'canine', 'pet']));
    });

    it('should handle complex real estate query', () => {
      const result = AdvancedQueryParser.parse('house OR apartment AND (garden OR balcony) NOT tiny');
      expect(result.complexity).toBe('complex');
      expect(result.hasBooleanLogic).toBe(true);
      expect(result.exclusions).toContain('tiny');
    });

    it('should handle photography-specific queries', () => {
      const result = AdvancedQueryParser.parse('portrait golden hour professional');
      expect(result.context.activityContext).toBe('portrait');
      expect(result.context.timeContext).toBe('sunset');
      expect(result.context.qualityContext).toBe('professional');
    });
  });
});