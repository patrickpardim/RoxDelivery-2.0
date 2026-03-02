import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Link as LinkIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Types
type AddonCategory = {
  id: string;
  name: string;
  is_mandatory: boolean;
  min_quantity: number;
  max_quantity: number;
  addons?: Addon[];
  product_count?: number;
};

type Addon = {
  id: string;
  category_id: string;
  name: string;
  price: number;
  max_quantity: number;
  is_active: boolean;
};

type Product = {
  id: string;
  name: string;
};

// Schemas
const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  is_mandatory: z.boolean().default(false),
  min_quantity: z.coerce.number().min(0),
  max_quantity: z.coerce.number().min(1),
});

const addonSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  price: z.string(),
  max_quantity: z.coerce.number().min(1),
});

export default function Addons() {
  const { profile } = useOutletContext<any>();
  const [categories, setCategories] = useState<AddonCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AddonCategory | null>(null);
  
  // Association Modal State
  const [isAssociationModalOpen, setIsAssociationModalOpen] = useState(false);
  const [associatingCategory, setAssociatingCategory] = useState<AddonCategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [loadingAssociations, setLoadingAssociations] = useState(false);

  // Forms
  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      is_mandatory: false,
      min_quantity: 0,
      max_quantity: 1
    }
  });

  // Fetch Data
  const fetchData = async () => {
    if (!profile || !supabase) return;
    setLoading(true);
    try {
      // Fetch categories
      const { data: cats, error: catsError } = await supabase
        .from('addon_categories')
        .select('*, addons(*)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (catsError) throw catsError;

      // Fetch product counts for each category
      const categoriesWithCounts = await Promise.all(cats.map(async (cat) => {
        const { count } = await supabase
          .from('product_addon_categories')
          .select('*', { count: 'exact', head: true })
          .eq('addon_category_id', cat.id);
        
        // Sort addons by created_at (if we had that field in type, assuming default sort for now)
        const sortedAddons = (cat.addons || []).sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        return { ...cat, addons: sortedAddons, product_count: count || 0 };
      }));

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar complementos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  // Category Handlers
  const onCategorySubmit = async (data: z.infer<typeof categorySchema>) => {
    if (!profile || !supabase) return;
    try {
      if (editingCategory) {
        await supabase.from('addon_categories').update({
          name: data.name,
          is_mandatory: data.is_mandatory,
          min_quantity: data.min_quantity,
          max_quantity: data.max_quantity
        }).eq('id', editingCategory.id);
        toast.success('Categoria atualizada');
      } else {
        await supabase.from('addon_categories').insert({
          user_id: profile.id,
          name: data.name,
          is_mandatory: data.is_mandatory,
          min_quantity: data.min_quantity,
          max_quantity: data.max_quantity
        });
        toast.success('Categoria criada');
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar categoria');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Tem certeza? Isso apagará todos os complementos desta categoria.')) return;
    if (!supabase) return;
    await supabase.from('addon_categories').delete().eq('id', id);
    fetchData();
    toast.success('Categoria removida');
  };

  // Addon Handlers (Inline)
  const handleAddAddon = async (categoryId: string, name: string, priceStr: string, maxQtyStr: string) => {
    if (!name) return toast.error('Nome é obrigatório');
    if (!supabase) return;

    const price = parseFloat(priceStr.replace(',', '.')) || 0;
    const maxQty = parseInt(maxQtyStr) || 1;

    try {
      await supabase.from('addons').insert({
        category_id: categoryId,
        name,
        price,
        max_quantity: maxQty
      });
      toast.success('Complemento adicionado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao adicionar complemento');
    }
  };

  const updateAddon = async (addon: Addon, updates: Partial<Addon>) => {
    if (!supabase) return;
    try {
      await supabase.from('addons').update(updates).eq('id', addon.id);
      fetchData();
      toast.success('Complemento atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar complemento');
    }
  };

  const deleteAddon = async (id: string) => {
    if (!confirm('Excluir complemento?')) return;
    if (!supabase) return;
    await supabase.from('addons').delete().eq('id', id);
    fetchData();
    toast.success('Complemento removido');
  };

  // Association Handlers
  const openAssociationModal = async (category: AddonCategory) => {
    setAssociatingCategory(category);
    setLoadingAssociations(true);
    setIsAssociationModalOpen(true);
    
    if (!supabase || !profile) return;

    try {
      // Fetch all products
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, name')
        .eq('user_id', profile.id);
      
      setProducts(allProducts || []);

      // Fetch existing associations
      const { data: associations } = await supabase
        .from('product_addon_categories')
        .select('product_id')
        .eq('addon_category_id', category.id);
      
      const associatedIds = new Set((associations || []).map(a => a.product_id));
      setSelectedProductIds(associatedIds);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoadingAssociations(false);
    }
  };

  const toggleProductAssociation = (productId: string) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProductIds(newSelected);
  };

  const saveAssociations = async () => {
    if (!associatingCategory || !supabase) return;
    setLoadingAssociations(true);
    try {
      // Delete all existing associations for this category
      await supabase
        .from('product_addon_categories')
        .delete()
        .eq('addon_category_id', associatingCategory.id);

      // Insert new associations
      const newAssociations = Array.from(selectedProductIds).map(productId => ({
        product_id: productId,
        addon_category_id: associatingCategory.id
      }));

      if (newAssociations.length > 0) {
        await supabase.from('product_addon_categories').insert(newAssociations);
      }

      toast.success('Associações salvas');
      setIsAssociationModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar associações');
    } finally {
      setLoadingAssociations(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Complementos</h2>
        <Button 
          className="bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => { 
            setEditingCategory(null); 
            categoryForm.reset({ is_mandatory: false, min_quantity: 0, max_quantity: 1 }); 
            setIsCategoryModalOpen(true); 
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      <div className="space-y-6">
        {categories.map(category => (
          <Card key={category.id} className="overflow-hidden border border-zinc-200 shadow-sm">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 py-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold text-zinc-900">{category.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                    <span className={category.is_mandatory ? "text-red-600 font-medium" : "text-zinc-500"}>
                      {category.is_mandatory ? 'Obrigatório' : 'Opcional'}
                    </span>
                    <span>•</span>
                    <span>Min: {category.min_quantity}</span>
                    <span>•</span>
                    <span>Max: {category.max_quantity}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100"
                    onClick={() => openAssociationModal(category)}
                  >
                    Associar ({category.product_count})
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      setEditingCategory(category);
                      categoryForm.reset({
                        name: category.name,
                        is_mandatory: category.is_mandatory,
                        min_quantity: category.min_quantity,
                        max_quantity: category.max_quantity
                      });
                      setIsCategoryModalOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 text-zinc-500" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => deleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-100">
                    <tr>
                      <th className="px-6 py-3 font-medium">Nome do modificador</th>
                      <th className="px-6 py-3 font-medium">Preço</th>
                      <th className="px-6 py-3 font-medium">Qtd Max</th>
                      <th className="px-6 py-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {category.addons?.map(addon => (
                      <AddonRow key={addon.id} addon={addon} onUpdate={updateAddon} onDelete={deleteAddon} />
                    ))}
                    <NewAddonRow categoryId={category.id} onAdd={handleAddAddon} />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {categories.length === 0 && (
          <div className="text-center py-12 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
            <p className="text-zinc-500">Nenhuma categoria de complementos criada.</p>
          </div>
        )}
      </div>

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-6">
                <Input 
                  label="Nome da Categoria" 
                  placeholder="Ex: Frutas, Molhos..."
                  {...categoryForm.register('name')} 
                  error={categoryForm.formState.errors.name?.message}
                />
                
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="is_mandatory"
                    className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-600"
                    {...categoryForm.register('is_mandatory')}
                  />
                  <label htmlFor="is_mandatory" className="text-sm font-medium text-zinc-700">
                    Obrigatório
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Mínimo" 
                    type="number"
                    {...categoryForm.register('min_quantity')} 
                    error={categoryForm.formState.errors.min_quantity?.message}
                  />
                  <Input 
                    label="Máximo" 
                    type="number"
                    {...categoryForm.register('max_quantity')} 
                    error={categoryForm.formState.errors.max_quantity?.message}
                  />
                </div>

                <div className="flex justify-start gap-2 pt-2">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white w-24">
                    Salvar
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Association Modal */}
      {isAssociationModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] flex flex-col">
            <CardHeader>
              <CardTitle>Associar Produtos</CardTitle>
              <p className="text-sm text-zinc-500">Selecione os produtos que terão a categoria "{associatingCategory?.name}"</p>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {loadingAssociations ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {products.map(product => (
                    <div 
                      key={product.id} 
                      className="flex items-center justify-between px-6 py-3 hover:bg-zinc-50 cursor-pointer"
                      onClick={() => toggleProductAssociation(product.id)}
                    >
                      <span className="text-sm font-medium">{product.name}</span>
                      <div className={cn(
                        "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                        selectedProductIds.has(product.id) 
                          ? "bg-purple-600 border-purple-600 text-white" 
                          : "border-zinc-300 bg-white"
                      )}>
                        {selectedProductIds.has(product.id) && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && (
                    <div className="p-6 text-center text-zinc-500">Nenhum produto cadastrado.</div>
                  )}
                </div>
              )}
            </CardContent>
            <div className="p-6 border-t border-zinc-100 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAssociationModalOpen(false)}>Cancelar</Button>
              <Button onClick={saveAssociations} disabled={loadingAssociations}>Salvar Associações</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function AddonRow({ addon, onUpdate, onDelete }: { 
  addon: Addon, 
  onUpdate: (addon: Addon, updates: Partial<Addon>) => void,
  onDelete: (id: string) => void 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(addon.name);
  const [price, setPrice] = useState(addon.price.toString());
  const [maxQty, setMaxQty] = useState(addon.max_quantity.toString());

  const handleSave = () => {
    const numPrice = parseFloat(price.replace(',', '.')) || 0;
    const numMaxQty = parseInt(maxQty) || 1;
    onUpdate(addon, { name, price: numPrice, max_quantity: numMaxQty });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <tr className="bg-purple-50/50">
        <td className="px-6 py-3">
          <input 
            className="w-full bg-white border border-zinc-300 rounded px-2 py-1 text-sm"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </td>
        <td className="px-6 py-3">
          <input 
            className="w-24 bg-white border border-zinc-300 rounded px-2 py-1 text-sm"
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
        </td>
        <td className="px-6 py-3">
          <input 
            className="w-16 bg-white border border-zinc-300 rounded px-2 py-1 text-sm"
            value={maxQty}
            onChange={e => setMaxQty(e.target.value)}
          />
        </td>
        <td className="px-6 py-3 text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={handleSave} className="h-7 px-2">Salvar</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 px-2">X</Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-zinc-50/50 group">
      <td className="px-6 py-3 text-zinc-900">{addon.name}</td>
      <td className="px-6 py-3 text-zinc-600">{formatCurrency(addon.price)}</td>
      <td className="px-6 py-3 text-zinc-600">{addon.max_quantity}</td>
      <td className="px-6 py-3 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setIsEditing(true)} className="text-zinc-400 hover:text-purple-600">
            <Pencil className="h-4 w-4" />
          </button>
          <button 
            onClick={() => onUpdate(addon, { is_active: !addon.is_active })} 
            className={addon.is_active ? "text-blue-500 hover:text-blue-600" : "text-zinc-400 hover:text-zinc-600"}
          >
            {addon.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button onClick={() => onDelete(addon.id)} className="text-red-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function NewAddonRow({ categoryId, onAdd }: { categoryId: string, onAdd: (catId: string, name: string, price: string, maxQty: string) => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [maxQty, setMaxQty] = useState('1');

  const handleAdd = () => {
    if (!name) return;
    onAdd(categoryId, name, price, maxQty);
    setName('');
    setPrice('');
    setMaxQty('1');
  };

  return (
    <tr className="bg-zinc-50/30">
      <td className="px-6 py-3">
        <input 
          className="w-full bg-white border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          placeholder="Novo item"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
      </td>
      <td className="px-6 py-3">
        <input 
          className="w-24 bg-white border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          placeholder="0.00"
          value={price}
          onChange={e => setPrice(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
      </td>
      <td className="px-6 py-3">
        <input 
          className="w-16 bg-white border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          value={maxQty}
          onChange={e => setMaxQty(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
      </td>
      <td className="px-6 py-3 text-right">
        <Button 
          size="sm" 
          className="bg-zinc-900 text-white hover:bg-black h-9"
          onClick={handleAdd}
          disabled={!name}
        >
          Adicionar
        </Button>
      </td>
    </tr>
  );
}
