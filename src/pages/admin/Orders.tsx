import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/Card';
import { Clock, ChefHat, CheckCircle2, Truck, Search, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';

type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivery' | 'completed' | 'cancelled';
  total_amount: number;
  delivery_type: string;
  created_at: string;
  items: OrderItem[];
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  total_price: number;
  observation?: string;
  addons: OrderItemAddon[];
};

type OrderItemAddon = {
  id: string;
  addon_name: string;
  price: number;
};

export default function Orders() {
  const { profile } = useOutletContext<any>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!profile || !supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items (
            *,
            addons:order_item_addons (*)
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Realtime subscription
    if (!supabase || !profile) return;
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${profile.id}`
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    if (!supabase) return;
    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      toast.success('Status atualizado');
      // Optimistic update
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const counts = {
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivery: orders.filter(o => o.status === 'delivery').length,
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Pedidos</h2>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard 
          title="Pendentes" 
          count={counts.pending} 
          icon={Clock} 
          color="yellow" 
          active={true}
        />
        <StatusCard 
          title="Em Preparação" 
          count={counts.preparing} 
          icon={ChefHat} 
          color="blue" 
        />
        <StatusCard 
          title="Prontos" 
          count={counts.ready} 
          icon={CheckCircle2} 
          color="green" 
        />
        <StatusCard 
          title="A Caminho" 
          count={counts.delivery} 
          icon={Truck} 
          color="purple" 
        />
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          orders.map(order => (
            <Card key={order.id} className="overflow-hidden border border-zinc-200">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">#{order.id.slice(0, 8)}</span>
                      <StatusBadge status={order.status} />
                      <span className="text-sm text-zinc-500">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-600">
                      <p><span className="font-medium">Cliente:</span> {order.customer_name}</p>
                      {order.customer_phone && <p><span className="font-medium">Tel:</span> {order.customer_phone}</p>}
                      {order.address && <p><span className="font-medium">Endereço:</span> {order.address}</p>}
                      {order.payment_method && (
                        <p>
                          <span className="font-medium">Pagamento:</span>{' '}
                          {order.payment_method === 'pix' ? 'Pix' :
                           order.payment_method === 'credit_card' ? 'Cartão de Crédito' :
                           order.payment_method === 'debit_card' ? 'Cartão de Débito' :
                           order.payment_method === 'cash' ? 'Dinheiro' :
                           order.payment_method === 'card' ? 'Cartão' : order.payment_method}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 md:max-w-md bg-zinc-50 p-3 rounded-lg text-sm space-y-2">
                    {order.items.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <div>
                          <span className="font-medium">{item.quantity}x {item.product_name}</span>
                          {item.addons.length > 0 && (
                            <div className="text-xs text-zinc-500 pl-4">
                              {item.addons.map(a => (
                                <div key={a.id}>+ {a.addon_name}</div>
                              ))}
                            </div>
                          )}
                          {item.observation && (
                            <div className="text-xs text-zinc-500 italic pl-4">Obs: {item.observation}</div>
                          )}
                        </div>
                        <span className="text-zinc-600">{formatCurrency(item.total_price)}</span>
                      </div>
                    ))}
                    <div className="border-t border-zinc-200 pt-2 flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span>{formatCurrency(order.total_amount)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 justify-center min-w-[140px]">
                    {order.status === 'pending' && (
                      <Button onClick={() => updateStatus(order.id, 'preparing')} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Aceitar Pedido
                      </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button onClick={() => updateStatus(order.id, 'ready')} className="bg-green-600 hover:bg-green-700 text-white">
                        Marcar Pronto
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button onClick={() => updateStatus(order.id, 'delivery')} className="bg-purple-600 hover:bg-purple-700 text-white">
                        Saiu p/ Entrega
                      </Button>
                    )}
                    {order.status === 'delivery' && (
                      <Button onClick={() => updateStatus(order.id, 'completed')} className="bg-zinc-800 hover:bg-zinc-900 text-white">
                        Finalizar
                      </Button>
                    )}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <Button variant="ghost" onClick={() => updateStatus(order.id, 'cancelled')} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function StatusCard({ title, count, icon: Icon, color, active }: any) {
  const colors = {
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };
  
  const iconColors = {
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
  };

  return (
    <Card className={`border shadow-sm ${colors[color as keyof typeof colors]}`}>
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium opacity-80">{title}</p>
          <h3 className="text-2xl font-bold">{count}</h3>
        </div>
        <div className={`h-10 w-10 bg-white/50 rounded-full flex items-center justify-center ${iconColors[color as keyof typeof iconColors]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    preparing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    delivery: 'bg-purple-100 text-purple-800',
    completed: 'bg-zinc-100 text-zinc-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const labels = {
    pending: 'Pendente',
    preparing: 'Preparando',
    ready: 'Pronto',
    delivery: 'A Caminho',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}
