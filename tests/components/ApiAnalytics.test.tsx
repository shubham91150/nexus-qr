import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock data for analytics
const mockAnalyticsData = {
  totalRequests: 15420,
  successRate: 98.5,
  averageLatency: 145,
  dailyRequests: [
    { date: '2024-01-01', count: 500 },
    { date: '2024-01-02', count: 750 },
    { date: '2024-01-03', count: 620 },
  ],
  endpointBreakdown: [
    { endpoint: '/api/v1/generate', count: 8500, percentage: 55 },
    { endpoint: '/api/v1/scan', count: 4200, percentage: 27 },
    { endpoint: '/api/v1/analytics', count: 2720, percentage: 18 },
  ],
  errorBreakdown: [
    { code: 400, count: 120, message: 'Bad Request' },
    { code: 401, count: 45, message: 'Unauthorized' },
    { code: 429, count: 67, message: 'Rate Limited' },
  ],
};

// Mock AuthContext
vi.mock('../../lib/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
  }),
}));

describe('Analytics Calculations', () => {
  it('should calculate success rate correctly', () => {
    const calculateSuccessRate = (successful: number, total: number) => {
      if (total === 0) return '0.0';
      return ((successful / total) * 100).toFixed(1);
    };

    expect(calculateSuccessRate(980, 1000)).toBe('98.0');
    expect(calculateSuccessRate(1000, 1000)).toBe('100.0');
    expect(calculateSuccessRate(0, 1000)).toBe('0.0');
    expect(calculateSuccessRate(0, 0)).toBe('0.0');
  });

  it('should calculate average latency correctly', () => {
    const calculateAverageLatency = (latencies: number[]) => {
      if (latencies.length === 0) return 0;
      const sum = latencies.reduce((a, b) => a + b, 0);
      return Math.round(sum / latencies.length);
    };

    expect(calculateAverageLatency([100, 150, 200])).toBe(150);
    expect(calculateAverageLatency([50, 50, 50, 50])).toBe(50);
    expect(calculateAverageLatency([])).toBe(0);
  });

  it('should group requests by time period', () => {
    const groupByDay = (requests: { timestamp: string }[]) => {
      const groups: Record<string, number> = {};
      requests.forEach((r) => {
        const day = r.timestamp.split('T')[0];
        groups[day] = (groups[day] || 0) + 1;
      });
      return groups;
    };

    const requests = [
      { timestamp: '2024-01-01T10:00:00Z' },
      { timestamp: '2024-01-01T15:00:00Z' },
      { timestamp: '2024-01-02T10:00:00Z' },
    ];

    const grouped = groupByDay(requests);
    expect(grouped['2024-01-01']).toBe(2);
    expect(grouped['2024-01-02']).toBe(1);
  });

  it('should calculate percentage breakdown correctly', () => {
    const calculatePercentages = (items: { count: number }[]) => {
      const total = items.reduce((sum, item) => sum + item.count, 0);
      return items.map((item) => ({
        ...item,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
      }));
    };

    const items = [{ count: 50 }, { count: 30 }, { count: 20 }];
    const result = calculatePercentages(items);

    expect(result[0].percentage).toBe(50);
    expect(result[1].percentage).toBe(30);
    expect(result[2].percentage).toBe(20);
  });
});

describe('Analytics Date Filtering', () => {
  it('should filter data by date range', () => {
    const filterByDateRange = (
      data: { date: string; count: number }[],
      startDate: string,
      endDate: string
    ) => {
      return data.filter((d) => d.date >= startDate && d.date <= endDate);
    };

    const data = [
      { date: '2024-01-01', count: 100 },
      { date: '2024-01-05', count: 200 },
      { date: '2024-01-10', count: 300 },
      { date: '2024-01-15', count: 400 },
    ];

    const filtered = filterByDateRange(data, '2024-01-05', '2024-01-10');
    expect(filtered).toHaveLength(2);
    expect(filtered[0].date).toBe('2024-01-05');
  });

  it('should get last N days', () => {
    const getLastNDays = (n: number) => {
      const dates = [];
      const today = new Date();
      for (let i = n - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      return dates;
    };

    const last7Days = getLastNDays(7);
    expect(last7Days).toHaveLength(7);
  });

  it('should aggregate data by week', () => {
    const aggregateByWeek = (dailyData: { date: string; count: number }[]) => {
      const weeks: Record<string, number> = {};
      dailyData.forEach((d) => {
        const date = new Date(d.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        weeks[weekKey] = (weeks[weekKey] || 0) + d.count;
      });
      return weeks;
    };

    const data = [
      { date: '2024-01-01', count: 100 }, // Monday
      { date: '2024-01-02', count: 150 }, // Tuesday
      { date: '2024-01-08', count: 200 }, // Next Monday
    ];

    const weekly = aggregateByWeek(data);
    expect(Object.keys(weekly).length).toBeGreaterThan(0);
  });
});

describe('Analytics Error Handling', () => {
  it('should categorize HTTP status codes', () => {
    const categorizeStatus = (code: number) => {
      if (code >= 200 && code < 300) return 'success';
      if (code >= 400 && code < 500) return 'client_error';
      if (code >= 500) return 'server_error';
      return 'other';
    };

    expect(categorizeStatus(200)).toBe('success');
    expect(categorizeStatus(201)).toBe('success');
    expect(categorizeStatus(400)).toBe('client_error');
    expect(categorizeStatus(401)).toBe('client_error');
    expect(categorizeStatus(500)).toBe('server_error');
    expect(categorizeStatus(503)).toBe('server_error');
  });

  it('should count errors by type', () => {
    const countErrorsByType = (errors: { code: number }[]) => {
      const counts: Record<number, number> = {};
      errors.forEach((e) => {
        counts[e.code] = (counts[e.code] || 0) + 1;
      });
      return counts;
    };

    const errors = [
      { code: 400 },
      { code: 400 },
      { code: 401 },
      { code: 500 },
    ];

    const counts = countErrorsByType(errors);
    expect(counts[400]).toBe(2);
    expect(counts[401]).toBe(1);
    expect(counts[500]).toBe(1);
  });
});

describe('Analytics Formatting', () => {
  it('should format latency in milliseconds', () => {
    const formatLatency = (ms: number) => {
      if (ms >= 1000) return (ms / 1000).toFixed(2) + 's';
      return ms + 'ms';
    };

    expect(formatLatency(150)).toBe('150ms');
    expect(formatLatency(1500)).toBe('1.50s');
    expect(formatLatency(2500)).toBe('2.50s');
  });

  it('should format request count with suffix', () => {
    const formatRequestCount = (count: number) => {
      if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
      if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
      return count.toString();
    };

    expect(formatRequestCount(500)).toBe('500');
    expect(formatRequestCount(1500)).toBe('1.5K');
    expect(formatRequestCount(1500000)).toBe('1.5M');
  });

  it('should format percentage with decimals', () => {
    const formatPercentage = (value: number, decimals: number = 1) => {
      return value.toFixed(decimals) + '%';
    };

    expect(formatPercentage(98.567)).toBe('98.6%');
    expect(formatPercentage(100)).toBe('100.0%');
    expect(formatPercentage(0.5, 2)).toBe('0.50%');
  });
});
