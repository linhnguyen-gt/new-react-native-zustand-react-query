import React from 'react';

import { Logger } from '@/shared/helper';

interface PerformanceMetrics {
    renderTime: number;
    componentName: string;
    timestamp: number;
}

const performanceMetrics: PerformanceMetrics[] = [];

export const usePerformanceMonitor = (componentName: string) => {
    const renderStartTime = React.useRef(Date.now());

    React.useEffect(() => {
        const renderEndTime = Date.now();
        const renderTime = renderEndTime - renderStartTime.current;

        const metric: PerformanceMetrics = {
            renderTime,
            componentName,
            timestamp: renderEndTime,
        };

        performanceMetrics.push(metric);

        if (__DEV__ && renderTime > 16) {
            Logger.warn('Performance', `${componentName} render took ${renderTime}ms (>16ms threshold)`);
        }

        if (performanceMetrics.length > 100) {
            performanceMetrics.shift();
        }
    }, [componentName]);

    return {
        getMetrics: () => performanceMetrics,
        getAverageRenderTime: () => {
            if (performanceMetrics.length === 0) return 0;
            const total = performanceMetrics.reduce((sum, m) => sum + m.renderTime, 0);
            return total / performanceMetrics.length;
        },
    };
};

export const getPerformanceReport = () => {
    const componentMetrics = performanceMetrics.reduce(
        (acc, metric) => {
            if (!acc[metric.componentName]) {
                acc[metric.componentName] = [];
            }
            acc[metric.componentName].push(metric.renderTime);
            return acc;
        },
        {} as Record<string, number[]>
    );

    return Object.entries(componentMetrics).map(([name, times]) => ({
        component: name,
        averageRenderTime: times.reduce((a, b) => a + b, 0) / times.length,
        maxRenderTime: Math.max(...times),
        minRenderTime: Math.min(...times),
        sampleCount: times.length,
    }));
};
