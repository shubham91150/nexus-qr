import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock log entry data
const mockLogs = [
  {
    id: 'log-1',
    timestamp: '2024-01-15T10:30:00Z',
    method: 'POST',
    endpoint: '/api/v1/generate',
    status_code: 200,
    response_time: 145,
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    api_key_id: 'key-1',
    request_body: '{"content":"https://example.com"}',
    response_body: '{"success":true,"id":"qr-123"}',
  },
  {
    id: 'log-2',
    timestamp: '2024-01-15T10:31:00Z',
    method: 'GET',
    endpoint: '/api/v1/qr/abc123',
    status_code: 404,
    response_time: 45,
    ip_address: '10.0.0.1',
    user_agent: 'curl/7.64.1',
    api_key_id: 'key-1',
    request_body: null,
    response_body: '{"error":"Not found"}',
  },
];

describe('Log Entry Formatting', () => {
  it('should format timestamp correctly', () => {
    const formatTimestamp = (timestamp: string) => {
      const date = new Date(timestamp);
      return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        relative: getRelativeTime(date),
      };
    };

    const getRelativeTime = (date: Date) => {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'just now';
    };

    const formatted = formatTimestamp('2024-01-15T10:30:00Z');
    expect(formatted.date).toBeDefined();
    expect(formatted.time).toBeDefined();
  });

  it('should format response time', () => {
    const formatResponseTime = (ms: number) => {
      if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
      return `${ms}ms`;
    };

    expect(formatResponseTime(145)).toBe('145ms');
    expect(formatResponseTime(1500)).toBe('1.50s');
    expect(formatResponseTime(50)).toBe('50ms');
  });

  it('should truncate long strings', () => {
    const truncate = (str: string, maxLength: number) => {
      if (str.length <= maxLength) return str;
      return str.substring(0, maxLength) + '...';
    };

    expect(truncate('short', 10)).toBe('short');
    expect(truncate('this is a very long string', 10)).toBe('this is a ...');
  });
});

describe('Log Filtering', () => {
  it('should filter by status code range', () => {
    const filterByStatus = (logs: typeof mockLogs, filter: 'all' | '2xx' | '4xx' | '5xx') => {
      if (filter === 'all') return logs;
      const ranges: Record<string, [number, number]> = {
        '2xx': [200, 299],
        '4xx': [400, 499],
        '5xx': [500, 599],
      };
      const [min, max] = ranges[filter];
      return logs.filter((log) => log.status_code >= min && log.status_code <= max);
    };

    expect(filterByStatus(mockLogs, 'all')).toHaveLength(2);
    expect(filterByStatus(mockLogs, '2xx')).toHaveLength(1);
    expect(filterByStatus(mockLogs, '4xx')).toHaveLength(1);
    expect(filterByStatus(mockLogs, '5xx')).toHaveLength(0);
  });

  it('should filter by HTTP method', () => {
    const filterByMethod = (logs: typeof mockLogs, method: string | null) => {
      if (!method) return logs;
      return logs.filter((log) => log.method === method);
    };

    expect(filterByMethod(mockLogs, null)).toHaveLength(2);
    expect(filterByMethod(mockLogs, 'POST')).toHaveLength(1);
    expect(filterByMethod(mockLogs, 'GET')).toHaveLength(1);
    expect(filterByMethod(mockLogs, 'DELETE')).toHaveLength(0);
  });

  it('should filter by endpoint', () => {
    const filterByEndpoint = (logs: typeof mockLogs, search: string) => {
      if (!search) return logs;
      return logs.filter((log) =>
        log.endpoint.toLowerCase().includes(search.toLowerCase())
      );
    };

    expect(filterByEndpoint(mockLogs, 'generate')).toHaveLength(1);
    expect(filterByEndpoint(mockLogs, 'api')).toHaveLength(2);
    expect(filterByEndpoint(mockLogs, 'unknown')).toHaveLength(0);
  });

  it('should filter by date range', () => {
    const filterByDateRange = (
      logs: typeof mockLogs,
      startDate: string | null,
      endDate: string | null
    ) => {
      return logs.filter((log) => {
        const logDate = new Date(log.timestamp);
        // Parse date as start of day for startDate comparison
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (logDate < start) return false;
        }
        // Parse date as end of day for endDate comparison
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (logDate > end) return false;
        }
        return true;
      });
    };

    expect(filterByDateRange(mockLogs, '2024-01-15', '2024-01-15')).toHaveLength(2);
    expect(filterByDateRange(mockLogs, '2024-01-16', null)).toHaveLength(0);
  });
});

