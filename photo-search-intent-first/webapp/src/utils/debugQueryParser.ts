import { AdvancedQueryParser } from './advancedQueryParser';

// Debug the parser
console.log('=== Debug Query Parser ===');

// Test simple query
const simpleQuery = 'beach sunset';
console.log('\n1. Simple query:', simpleQuery);
const simpleResult = AdvancedQueryParser.parse(simpleQuery);
console.log('Tokens:', simpleResult.tokens);
console.log('Has boolean logic:', simpleResult.hasBooleanLogic);
console.log('Exclusions:', simpleResult.exclusions);

// Test NOT query
const notQuery = 'beach NOT night';
console.log('\n2. NOT query:', notQuery);
const notResult = AdvancedQueryParser.parse(notQuery);
console.log('Tokens:', notResult.tokens);
console.log('Has boolean logic:', notResult.hasBooleanLogic);
console.log('Exclusions:', notResult.exclusions);

// Test minus query
const minusQuery = 'beach -night';
console.log('\n3. Minus query:', minusQuery);
const minusResult = AdvancedQueryParser.parse(minusQuery);
console.log('Tokens:', minusResult.tokens);
console.log('Has boolean logic:', minusResult.hasBooleanLogic);
console.log('Exclusions:', minusResult.exclusions);