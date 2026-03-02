import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, DollarSign, Clock } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useOutletContext<any>();
  const [stats, setStats] = useState({
    revenue: 0,
    totalOrders: 0,
    pendingOrders: 0
  });

  useEffect(() => {
    // In a real app, we would fetch real stats here
    // For now, we'll just use the mock values from the design or 0
  }, [profile]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Painel de Controle</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Receita Total */}
        <Card className="border border-zinc-100 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-500">Receita Total</p>
              <h3 className="text-2xl font-bold text-zinc-900">R$ 0,00</h3>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total de Pedidos */}
        <Card className="border border-zinc-100 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-500">Total de Pedidos</p>
              <h3 className="text-2xl font-bold text-zinc-900">0</h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Pedidos Pendentes */}
        <Card className="border border-zinc-100 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-500">Pedidos Pendentes</p>
              <h3 className="text-2xl font-bold text-zinc-900">0</h3>
            </div>
            <div className="h-10 w-10 bg-zinc-50 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-zinc-900" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Atividade Recente */}
      <Card className="border border-zinc-100 shadow-sm min-h-[200px]">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Atividade Recente</h3>
          <div className="text-zinc-500">
            Nenhuma atividade recente para mostrar.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