describe('Log Sorting', () => {
  it('should sort by timestamp', () => {
    const sortByTimestamp = (logs: typeof mockLogs, order: 'asc' | 'desc') => {
      return [...logs].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      });
    };

    const sortedAsc = sortByTimestamp(mockLogs, 'asc');
    const sortedDesc = sortByTimestamp(mockLogs, 'desc');

    expect(sortedAsc[0].id).toBe('log-1');
    expect(sortedDesc[0].id).toBe('log-2');
  });

  it('should sort by response time', () => {
    const sortByResponseTime = (logs: typeof mockLogs, order: 'asc' | 'desc') => {
      return [...logs].sort((a, b) => {
        return order === 'asc'
          ? a.response_time - b.response_time
          : b.response_time - a.response_time;
      });
    };

    const sorted = sortByResponseTime(mockLogs, 'asc');
    expect(sorted[0].response_time).toBeLessThan(sorted[1].response_time);
  });
});

describe('Log Status Helpers', () => {
  it('should determine status color', () => {
    const getStatusColor = (statusCode: number) => {
      if (statusCode >= 200 && statusCode < 300) return 'green';
      if (statusCode >= 300 && statusCode < 400) return 'blue';
      if (statusCode >= 400 && statusCode < 500) return 'yellow';
      if (statusCode >= 500) return 'red';
      return 'gray';
    };

    expect(getStatusColor(200)).toBe('green');
    expect(getStatusColor(201)).toBe('green');
    expect(getStatusColor(301)).toBe('blue');
    expect(getStatusColor(400)).toBe('yellow');
    expect(getStatusColor(404)).toBe('yellow');
    expect(getStatusColor(500)).toBe('red');
  });

  it('should get status message', () => {
    const getStatusMessage = (statusCode: number) => {
      const messages: Record<number, string> = {
        200: 'OK',
        201: 'Created',
        204: 'No Content',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        429: 'Too Many Requests',
        500: 'Internal Server Error',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
      };
      return messages[statusCode] || 'Unknown';
    };

    expect(getStatusMessage(200)).toBe('OK');
    expect(getStatusMessage(404)).toBe('Not Found');
    expect(getStatusMessage(500)).toBe('Internal Server Error');
    expect(getStatusMessage(999)).toBe('Unknown');
  });

  it('should determine if request was successful', () => {
    const isSuccess = (statusCode: number) => statusCode >= 200 && statusCode < 300;

    expect(isSuccess(200)).toBe(true);
    expect(isSuccess(201)).toBe(true);
    expect(isSuccess(400)).toBe(false);
    expect(isSuccess(500)).toBe(false);
  });
});

describe('Log Pagination', () => {
  it('should calculate page info', () => {
    const getPageInfo = (total: number, page: number, perPage: number) => {
      const totalPages = Math.ceil(total / perPage);
      const start = (page - 1) * perPage + 1;
      const end = Math.min(page * perPage, total);
      return { totalPages, start, end, hasNext: page < totalPages, hasPrev: page > 1 };
    };

    const info = getPageInfo(100, 2, 10);
    expect(info.totalPages).toBe(10);
    expect(info.start).toBe(11);
    expect(info.end).toBe(20);
    expect(info.hasNext).toBe(true);
    expect(info.hasPrev).toBe(true);
  });

  it('should slice logs for page', () => {
    const getLogsForPage = <T,>(logs: T[], page: number, perPage: number) => {
      const start = (page - 1) * perPage;
      return logs.slice(start, start + perPage);
    };

    const logs = Array.from({ length: 25 }, (_, i) => ({ id: i }));
    const page1 = getLogsForPage(logs, 1, 10);
    const page3 = getLogsForPage(logs, 3, 10);

    expect(page1).toHaveLength(10);
    expect(page1[0].id).toBe(0);
    expect(page3).toHaveLength(5);
    expect(page3[0].id).toBe(20);
  });
});

describe('Log Export', () => {
  it('should format logs for CSV export', () => {
    const formatForCsv = (logs: typeof mockLogs) => {
      const headers = ['Timestamp', 'Method', 'Endpoint', 'Status', 'Response Time'];
      const rows = logs.map((log) => [
        log.timestamp,
        log.method,
        log.endpoint,
        log.status_code.toString(),
        log.response_time.toString(),
      ]);
      return [headers, ...rows];
    };

    const csv = formatForCsv(mockLogs);
    expect(csv[0]).toEqual(['Timestamp', 'Method', 'Endpoint', 'Status', 'Response Time']);
    expect(csv).toHaveLength(3); // Header + 2 logs
  });

  it('should format logs for JSON export', () => {
    const formatForJson = (logs: typeof mockLogs) => {
      return JSON.stringify(logs, null, 2);
    };

    const json = formatForJson(mockLogs);
    expect(json).toContain('"id": "log-1"');
    expect(json).toContain('"method": "POST"');
  });
});
