import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TrendDataPoint {
  date: string;
  close: number;
  predicted: number;
}

interface TrendChartProps {
  stockSymbol: string;
}

const TrendChart: React.FC<TrendChartProps> = ({ stockSymbol }) => {
  // Generate mock trend data for demonstration
  const generateTrendData = (): TrendDataPoint[] => {
    const data: TrendDataPoint[] = [];
    const basePrice = 191.37;
    const startDate = new Date('2025-08-04');
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Generate realistic price variations
      const variation = (Math.random() - 0.5) * 4;
      const close = basePrice + variation + (Math.sin(i * 0.3) * 2);
      const predicted = close + (Math.random() - 0.5) * 1.5;
      
      data.push({
        date: date.toISOString().split('T')[0],
        close: Number(close.toFixed(2)),
        predicted: Number(predicted.toFixed(2))
      });
    }
    
    return data;
  };

  const trendData = generateTrendData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-sm">
            <span className="text-chart-1">Close:</span> {payload[0]?.value}
          </p>
          <p className="text-sm">
            <span className="text-chart-2">Predicted:</span> {payload[1]?.value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Trend Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}-${date.getDate()}`;
                }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 2, r: 3 }}
                name="Close"
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2, r: 3 }}
                name="Predicted"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendChart;