import { useEffect, useState, InputHTMLAttributes } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/lib/cart';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency, cn } from '@/lib/utils';
import { ShoppingCart, Plus, Minus, Trash2, MessageCircle, MapPin, CreditCard, User, Loader2, X, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  category_id: string;
  addon_categories: AddonCategory[];
};

type AddonCategory = {
  id: string;
  name: string;
  is_mandatory: boolean;
  min_quantity: number;
  max_quantity: number;
  addons: Addon[];
};

type Addon = {
  id: string;
  name: string;
  price: number;
  max_quantity: number;
  is_active: boolean;
};

type Settings = {
  restaurant_name: string;
  delivery_fee: number;
  min_order_value: number;
  free_shipping_threshold: number | null;
  payment_methods: string[];
  opening_hours: Record<string, { open: string; close: string }[]>;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_complement?: string;
};

export default function PublicMenu() {
  const { slug } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Product Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, Addon[]>>({}); // categoryId -> addons[]
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Cart State
  const { items, addItem, removeItem, updateQuantity, total, clearCart, isCartOpen, closeCart, openCart } = useCartStore();
  
  // Checkout Form State
  const [isCheckout, setIsCheckout] = useState(false);
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Address State
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [complement, setComplement] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);

  // Delivery Fee & Free Shipping Logic
  const deliveryFee = settings?.delivery_fee ?? 5.00;
  const freeShippingThreshold = settings?.free_shipping_threshold ?? 50.00;
  const currentTotal = total();
  const remainingForFreeShipping = freeShippingThreshold ? Math.max(0, freeShippingThreshold - currentTotal) : 0;
  // If pickup, delivery fee is 0
  const finalDeliveryFee = deliveryType === 'pickup' ? 0 : (remainingForFreeShipping > 0 || !freeShippingThreshold ? deliveryFee : 0);
  const finalTotal = currentTotal + finalDeliveryFee;

  const handlePhoneBlur = async () => {
    if (customerPhone.length < 10 || !profile) return;
    
    try {
      // 1. Try to find in customers table using RPC (bypassing RLS)
      const { data: customers } = await supabase
        .rpc('get_customer_by_phone', {
          p_user_id: profile.id,
          p_phone: customerPhone
        });

      const customer = customers && customers.length > 0 ? customers[0] : null;

      if (customer) {
        setIsReturningCustomer(true);
        if (!customerName) setCustomerName(customer.name);
        
        if (deliveryType === 'delivery') {
          if (customer.cep) setCep(customer.cep);
          if (customer.street) setStreet(customer.street);
          if (customer.number) setNumber(customer.number);
          if (customer.neighborhood) setNeighborhood(customer.neighborhood);
          if (customer.city) setCity(customer.city);
          if (customer.state) setState(customer.state);
          if (customer.complement) setComplement(customer.complement);
        }
        toast.success('Bem-vindo de volta! Seus dados foram preenchidos.');
        return;
      }

      // 2. Fallback to orders table (for legacy data)
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', profile.id)
        .eq('customer_phone', customerPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (order) {
        setIsReturningCustomer(true);
        if (!customerName) setCustomerName(order.customer_name);
        
        // Try to parse address if it exists and we are in delivery mode
        if (order.address && deliveryType === 'delivery') {
          const cepMatch = order.address.match(/CEP: ([\d-]+)/);
          if (cepMatch) setCep(cepMatch[1]);
          
          const parts = order.address.split(' - ');
          if (parts.length >= 3) {
            const streetAndNum = parts[0].split(',');
            if (streetAndNum.length >= 2) {
              setStreet(streetAndNum[0].trim());
              setNumber(streetAndNum[1].trim());
            }
            setNeighborhood(parts[1].trim());
            
            const cityState = parts[2].split('/');
            if (cityState.length >= 2) {
              setCity(cityState[0].trim());
              setState(cityState[1].split(' ')[0].trim());
            }
          }
        }
        toast.success('Bem-vindo de volta! Seus dados foram preenchidos.');
      }
    } catch (error) {
      // Ignore error if not found
    }
  };

  const handleCepBlur = async () => {
    if (cep.length < 8) return;
    try {
      const cleanCep = cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setStreet(data.logradouro);
        setNeighborhood(data.bairro);
        setCity(data.localidade);
        setState(data.uf);
      } else {
        toast.error('CEP não encontrado');
      }
    } catch (error) {
      toast.error('Erro ao buscar CEP');
    }
  };

  useEffect(() => {
    if (!isCartOpen) {
      setIsCheckout(false);
    }
  }, [isCartOpen]);

  useEffect(() => {
    const fetchData = async () => {
      if (!supabase || !slug) return;
      setLoading(true);
      try {
        // 1. Get Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('store_slug', slug)
          .single();
        
        if (profileError || !profileData) {
          toast.error('Loja não encontrada');
          setLoading(false);
          return;
        }
        setProfile(profileData);

        // 1.1 Get Settings
        const { data: settingsData } = await supabase
          .from('restaurant_settings')
          .select('*')
          .eq('user_id', profileData.id)
          .single();
        
        if (settingsData) {
          setSettings(settingsData);
        }

        // 2. Get Categories
        const { data: cats } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', profileData.id)
          .order('sort_order', { ascending: true });
        setCategories(cats || []);

        // 3. Get Products with Addons
        const { data: prods } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('is_active', true);

        if (prods) {
          // Fetch addon categories for these products
          const productIds = prods.map(p => p.id);
          
          const { data: productAddonCats } = await supabase
            .from('product_addon_categories')
            .select(`
              product_id,
              addon_category:addon_categories (
                id,
                name,
                is_mandatory,
                min_quantity,
                max_quantity,
                addons (
                  id,
                  name,
                  price,
                  max_quantity,
                  is_active
                )
              )
            `)
            .in('product_id', productIds);

          // Map relations back to products
          const productsWithAddons = prods.map(p => {
            const relations = productAddonCats?.filter(r => r.product_id === p.id) || [];
            const addonCats = relations.map(r => r.addon_category).filter(Boolean);
            // Filter active addons only
            addonCats.forEach((cat: any) => {
              cat.addons = cat.addons.filter((a: any) => a.is_active);
            });
            return { ...p, addon_categories: addonCats };
          });

          setProducts(productsWithAddons);
        }

      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar cardápio');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setSelectedAddons({});
    setQuantity(1);
    setNotes('');
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
  };

  const handleAddonToggle = (category: AddonCategory, addon: Addon) => {
    setSelectedAddons(prev => {
      const current = prev[category.id] || [];
      const exists = current.find(a => a.id === addon.id);

      if (exists) {
        // Remove
        return { ...prev, [category.id]: current.filter(a => a.id !== addon.id) };
      } else {
        // Add (check max quantity)
        if (current.length >= category.max_quantity) {
          toast.error(`Máximo de ${category.max_quantity} opções nesta categoria`);
          return prev;
        }
        return { ...prev, [category.id]: [...current, addon] };
      }
    });
  };

  const calculateProductTotal = () => {
    if (!selectedProduct) return 0;
    let total = selectedProduct.price;
    
    (Object.values(selectedAddons).flat() as Addon[]).forEach(addon => {
      total += addon.price;
    });

    return total * quantity;
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    // Validate mandatory categories
    for (const cat of selectedProduct.addon_categories) {
      const selected = selectedAddons[cat.id] || [];
      if (cat.is_mandatory && selected.length < cat.min_quantity) {
        toast.error(`Selecione pelo menos ${cat.min_quantity} opção em ${cat.name}`);
        return;
      }
    }

    const flatAddons = Object.values(selectedAddons).flat() as Addon[];

    addItem({
      productId: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      quantity: quantity,
      notes: notes,
      addons: flatAddons.map(a => ({ id: a.id, name: a.name, price: a.price }))
    });

    toast.success('Adicionado ao carrinho');
    closeProductModal();
  };

  const handleCheckout = async () => {
    if (!customerName || !customerPhone) {
      toast.error('Por favor, preencha nome e telefone');
      return;
    }

    if (deliveryType === 'delivery' && (!cep || !street || !number || !neighborhood || !city || !state)) {
      toast.error('Por favor, preencha o endereço completo');
      return;
    }

    // Construct address string
    let finalAddress = '';
    if (deliveryType === 'delivery') {
      finalAddress = `${street}, ${number} - ${neighborhood}, ${city}/${state} - CEP: ${cep}${complement ? ` (${complement})` : ''}`;
    } else {
      finalAddress = 'Retirada no Local';
    }

    setIsSubmitting(true);
    try {
      // 0. Upsert Customer using RPC (bypassing RLS)
      await supabase.rpc('upsert_customer', {
        p_user_id: profile.id,
        p_name: customerName,
        p_phone: customerPhone,
        p_address: finalAddress,
        p_cep: cep,
        p_street: street,
        p_number: number,
        p_neighborhood: neighborhood,
        p_city: city,
        p_state: state,
        p_complement: complement
      });

      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: profile.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          address: finalAddress,
          payment_method: paymentMethod,
          total_amount: finalTotal,
          status: 'pending',
          delivery_type: deliveryType // Ensure this column exists or we might need to store it in metadata/notes if not? 
          // Assuming delivery_type column exists based on Orders.tsx type definition: delivery_type: string;
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      for (const item of items) {
        const itemTotal = (item.price + item.addons.reduce((sum, a) => sum + a.price, 0)) * item.quantity;
        
        const { data: orderItem, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.productId,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: itemTotal,
            observation: item.notes
          })
          .select()
          .single();

        if (itemError) throw itemError;

        // 3. Create Addons
        if (item.addons.length > 0) {
          const addonsPayload = item.addons.map(addon => ({
            order_item_id: orderItem.id,
            addon_id: addon.id,
            addon_name: addon.name,
            price: addon.price
          }));
          
          const { error: addonsError } = await supabase
            .from('order_item_addons')
            .insert(addonsPayload);
            
          if (addonsError) throw addonsError;
        }
      }

      toast.success('Pedido realizado com sucesso!');
      
      // WhatsApp Message
      const message = `*Novo Pedido #${order.id.slice(0, 8)}*
------------------------------
${items.map(i => {
  const addonsStr = i.addons.length > 0 ? `\n   + ${i.addons.map(a => a.name).join(', ')}` : '';
  const notesStr = i.notes ? `\n   _Obs: ${i.notes}_` : '';
  return `${i.quantity}x ${i.name} (${formatCurrency(i.price)})${addonsStr}${notesStr}`;
}).join('\n')}
------------------------------
Subtotal: ${formatCurrency(currentTotal)}
Taxa de Entrega: ${deliveryType === 'pickup' ? 'N/A (Retirada)' : (remainingForFreeShipping > 0 || !freeShippingThreshold) ? formatCurrency(deliveryFee) : 'Grátis'}
*Total: ${formatCurrency(finalTotal)}*

*Cliente:* ${customerName}
*Tel:* ${customerPhone}
*Tipo:* ${deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}
${deliveryType === 'delivery' ? `*Endereço:* ${finalAddress}` : ''}
*Pagamento:* ${paymentMethod === 'pix' ? 'Pix' : paymentMethod === 'credit_card' ? 'Cartão de Crédito' : paymentMethod === 'debit_card' ? 'Cartão de Débito' : 'Dinheiro'}

_Acompanhe seu pedido pelo link:_
${window.location.origin}/pedido/${order.id}`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${profile.whatsapp_number}?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
      
      clearCart();
      closeCart();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Loja não encontrada</h1>
          <p className="text-zinc-500 mt-2">Verifique o endereço digitado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-start justify-between">
          <div className="flex-1 min-w-0 mr-4 space-y-1">
            <h1 className="text-2xl font-bold text-zinc-900 truncate">
              {settings?.restaurant_name || profile.store_name}
            </h1>
            <div className="text-sm text-zinc-500 space-y-1">
              <p>
                Entrega • Mín. {formatCurrency(settings?.min_order_value || 0)}
              </p>
              <p className="truncate">
                {settings ? (
                  `${settings.address_street}, ${settings.address_number} - ${settings.address_neighborhood}, ${settings.address_city}/${settings.address_state}`
                ) : (
                  'Endereço não configurado'
                )}
              </p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            className="relative h-12 w-12 rounded-full bg-purple-50 hover:bg-purple-100 flex items-center justify-center shrink-0 p-0"
            onClick={openCart}
          >
            <ShoppingCart className="h-6 w-6 text-purple-600" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-purple-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-white shadow-sm">
                {items.length}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Menu Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {categories.map(category => {
          const categoryProducts = products.filter(p => p.category_id === category.id);
          if (categoryProducts.length === 0) return null;

          return (
            <div key={category.id} className="space-y-4">
              <h2 className="text-xl font-bold text-zinc-800">{category.name}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {categoryProducts.map(product => (
                  <Card key={product.id} className="overflow-hidden flex flex-row h-32 border-zinc-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => openProductModal(product)}>
                    {product.image_url && (
                      <div className="w-32 h-full bg-zinc-100 shrink-0">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 p-3 flex flex-col justify-between">
                      <div>
                        <h3 className="font-medium text-zinc-900 line-clamp-1">{product.name}</h3>
                        <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{product.description}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-semibold text-zinc-900">{formatCurrency(product.price)}</span>
                        <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                          <Plus className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </main>

      {/* Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeProductModal} />
          <div className="relative w-full max-w-2xl bg-white h-full sm:h-auto sm:max-h-[90vh] sm:rounded-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between z-10 bg-gradient-to-b from-black/50 to-transparent sm:hidden">
              <button onClick={closeProductModal} className="text-white drop-shadow-md">
                <ChevronLeft className="h-8 w-8" />
              </button>
            </div>
            <button onClick={closeProductModal} className="absolute top-4 right-4 z-10 bg-white/80 rounded-full p-1 hidden sm:block hover:bg-white">
              <X className="h-6 w-6 text-zinc-500" />
            </button>

            <div className="flex-1 overflow-y-auto">
              {selectedProduct.image_url && (
                <div className="h-64 w-full bg-zinc-100 relative">
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                </div>
              )}
              
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900">{selectedProduct.name}</h2>
                  <p className="text-zinc-500 mt-2">{selectedProduct.description}</p>
                  <p className="text-xl font-bold text-zinc-900 mt-4">{formatCurrency(selectedProduct.price)}</p>
                </div>

                {/* Addons */}
                <div className="space-y-6">
                  {selectedProduct.addon_categories.map(category => (
                    <div key={category.id} className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h3 className="font-bold text-zinc-900">{category.name}</h3>
                          <p className="text-xs text-zinc-500">
                            {category.is_mandatory 
                              ? `Obrigatório • Mín: ${category.min_quantity} • Máx: ${category.max_quantity}`
                              : `Opcional • Máx: ${category.max_quantity}`
                            }
                          </p>
                        </div>
                        {category.is_mandatory && <span className="text-[10px] font-bold bg-zinc-200 text-zinc-600 px-2 py-1 rounded">OBRIGATÓRIO</span>}
                      </div>

                      <div className="space-y-3">
                        {category.addons.map(addon => {
                          const isSelected = selectedAddons[category.id]?.some(a => a.id === addon.id);
                          return (
                            <div 
                              key={addon.id} 
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-zinc-200 cursor-pointer hover:border-purple-300 transition-colors"
                              onClick={() => handleAddonToggle(category, addon)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "h-5 w-5 rounded-full border flex items-center justify-center transition-colors",
                                  isSelected ? "border-purple-600 bg-purple-600" : "border-zinc-300"
                                )}>
                                  {isSelected && <div className="h-2 w-2 bg-white rounded-full" />}
                                </div>
                                <span className="text-sm font-medium text-zinc-700">{addon.name}</span>
                              </div>
                              <span className="text-sm text-zinc-500">
                                {addon.price > 0 ? `+ ${formatCurrency(addon.price)}` : 'Grátis'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Observation */}
                <div>
                  <label className="text-sm font-medium text-zinc-700 block mb-2">Observações</label>
                  <textarea 
                    className="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                    rows={3}
                    placeholder="Ex: Tirar a cebola, maionese à parte..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-zinc-200 bg-white flex items-center gap-4">
              <div className="flex items-center gap-3 bg-zinc-100 rounded-lg px-2 py-2">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-white rounded-md transition-colors disabled:opacity-50"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-bold w-4 text-center">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-white rounded-md transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button 
                className="flex-1 bg-purple-600 hover:bg-purple-700 h-12 text-base font-bold justify-between px-6"
                onClick={handleAddToCart}
              >
                <span>Adicionar</span>
                <span>{formatCurrency(calculateProductTotal())}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeCart} />
          <div className="relative w-full max-w-md bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-white">
              <h2 className="text-xl font-bold text-zinc-900">
                {isCheckout ? (
                  <button onClick={() => setIsCheckout(false)} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900">
                    <ChevronLeft className="h-5 w-5" /> Voltar
                  </button>
                ) : (
                  "Seu Pedido"
                )}
              </h2>
              <button onClick={closeCart} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X className="h-6 w-6 text-zinc-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-zinc-50">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4 p-8">
                  <div className="h-20 w-20 bg-zinc-100 rounded-full flex items-center justify-center">
                    <ShoppingCart className="h-10 w-10 opacity-20" />
                  </div>
                  <p className="text-lg font-medium">Seu carrinho está vazio</p>
                  <Button variant="outline" onClick={closeCart}>
                    Voltar ao Cardápio
                  </Button>
                </div>
              ) : (
                <>
                  {isCheckout ? (
                    /* Checkout Form View */
                    <div className="p-6 space-y-6 bg-white min-h-full">
                      {/* Delivery Type Toggle */}
                      <div className="bg-zinc-100 p-1 rounded-xl flex">
                        <button
                          onClick={() => setDeliveryType('delivery')}
                          className={cn(
                            "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                            deliveryType === 'delivery' ? "bg-white text-purple-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                          )}
                        >
                          Entrega
                        </button>
                        <button
                          onClick={() => setDeliveryType('pickup')}
                          className={cn(
                            "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                            deliveryType === 'pickup' ? "bg-white text-purple-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                          )}
                        >
                          Retirada
                        </button>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-lg">
                          <User className="h-5 w-5 text-purple-600" /> Seus Dados
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-zinc-500 ml-1 mb-1 block">Número de Telefone</label>
                            <Input 
                              placeholder="(00) 00000-0000"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              onBlur={handlePhoneBlur}
                              className="bg-zinc-50 border-zinc-200 h-11"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-zinc-500 ml-1 mb-1 block">Nome Completo</label>
                            <Input 
                              placeholder="Seu nome completo"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="bg-zinc-50 border-zinc-200 h-11"
                            />
                          </div>
                        </div>
                      </div>

                      {deliveryType === 'delivery' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-lg">
                            <MapPin className="h-5 w-5 text-purple-600" /> Endereço de Entrega
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-zinc-500 ml-1 mb-1 block">CEP</label>
                              <Input 
                                placeholder="00000-000"
                                value={cep}
                                onChange={(e) => setCep(e.target.value)}
                                onBlur={handleCepBlur}
                                className="bg-zinc-50 border-zinc-200 h-11"
                              />
                            </div>
                            
                            <div className="grid grid-cols-[2fr_1fr] gap-3">
                              <div>
                                <label className="text-xs font-medium text-zinc-500 ml-1 mb-1 block">Endereço</label>
                                <Input 
                                  placeholder="Rua..."
                                  value={street}
                                  onChange={(e) => setStreet(e.target.value)}
                                  className="bg-zinc-50 border-zinc-200 h-11"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-zinc-500 ml-1 mb-1 block">Número</label>
                                <Input 
                                  placeholder="123"
                                  value={number}
                                  onChange={(e) => setNumber(e.target.value)}
                                  className="bg-zinc-50 border-zinc-200 h-11"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-zinc-500 ml-1 mb-1 block">Bairro</label>
                                <Input 
                                  placeholder="Bairro"
                                  value={neighborhood}
                                  onChange={(e) => setNeighborhood(e.target.value)}
                                  className="bg-zinc-50 border-zinc-200 h-11"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-zinc-500 ml-1 mb-1 block">Cidade/UF</label>
                                <div className="flex gap-2">
                                  <Input 
                                    placeholder="Cidade"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="bg-zinc-50 border-zinc-200 h-11 flex-1"
                                  />
                                  <Input 
                                    placeholder="UF"
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    className="bg-zinc-50 border-zinc-200 h-11 w-12 text-center px-0"
                                    maxLength={2}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-xs font-medium text-zinc-500 ml-1 mb-1 block">Complemento (Opcional)</label>
                              <Input 
                                placeholder="Apto, Bloco, Ponto de referência..."
                                value={complement}
                                onChange={(e) => setComplement(e.target.value)}
                                className="bg-zinc-50 border-zinc-200 h-11"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-lg">
                          <CreditCard className="h-5 w-5 text-purple-600" /> Pagamento
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {(settings?.payment_methods || ['pix', 'credit_card', 'debit_card', 'cash']).map(method => {
                            const labels: Record<string, string> = {
                              pix: 'Pix',
                              credit_card: 'Crédito',
                              debit_card: 'Débito',
                              cash: 'Dinheiro'
                            };
                            return (
                              <button
                                key={method}
                                onClick={() => setPaymentMethod(method)}
                                className={cn(
                                  "py-3 px-2 rounded-xl border text-sm font-medium transition-all",
                                  paymentMethod === method 
                                    ? "border-purple-600 bg-purple-50 text-purple-700 shadow-sm" 
                                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                                )}
                              >
                                {labels[method] || method}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Cart Items View */
                    <div className="p-4 space-y-4">
                      {items.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-bold text-zinc-900 text-base">{item.name}</h4>
                              <p className="text-sm font-medium text-zinc-500 mt-1">
                                {formatCurrency(item.price)}
                              </p>
                              {item.addons.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {item.addons.map(a => (
                                    <div key={a.id} className="text-xs text-zinc-500 flex justify-between pr-4">
                                      <span>+ {a.name}</span>
                                      <span>{formatCurrency(a.price)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {item.notes && (
                                <p className="text-xs text-zinc-400 mt-2 italic bg-zinc-50 p-2 rounded border border-zinc-100">
                                  "{item.notes}"
                                </p>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <span className="font-bold text-zinc-900">
                                {formatCurrency((item.price + item.addons.reduce((sum, a) => sum + a.price, 0)) * item.quantity)}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2 border-t border-zinc-50">
                            <div className="flex items-center gap-3 bg-zinc-100 rounded-full px-1 py-1">
                              <button 
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-8 w-8 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-zinc-50 transition-colors text-zinc-600"
                              >
                                {item.quantity === 1 ? <Trash2 className="h-4 w-4 text-red-500" /> : <Minus className="h-4 w-4" />}
                              </button>
                              <span className="text-sm font-bold w-6 text-center text-zinc-900">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-8 w-8 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-zinc-50 transition-colors text-zinc-600"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="bg-white border-t border-zinc-100 p-6 space-y-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-10">
                {!isCheckout && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>Subtotal</span>
                      <span>{formatCurrency(currentTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>Taxa de Entrega</span>
                      <span>{deliveryType === 'pickup' ? 'N/A (Retirada)' : (remainingForFreeShipping > 0 || !freeShippingThreshold) ? formatCurrency(deliveryFee) : 'Grátis'}</span>
                    </div>
                    
                    {freeShippingThreshold && (
                      remainingForFreeShipping > 0 ? (
                        <div className="bg-purple-50 text-purple-700 text-xs font-medium px-3 py-2 rounded-lg text-center">
                          Faltam {formatCurrency(remainingForFreeShipping)} para frete grátis!
                        </div>
                      ) : (
                        <div className="bg-green-50 text-green-700 text-xs font-medium px-3 py-2 rounded-lg text-center">
                          Parabéns! Você ganhou frete grátis!
                        </div>
                      )
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-zinc-900">Total</span>
                  <span className="text-2xl font-bold text-zinc-900">{formatCurrency(finalTotal)}</span>
                </div>

                {isCheckout ? (
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 h-14 text-lg font-bold rounded-xl shadow-lg shadow-purple-200" 
                    onClick={handleCheckout}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <MessageCircle className="mr-2 h-5 w-5" />
                    )}
                    Enviar Pedido
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 h-14 text-lg font-bold rounded-xl shadow-lg shadow-purple-200 flex justify-between px-6" 
                    onClick={() => setIsCheckout(true)}
                  >
                    <span>Finalizar</span>
                    <ChevronLeft className="h-5 w-5 rotate-180" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input 
      className={cn(
        "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none",
        className
      )}
      {...props}
    />
  );
}
