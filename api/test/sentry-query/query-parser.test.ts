import {
  parseQuery,
  QueryComponent,
  ParsedQuery,
} from '../../src/sentry-query/query-parser';

describe('QueryParser', () => {
  describe('parseQuery', () => {
    describe('simple property:value pairs', () => {
      it('should parse simple property:value', () => {
        const result = parseQuery('level:error');
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toEqual({
          property: 'level',
          operator: ':',
          value: 'error',
          raw: 'level:error',
        });
        expect(result.freeText).toEqual([]);
      });

      it('should parse multiple property:value pairs', () => {
        const result = parseQuery('level:error is:unresolved');
        expect(result.components).toHaveLength(2);
        expect(result.components[0]).toEqual({
          property: 'level',
          operator: ':',
          value: 'error',
          raw: 'level:error',
        });
        expect(result.components[1]).toEqual({
          property: 'is',
          operator: ':',
          value: 'unresolved',
          raw: 'is:unresolved',
        });
      });

      it('should handle properties with dots', () => {
        const result = parseQuery('user.email:test@example.com');
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toEqual({
          property: 'user.email',
          operator: ':',
          value: 'test@example.com',
          raw: 'user.email:test@example.com',
        });
      });

      it('should handle properties with underscores', () => {
        const result = parseQuery('http.status_code:404');
        expect(result.components).toHaveLength(1);
        expect(result.components[0].property).toBe('http.status_code');
        expect(result.components[0].value).toBe('404');
      });
    });

    describe('negation operator', () => {
      it('should parse negation with !:', () => {
        const result = parseQuery('!level:error');
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toEqual({
          property: 'level',
          operator: '!:',
          value: 'error',
          raw: '!level:error',
        });
      });

      it('should parse negation with !', () => {
        const result = parseQuery('!is:resolved');
        expect(result.components).toHaveLength(1);
        expect(result.components[0].operator).toBe('!:');
        expect(result.components[0].property).toBe('is');
        expect(result.components[0].value).toBe('resolved');
      });
    });

    describe('comparison operators', () => {
      it('should parse greater than >', () => {
        const result = parseQuery('age:>24h');
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toEqual({
          property: 'age',
          operator: ':>',
          value: '24h',
          raw: 'age:>24h',
        });
      });

      it('should parse less than <', () => {
        const result = parseQuery('timesSeen:<100');
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toEqual({
          property: 'timesSeen',
          operator: ':<',
          value: '100',
          raw: 'timesSeen:<100',
        });
      });

      it('should parse greater than or equal >=', () => {
        const result = parseQuery('count:>=10');
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toEqual({
          property: 'count',
          operator: ':>=',
          value: '10',
          raw: 'count:>=10',
        });
      });

      it('should parse less than or equal <=', () => {
        const result = parseQuery('count_dead_clicks:<=10');
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toEqual({
          property: 'count_dead_clicks',
          operator: ':<=',
          value: '10',
          raw: 'count_dead_clicks:<=10',
        });
      });
    });

    describe('quoted values', () => {
      it('should parse double-quoted values with spaces', () => {
        const result = parseQuery('user.username:"Jane Doe"');
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toEqual({
          property: 'user.username',
          operator: ':',
          value: 'Jane Doe',
          raw: 'user.username:"Jane Doe"',
        });
      });

      it('should parse single-quoted values', () => {
        const result = parseQuery("message:'Connection timeout'");
        expect(result.components).toHaveLength(1);
        expect(result.components[0].value).toBe('Connection timeout');
      });

      it('should handle quoted values with special characters', () => {
        const result = parseQuery('browser:"Safari 11*"');
        expect(result.components).toHaveLength(1);
        expect(result.components[0].value).toBe('Safari 11*');
      });
    });

    describe('wildcards', () => {
      it('should parse wildcard at end', () => {
        const result = parseQuery('browser:Safari*');
        expect(result.components).toHaveLength(1);
        expect(result.components[0].value).toBe('Safari*');
      });

      it('should parse wildcard at start', () => {
        const result = parseQuery('message:*Timeout');
        expect(result.components).toHaveLength(1);
        expect(result.components[0].value).toBe('*Timeout');
      });

      it('should parse negated wildcard', () => {
        const result = parseQuery('!message:*Timeout');
        expect(result.components).toHaveLength(1);
        expect(result.components[0].operator).toBe('!:');
        expect(result.components[0].value).toBe('*Timeout');
      });
    });

    describe('multiple values with brackets', () => {
      it('should parse multiple values [val1, val2]', () => {
        const result = parseQuery('release:[12.0, 13.0]');
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toEqual({
          property: 'release',
          operator: ':',
          value: '[12.0, 13.0]',
          raw: 'release:[12.0, 13.0]',
        });
      });

      it('should parse multiple values without spaces', () => {
        const result = parseQuery('level:[error,warning]');
        expect(result.components).toHaveLength(1);
        expect(result.components[0].value).toBe('[error,warning]');
      });
    });

    describe('tag syntax', () => {
      it('should parse explicit tag syntax tags[key]', () => {
        const result = parseQuery('tags[environment]:production');
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toEqual({
          property: 'tags[environment]',
          operator: ':',
          value: 'production',
          raw: 'tags[environment]:production',
        });
      });

      it('should parse flag syntax flags["key"]', () => {
        const result = parseQuery('flags["my_flag"]:true');
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toEqual({
          property: 'flags["my_flag"]',
          operator: ':',
          value: 'true',
          raw: 'flags["my_flag"]:true',
        });
      });
    });

    describe('free text', () => {
      it('should extract free text without property', () => {
        const result = parseQuery('TypeError undefined');
        expect(result.components).toHaveLength(0);
        expect(result.freeText).toEqual(['TypeError', 'undefined']);
      });

      it('should extract free text mixed with property:value', () => {
        const result = parseQuery('level:error TypeError');
        expect(result.components).toHaveLength(1);
        expect(result.components[0].property).toBe('level');
        expect(result.freeText).toEqual(['TypeError']);
      });

      it('should handle free text at beginning', () => {
        const result = parseQuery('Connection failed level:error');
        expect(result.components).toHaveLength(1);
        expect(result.freeText).toEqual(['Connection', 'failed']);
      });
    });

    describe('boolean operators', () => {
      it('should handle AND operator (implicit)', () => {
        const result = parseQuery('level:error is:unresolved');
        // AND is implicit - both components should be present
        expect(result.components).toHaveLength(2);
      });

      it('should handle OR operator', () => {
        const result = parseQuery('level:error OR level:warning');
        // OR should be captured in the structure
        expect(result.raw).toBe('level:error OR level:warning');
        expect(result.hasOr).toBe(true);
      });

      it('should handle parentheses for grouping', () => {
        const result = parseQuery('(level:error OR level:warning) is:unresolved');
        expect(result.raw).toContain('(');
        expect(result.hasParentheses).toBe(true);
      });
    });

    describe('special cases', () => {
      it('should handle empty query', () => {
        const result = parseQuery('');
        expect(result.components).toHaveLength(0);
        expect(result.freeText).toEqual([]);
        expect(result.raw).toBe('');
      });

      it('should handle whitespace only', () => {
        const result = parseQuery('   ');
        expect(result.components).toHaveLength(0);
        expect(result.freeText).toEqual([]);
      });

      it('should handle timestamp values', () => {
        const result = parseQuery('event.timestamp:>2023-09-28T00:00:00-07:00');
        expect(result.components).toHaveLength(1);
        expect(result.components[0].property).toBe('event.timestamp');
        expect(result.components[0].operator).toBe(':>');
        expect(result.components[0].value).toBe('2023-09-28T00:00:00-07:00');
      });

      it('should handle age with relative time', () => {
        const result = parseQuery('age:-24h');
        expect(result.components).toHaveLength(1);
        expect(result.components[0].property).toBe('age');
        expect(result.components[0].value).toBe('-24h');
      });

      it('should handle has: operator', () => {
        const result = parseQuery('has:user');
        expect(result.components).toHaveLength(1);
        expect(result.components[0]).toEqual({
          property: 'has',
          operator: ':',
          value: 'user',
          raw: 'has:user',
        });
      });

      it('should handle assigned special values', () => {
        const result = parseQuery('assigned:me');
        expect(result.components).toHaveLength(1);
        expect(result.components[0].value).toBe('me');

        const result2 = parseQuery('assigned:#team-backend');
        expect(result2.components).toHaveLength(1);
        expect(result2.components[0].value).toBe('#team-backend');

        const result3 = parseQuery('assigned:none');
        expect(result3.components).toHaveLength(1);
        expect(result3.components[0].value).toBe('none');
      });
    });

    describe('complex queries', () => {
      it('should parse a real-world complex query', () => {
        const result = parseQuery(
          'is:unresolved level:error !user.email:*@internal.com age:>24h'
        );
        expect(result.components).toHaveLength(4);
        expect(result.components[0]).toEqual({
          property: 'is',
          operator: ':',
          value: 'unresolved',
          raw: 'is:unresolved',
        });
        expect(result.components[1]).toEqual({
          property: 'level',
          operator: ':',
          value: 'error',
          raw: 'level:error',
        });
        expect(result.components[2]).toEqual({
          property: 'user.email',
          operator: '!:',
          value: '*@internal.com',
          raw: '!user.email:*@internal.com',
        });
        expect(result.components[3]).toEqual({
          property: 'age',
          operator: ':>',
          value: '24h',
          raw: 'age:>24h',
        });
      });
    });
  });
});
