import {
  validateQuery,
  ValidationResult,
  VALID_PROPERTIES,
} from '../../src/sentry-query/query-validator';
import { parseQuery } from '../../src/sentry-query/query-parser';

describe('QueryValidator', () => {
  describe('validateQuery', () => {
    describe('known properties', () => {
      it('should validate known property "level"', () => {
        const parsed = parseQuery('level:error');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
        expect(result.components[0].valid).toBe(true);
        expect(result.components[0].error).toBeUndefined();
      });

      it('should validate known property "is"', () => {
        const parsed = parseQuery('is:unresolved');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
        expect(result.components[0].valid).toBe(true);
      });

      it('should validate known property "assigned"', () => {
        const parsed = parseQuery('assigned:me');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should validate user properties', () => {
        const parsed = parseQuery('user.email:test@example.com');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should validate http properties', () => {
        const parsed = parseQuery('http.method:GET');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should validate device properties', () => {
        const parsed = parseQuery('device.family:iPhone');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should validate stack properties', () => {
        const parsed = parseQuery('stack.filename:app.js');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should validate error properties', () => {
        const parsed = parseQuery('error.type:ValueError');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should validate release properties', () => {
        const parsed = parseQuery('release:1.0.0');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should validate geo properties', () => {
        const parsed = parseQuery('geo.country_code:US');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should validate has: operator', () => {
        const parsed = parseQuery('has:user');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should validate tags[] syntax', () => {
        const parsed = parseQuery('tags[environment]:production');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });
    });

    describe('invalid properties', () => {
      it('should mark unknown property as invalid', () => {
        const parsed = parseQuery('unknownprop:value');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(false);
        expect(result.components[0].valid).toBe(false);
        expect(result.components[0].error).toBeDefined();
      });

      it('should provide suggestion for "assignee" typo', () => {
        const parsed = parseQuery('assignee:me');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(false);
        expect(result.components[0].valid).toBe(false);
        expect(result.components[0].suggestion).toBe('assigned');
      });

      it('should provide suggestion for "lvl" typo', () => {
        const parsed = parseQuery('lvl:error');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(false);
        expect(result.components[0].suggestion).toBe('level');
      });

      it('should provide suggestion for "status" typo', () => {
        const parsed = parseQuery('status:resolved');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(false);
        expect(result.components[0].suggestion).toBe('is');
      });

      it('should provide suggestion for "env" typo', () => {
        const parsed = parseQuery('env:production');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(false);
        expect(result.components[0].suggestion).toBeDefined();
      });
    });

    describe('value validation', () => {
      it('should validate level values', () => {
        const validLevels = ['fatal', 'error', 'warning', 'info', 'debug'];
        for (const level of validLevels) {
          const parsed = parseQuery(`level:${level}`);
          const result = validateQuery(parsed);
          expect(result.valid).toBe(true);
        }
      });

      it('should invalidate wrong level value', () => {
        const parsed = parseQuery('level:critical');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(false);
        expect(result.components[0].error).toContain('Invalid value');
      });

      it('should validate is: values', () => {
        const validValues = [
          'unresolved',
          'resolved',
          'ignored',
          'assigned',
          'unassigned',
          'for_review',
          'linked',
          'unlinked',
          'archived',
        ];
        for (const value of validValues) {
          const parsed = parseQuery(`is:${value}`);
          const result = validateQuery(parsed);
          expect(result.valid).toBe(true);
        }
      });

      it('should invalidate wrong is: value', () => {
        const parsed = parseQuery('is:pending');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(false);
        expect(result.components[0].error).toContain('Invalid value');
      });

      it('should validate assigned special values', () => {
        const validValues = ['me', 'none', 'my_teams', '#team-backend'];
        for (const value of validValues) {
          const parsed = parseQuery(`assigned:${value}`);
          const result = validateQuery(parsed);
          expect(result.valid).toBe(true);
        }
      });

      it('should validate http.method values', () => {
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        for (const method of validMethods) {
          const parsed = parseQuery(`http.method:${method}`);
          const result = validateQuery(parsed);
          expect(result.valid).toBe(true);
        }
      });

      it('should validate boolean values for error.handled', () => {
        const parsed1 = parseQuery('error.handled:true');
        expect(validateQuery(parsed1).valid).toBe(true);

        const parsed2 = parseQuery('error.handled:false');
        expect(validateQuery(parsed2).valid).toBe(true);

        const parsed3 = parseQuery('error.handled:1');
        expect(validateQuery(parsed3).valid).toBe(true);

        const parsed4 = parseQuery('error.handled:0');
        expect(validateQuery(parsed4).valid).toBe(true);
      });
    });

    describe('mixed queries', () => {
      it('should validate multiple valid components', () => {
        const parsed = parseQuery('level:error is:unresolved assigned:me');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
        expect(result.components).toHaveLength(3);
        expect(result.components.every((c) => c.valid)).toBe(true);
      });

      it('should mark query as invalid if any component is invalid', () => {
        const parsed = parseQuery('level:error unknownprop:value is:unresolved');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(false);
        expect(result.components[0].valid).toBe(true);
        expect(result.components[1].valid).toBe(false);
        expect(result.components[2].valid).toBe(true);
      });
    });

    describe('operators validation', () => {
      it('should allow comparison operators on numeric properties', () => {
        const parsed = parseQuery('timesSeen:>100');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should allow comparison operators on age', () => {
        const parsed = parseQuery('age:>24h');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should allow comparison operators on timestamp', () => {
        const parsed = parseQuery('event.timestamp:>2023-09-28');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });
    });

    describe('suggestions', () => {
      it('should collect all suggestions', () => {
        const parsed = parseQuery('assignee:me lvl:error');
        const result = validateQuery(parsed);
        expect(result.suggestions).toHaveLength(2);
        expect(result.suggestions.map((s) => s.suggested)).toContain('assigned');
        expect(result.suggestions.map((s) => s.suggested)).toContain('level');
      });
    });

    describe('free text validation', () => {
      it('should accept queries with only free text', () => {
        const parsed = parseQuery('TypeError undefined');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
        expect(result.components).toHaveLength(0);
      });
    });

    describe('edge cases', () => {
      it('should handle empty parsed query', () => {
        const parsed = parseQuery('');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
        expect(result.components).toHaveLength(0);
      });

      it('should handle wildcards in values', () => {
        const parsed = parseQuery('user.email:*@internal.com');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should handle negated queries', () => {
        const parsed = parseQuery('!level:error');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });

      it('should handle multiple values syntax', () => {
        const parsed = parseQuery('release:[12.0, 13.0]');
        const result = validateQuery(parsed);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('VALID_PROPERTIES', () => {
    it('should export VALID_PROPERTIES for UI use', () => {
      expect(VALID_PROPERTIES).toBeDefined();
      expect(typeof VALID_PROPERTIES).toBe('object');
      expect(VALID_PROPERTIES['level']).toBeDefined();
      expect(VALID_PROPERTIES['is']).toBeDefined();
    });
  });
});
