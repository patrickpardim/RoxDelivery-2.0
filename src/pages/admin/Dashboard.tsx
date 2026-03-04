import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { DollarSign, ShoppingBag, XCircle, TrendingUp, Calendar, Loader2, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/Button';

type Order = {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
};

type Period = 'today' | 'yesterday' | 'week' | 'month';

export default function Dashboard() {
  const { profile } = useOutletContext<any>();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');
  const [stats, setStats] = useState({
    revenue: 0,
    ordersCount: 0,
    averageTicket: 0,
    cancelledOrders: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  const getDateRange = (p: Period) => {
    const now = new Date();
    const start = new Date();
    const end = new Date();
    
    // Reset time to end of day for 'end'
    end.setHours(23, 59, 59, 999);

    if (p === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (p === 'yesterday') {
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (p === 'week') {
      // Start of current week (Sunday)
      const day = now.getDay(); // 0 (Sun) to 6 (Sat)
      const diff = now.getDate() - day;
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
    } else if (p === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile || !supabase) return;
      setLoading(true);

      try {
        const { start, end } = getDateRange(period);

        const { data: orders, error } = await supabase
          .from('orders')
          .select('id, total_amount, status, created_at')
          .eq('user_id', profile.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (error) throw error;

        const safeOrders = (orders || []) as Order[];

        // --- Stats Calculations ---
        
        // 1. Revenue (non-cancelled)
        const revenue = safeOrders
          .filter(o => o.status !== 'cancelled')
          .reduce((sum, o) => sum + o.total_amount, 0);

        // 2. Orders Count (non-cancelled)
        const validOrders = safeOrders.filter(o => o.status !== 'cancelled');
        const ordersCount = validOrders.length;

        // 3. Average Ticket
        const averageTicket = ordersCount > 0 ? revenue / ordersCount : 0;

        // 4. Cancelled Orders
        const cancelledOrders = safeOrders.filter(o => o.status === 'cancelled').length;

        setStats({
          revenue,
          ordersCount,
          averageTicket,
          cancelledOrders,
        });

        // --- Chart Data ---
        // Group by day for week/month, or by hour for today/yesterday?
        // For simplicity, let's stick to Daily breakdown. If 'today', it will show one bar.
        // Actually, for 'today'/'yesterday', hourly breakdown is better.
        
        let chartData = [];
        
        if (period === 'today' || period === 'yesterday') {
          // Hourly breakdown
          const hours = Array.from({ length: 24 }, (_, i) => i);
          chartData = hours.map(hour => {
            const total = validOrders
              .filter(o => {
                const d = new Date(o.created_at);
                return d.getHours() === hour;
              })
              .reduce((sum, o) => sum + o.total_amount, 0);
            
            return {
              name: `${hour}h`,
              total
            };
          });
        } else {
          // Daily breakdown
          const daysMap = new Map<string, number>();
          
          // Initialize days in range
          const current = new Date(start);
          while (current <= end) {
            const label = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            daysMap.set(label, 0);
            current.setDate(current.getDate() + 1);
          }

          validOrders.forEach(o => {
            const d = new Date(o.created_at);
            const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (daysMap.has(label)) {
              daysMap.set(label, (daysMap.get(label) || 0) + o.total_amount);
            }
          });

          chartData = Array.from(daysMap.entries()).map(([name, total]) => ({ name, total }));
        }

        setChartData(chartData);

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [profile, period]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Painel de Controle</h2>
          <p className="text-zinc-500">Acompanhe o desempenho da sua loja.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-zinc-200 shadow-sm">
          <Button 
            variant={period === 'today' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setPeriod('today')}
            className={period === 'today' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
          >
            Hoje
          </Button>
          <Button 
            variant={period === 'yesterday' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setPeriod('yesterday')}
            className={period === 'yesterday' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
          >
            Ontem
          </Button>
          <Button 
            variant={period === 'week' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setPeriod('week')}
            className={period === 'week' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
          >
            Semana
          </Button>
          <Button 
            variant={period === 'month' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setPeriod('month')}
            className={period === 'month' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
          >
            Mês
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Receita */}
            <Card className="border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-500">Receita</p>
                  <h3 className="text-2xl font-bold text-zinc-900">{formatCurrency(stats.revenue)}</h3>
                </div>
                <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            {/* Pedidos */}
            <Card className="border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-500">Pedidos</p>
                  <h3 className="text-2xl font-bold text-zinc-900">{stats.ordersCount}</h3>
                </div>
                <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            {/* Ticket Médio */}
            <Card className="border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-500">Ticket Médio</p>
                  <h3 className="text-2xl font-bold text-zinc-900">{formatCurrency(stats.averageTicket)}</h3>
                </div>
                <div className="h-10 w-10 bg-purple-50 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            {/* Cancelados */}
            <Card className="border border-zinc-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-500">Cancelados</p>
                  <h3 className="text-2xl font-bold text-zinc-900">{stats.cancelledOrders}</h3>
                </div>
                <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="border border-zinc-200 shadow-sm">
            <CardHeader>
              <CardTitle>
                {period === 'today' || period === 'yesterday' ? 'Faturamento por Hora' : 'Faturamento por Dia'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717A', fontSize: 12 }} 
                      dy={10}
                      interval={period === 'today' || period === 'yesterday' ? 2 : 0} // Skip labels if hourly to avoid clutter
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717A', fontSize: 12 }} 
                      tickFormatter={(value) => `R$ ${value}`}
                    />
                    <Tooltip 
                      cursor={{ fill: '#F4F4F5' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                    />
                    <Bar 
                      dataKey="total" 
                      fill="#9333EA" 
                      radius={[4, 4, 0, 0]} 
                      barSize={period === 'today' || period === 'yesterday' ? 20 : 40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
