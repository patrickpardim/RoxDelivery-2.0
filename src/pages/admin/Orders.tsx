import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/Card';
import { Clock, ChefHat, CheckCircle2, Truck, X, MapPin, User, CreditCard, ShoppingBag, Calendar } from 'lucide-react';
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
  address?: string;
  payment_method?: string;
  change_for?: number;
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

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export default function Orders() {
  const { profile } = useOutletContext<any>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [period, setPeriod] = useState<Period>('today');

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
      const day = now.getDay();
      const diff = now.getDate() - day;
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
    } else if (p === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (p === 'all') {
      return null; // No filter
    }

    return { start, end };
  };

  const fetchOrders = async () => {
    if (!profile || !supabase) return;
    setLoading(true);
    try {
      let query = supabase
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

      const range = getDateRange(period);
      if (range) {
        query = query
          .gte('created_at', range.start.toISOString())
          .lte('created_at', range.end.toISOString());
      }

      const { data, error } = await query;

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
  }, [profile, period]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    if (!supabase) return;
    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      toast.success('Status atualizado');
      
      // Optimistic update
      const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o);
      setOrders(updatedOrders);
      
      // Update selected order if it's the one being modified
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as any });
      }
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
    <div className="space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Pedidos</h2>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-zinc-200 shadow-sm overflow-x-auto">
          <Button 
            variant={period === 'today' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setPeriod('today')}
            className={period === 'today' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            Hoje
          </Button>
          <Button 
            variant={period === 'yesterday' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setPeriod('yesterday')}
            className={period === 'yesterday' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            Ontem
          </Button>
          <Button 
            variant={period === 'week' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setPeriod('week')}
            className={period === 'week' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            Semana
          </Button>
          <Button 
            variant={period === 'month' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setPeriod('month')}
            className={period === 'month' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            Mês
          </Button>
          <Button 
            variant={period === 'all' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setPeriod('all')}
            className={period === 'all' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            Todos
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatusCard 
          title="Pendentes" 
          count={counts.pending} 
          icon={Clock} 
          color="yellow" 
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

      {/* Orders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
            <p className="text-zinc-500">Nenhum pedido encontrado neste período.</p>
          </div>
        ) : (
          orders.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onClick={() => setSelectedOrder(order)} 
            />
          ))
        )}
      </div>

      {/* Order Details Drawer */}
      <OrderDrawer 
        order={selectedOrder} 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        onUpdateStatus={updateStatus}
      />
    </div>
  );
}

function StatusCard({ title, count, icon: Icon, color }: any) {
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

const OrderCard: React.FC<{ order: Order; onClick: () => void }> = ({ order, onClick }) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    preparing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    delivery: 'bg-purple-100 text-purple-800',
    completed: 'bg-zinc-100 text-zinc-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    pending: 'Pendente',
    preparing: 'Preparando',
    ready: 'Pronto',
    delivery: 'A Caminho',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  const timeString = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
    >
      <div className="p-4 flex-1">
        <div className="flex justify-between items-start mb-3">
          <span className="text-zinc-500 text-sm font-medium">#{order.id.slice(0, 6)}</span>
          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide ${
            order.delivery_type === 'delivery' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada'}
          </span>
        </div>
        
        <h3 className="font-bold text-zinc-900 text-lg mb-1 truncate">{order.customer_name}</h3>
        <p className="text-zinc-500 text-sm mb-4">{timeString}</p>
      </div>
      
      <div className={`px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
        <Clock className="w-4 h-4" />
        {statusLabels[order.status] || order.status}
      </div>
    </div>
  );
}

function OrderDrawer({ 
  order, 
  isOpen, 
  onClose, 
  onUpdateStatus 
}: { 
  order: Order | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onUpdateStatus: (id: string, status: string) => void;
}) {
  if (!order) return null;

  const date = new Date(order.created_at);
  const formattedDate = date.toLocaleDateString('pt-BR');
  const formattedTime = date.toLocaleTimeString('pt-BR');

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex justify-between items-start bg-white">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Pedido #{order.id.slice(0, 8)}</h2>
            <p className="text-sm text-zinc-500">{formattedDate}, {formattedTime}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-zinc-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Ações do Pedido</h3>
            
            {order.status === 'pending' && (
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => onUpdateStatus(order.id, 'preparing')} 
                  className="bg-green-600 hover:bg-green-700 text-white w-full h-12 text-base font-bold"
                >
                  ACEITAR
                </Button>
                <Button 
                  onClick={() => onUpdateStatus(order.id, 'cancelled')} 
                  variant="destructive"
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 w-full h-12 text-base font-bold"
                >
                  REJEITAR
                </Button>
              </div>
            )}

            {order.status === 'cancelled' && (
              <Button 
                onClick={() => onUpdateStatus(order.id, 'pending')} 
                className="bg-yellow-500 hover:bg-yellow-600 text-white w-full h-12 font-bold"
              >
                REVERTER PARA PENDENTE
              </Button>
            )}

            {order.status === 'preparing' && (
              <Button 
                onClick={() => onUpdateStatus(order.id, 'ready')} 
                className="bg-blue-600 hover:bg-blue-700 text-white w-full h-12 font-bold"
              >
                MARCAR COMO PRONTO
              </Button>
            )}

            {order.status === 'ready' && (
              <Button 
                onClick={() => onUpdateStatus(order.id, 'delivery')} 
                className="bg-purple-600 hover:bg-purple-700 text-white w-full h-12 font-bold"
              >
                SAIU PARA ENTREGA
              </Button>
            )}

            {order.status === 'delivery' && (
              <Button 
                onClick={() => onUpdateStatus(order.id, 'completed')} 
                className="bg-zinc-800 hover:bg-zinc-900 text-white w-full h-12 font-bold"
              >
                FINALIZAR PEDIDO
              </Button>
            )}
          </div>

          {/* Customer Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-900 font-semibold">
              <User className="w-5 h-5 text-zinc-500" />
              <h3>Cliente</h3>
            </div>
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
              <p className="font-medium text-lg text-zinc-900">{order.customer_name}</p>
              <p className="text-zinc-500">{order.customer_phone}</p>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-900 font-semibold">
              <MapPin className="w-5 h-5 text-zinc-500" />
              <h3>Entrega</h3>
            </div>
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
              <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase mb-2 ${
                order.delivery_type === 'delivery' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {order.delivery_type === 'delivery' ? 'Delivery' : 'Retirada'}
              </span>
              {order.delivery_type === 'delivery' && order.address ? (
                <p className="text-zinc-700 leading-relaxed">{order.address}</p>
              ) : (
                <p className="text-zinc-500 italic">Retirada no local</p>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-900 font-semibold">
              <CreditCard className="w-5 h-5 text-zinc-500" />
              <h3>Pagamento</h3>
            </div>
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 flex justify-between items-center">
              <div>
                <p className="text-sm text-zinc-500 mb-1">Método</p>
                <p className="font-medium text-zinc-900 uppercase">
                  {order.payment_method === 'pix' ? 'Pix' :
                   order.payment_method === 'credit_card' ? 'Cartão de Crédito' :
                   order.payment_method === 'debit_card' ? 'Cartão de Débito' :
                   order.payment_method === 'cash' ? 'Dinheiro' :
                   order.payment_method || 'Não informado'}
                </p>
              </div>
              {order.payment_method === 'cash' && order.change_for && (
                <div className="text-right">
                  <p className="text-sm text-zinc-500 mb-1">Troco para</p>
                  <p className="font-medium text-zinc-900">{formatCurrency(order.change_for)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-900 font-semibold">
              <ShoppingBag className="w-5 h-5 text-zinc-500" />
              <h3>Itens do Pedido</h3>
            </div>
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-zinc-100">
                {order.items.map((item) => (
                  <div key={item.id} className="p-4 bg-white">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-zinc-900">
                        {item.quantity}x {item.product_name}
                      </span>
                      <span className="font-semibold text-zinc-900">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                    
                    {item.addons.length > 0 && (
                      <div className="pl-4 mt-2 space-y-1">
                        {item.addons.map((addon) => (
                          <div key={addon.id} className="text-sm text-zinc-500 flex justify-between">
                            <span>+ {addon.addon_name}</span>
                            {/* <span>{formatCurrency(addon.price)}</span> */}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {item.observation && (
                      <div className="mt-2 text-sm text-zinc-500 bg-yellow-50 p-2 rounded border border-yellow-100 italic">
                        Obs: {item.observation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-zinc-50 p-4 border-t border-zinc-200 flex justify-between items-center">
                <span className="font-bold text-zinc-900">Total</span>
                <span className="font-bold text-xl text-purple-600">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
