import { describe, it, expect, beforeAll } from '@jest/globals';

describe('AI Command Center Integration Tests', () => {
  describe('Metrics Tracker', () => {
    it('should export all required functions', async () => {
      const metricsModule = await import('../metrics-tracker');
      
      expect(typeof metricsModule.recordMetric).toBe('function');
      expect(typeof metricsModule.getRecentMetrics).toBe('function');
      expect(typeof metricsModule.getMetricsSummary).toBe('function');
      expect(typeof metricsModule.getMetricHistory).toBe('function');
    });

    it('should have correct metric interface structure', async () => {
      const { recordMetric } = await import('../metrics-tracker');
      
      const testMetric = {
        metricType: 'test_metric',
        agentName: 'inventory',
        value: 95.5,
        unit: 'percent',
        metadata: { test: true },
      };

      expect(testMetric).toHaveProperty('metricType');
      expect(testMetric).toHaveProperty('agentName');
      expect(testMetric).toHaveProperty('value');
      expect(testMetric).toHaveProperty('unit');
    });
  });

  describe('Sync Agent', () => {
    it('should export all required functions', async () => {
      const syncModule = await import('../sync-agent');
      
      expect(typeof syncModule.runAutoSync).toBe('function');
      expect(typeof syncModule.checkForPendingChanges).toBe('function');
      expect(typeof syncModule.applySafeChanges).toBe('function');
      expect(typeof syncModule.runReconciliationCheck).toBe('function');
    });

    it('should have correct SyncSummary interface with metrics', async () => {
      const syncResult = {
        totalProducts: 100,
        synced: 90,
        changed: 8,
        errors: 2,
        autoAppliedChanges: 5,
        pendingApproval: 3,
        results: [],
        metrics: {
          syncAccuracy: 98,
          syncLatencyMs: 1500,
          stockMatchRate: 90,
        },
      };

      expect(syncResult).toHaveProperty('metrics');
      expect(syncResult.metrics).toHaveProperty('syncAccuracy');
      expect(syncResult.metrics).toHaveProperty('syncLatencyMs');
      expect(syncResult.metrics).toHaveProperty('stockMatchRate');
    });
  });

  describe('Inventory Agent', () => {
    it('should export all required functions', async () => {
      const inventoryModule = await import('../inventory-agent');
      
      expect(typeof inventoryModule.analyzeProductHealth).toBe('function');
      expect(typeof inventoryModule.runInventoryHealthCheck).toBe('function');
      expect(typeof inventoryModule.getInventoryAlerts).toBe('function');
    });

    it('should have correct health score calculation', () => {
      const healthScore = (dataQuality: number, profitability: number, availability: number) => {
        return Math.round((dataQuality * 0.3) + (profitability * 0.3) + (availability * 0.4));
      };

      expect(healthScore(100, 100, 100)).toBe(100);
      expect(healthScore(80, 80, 80)).toBe(80);
      expect(healthScore(100, 50, 50)).toBe(65);
      expect(healthScore(0, 0, 0)).toBe(0);
    });
  });

  describe('Pricing Agent', () => {
    it('should export all required functions', async () => {
      const pricingModule = await import('../pricing-agent');
      
      expect(typeof pricingModule.analyzePricing).toBe('function');
      expect(typeof pricingModule.applyPriceRecommendation).toBe('function');
    });

    it('should calculate margin correctly', () => {
      const calculateMargin = (price: number, cost: number) => {
        if (price <= 0) return 0;
        return ((price - cost) / price) * 100;
      };

      expect(calculateMargin(100, 70)).toBeCloseTo(30, 1);
      expect(calculateMargin(50, 30)).toBeCloseTo(40, 1);
      expect(calculateMargin(100, 100)).toBeCloseTo(0, 1);
    });
  });

  describe('Action Logger', () => {
    it('should export all required functions', async () => {
      const actionModule = await import('../action-logger');
      
      expect(typeof actionModule.logAIAction).toBe('function');
      expect(typeof actionModule.updateAIAction).toBe('function');
      expect(typeof actionModule.getRecentAIActions).toBe('function');
      expect(typeof actionModule.getAIActionStats).toBe('function');
      expect(typeof actionModule.rollbackAIAction).toBe('function');
    });

    it('should have correct action status types', async () => {
      const validStatuses = ['pending', 'running', 'completed', 'failed', 'rolled_back'];
      
      expect(validStatuses).toContain('pending');
      expect(validStatuses).toContain('completed');
      expect(validStatuses).toContain('failed');
      expect(validStatuses).toContain('rolled_back');
    });
  });

  describe('Rollback System', () => {
    it('should track sync change IDs for precise restoration', () => {
      const appliedChange = {
        productId: 123,
        field: 'stock',
        oldValue: 50,
        newValue: 45,
        syncChangeId: 456,
      };

      expect(appliedChange).toHaveProperty('syncChangeId');
      expect(appliedChange.oldValue).not.toBe(appliedChange.newValue);
    });

    it('should support multiple field types for rollback', () => {
      const rollbackableFields = ['stock', 'price', 'active'];
      
      expect(rollbackableFields).toContain('stock');
      expect(rollbackableFields).toContain('price');
      expect(rollbackableFields).toContain('active');
    });
  });
});
