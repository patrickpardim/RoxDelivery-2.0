import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Plus, Pencil, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatCurrency } from '@/lib/utils';

// Types
type Category = { id: string; name: string; sort_order: number };
type Product = { 
  id: string; 
  name: string; 
  description: string; 
  price: number; 
  category_id: string;
  image_url?: string;
  is_active: boolean;
};

// Schemas
const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
});

const productFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  price: z.string().min(1, 'Preço é obrigatório'),
  category_id: z.string().min(1, 'Categoria é obrigatória'),
  image_url: z.string().optional(),
});

export default function MenuManager() {
  const { profile } = useOutletContext<any>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Forms
  const categoryForm = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
  });

  const productForm = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
  });

  // Fetch Data
  const fetchData = async () => {
    if (!profile || !supabase) return;
    setLoading(true);
    try {
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', profile.id)
        .order('sort_order', { ascending: true });
      
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      setCategories(cats || []);
      setProducts(prods || []);
    } catch (error) {
      toast.error('Erro ao carregar cardápio');
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
        await supabase.from('categories').update({ name: data.name }).eq('id', editingCategory.id);
        toast.success('Categoria atualizada');
      } else {
        await supabase.from('categories').insert({ 
          name: data.name, 
          user_id: profile.id,
          sort_order: categories.length 
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
    if (!confirm('Tem certeza? Isso apagará todos os produtos desta categoria.')) return;
    if (!supabase) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchData();
    toast.success('Categoria removida');
  };

  // Product Handlers
  const toggleProductStatus = async (product: Product) => {
    if (!supabase) return;
    try {
      const newStatus = !product.is_active;
      await supabase.from('products').update({ is_active: newStatus }).eq('id', product.id);
      
      // Optimistic update
      setProducts(products.map(p => p.id === product.id ? { ...p, is_active: newStatus } : p));
      
      toast.success(`Produto ${newStatus ? 'ativado' : 'desativado'}`);
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const onProductSubmit = async (data: z.infer<typeof productFormSchema>) => {
    if (!profile || !supabase) return;
    try {
      const price = parseFloat(data.price.replace(',', '.'));
      if (isNaN(price)) {
        productForm.setError('price', { message: 'Preço inválido' });
        return;
      }

      const payload = {
        name: data.name,
        description: data.description,
        price: price,
        category_id: data.category_id,
        image_url: data.image_url,
        user_id: profile.id
      };

      if (editingProduct) {
        await supabase.from('products').update(payload).eq('id', editingProduct.id);
        toast.success('Produto atualizado');
      } else {
        await supabase.from('products').insert(payload);
        toast.success('Produto criado');
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      productForm.reset();
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar produto');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    if (!supabase) return;
    await supabase.from('products').delete().eq('id', id);
    fetchData();
    toast.success('Produto removido');
  };

  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      productForm.reset({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        category_id: product.category_id,
        image_url: product.image_url || ''
      });
    } else {
      setEditingProduct(null);
      productForm.reset({
        category_id: categories[0]?.id // Default to first category
      });
    }
    setIsProductModalOpen(true);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Gerenciar Cardápio</h2>
        <Button onClick={() => { setEditingCategory(null); categoryForm.reset(); setIsCategoryModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card className="bg-zinc-50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <p>Você ainda não tem categorias.</p>
            <Button variant="outline" className="mt-4" onClick={() => setIsCategoryModalOpen(true)}>
              Criar primeira categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {categories.map(category => (
            <div key={category.id} className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <h3 className="text-lg font-semibold">{category.name}</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditingCategory(category);
                    categoryForm.setValue('name', category.name);
                    setIsCategoryModalOpen(true);
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => deleteCategory(category.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {products.filter(p => p.category_id === category.id).map(product => (
                  <Card key={product.id} className={`overflow-hidden group transition-opacity ${!product.is_active ? 'opacity-75' : ''}`}>
                    <div className="aspect-video w-full bg-zinc-100 relative">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                      
                      {/* Actions Overlay - Always visible or on hover based on preference, using absolute positioning */}
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openProductModal(product); }}
                          className="h-8 w-8 bg-white rounded-full shadow-sm flex items-center justify-center text-zinc-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }}
                          className="h-8 w-8 bg-white rounded-full shadow-sm flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleProductStatus(product); }}
                          className={`h-8 px-3 rounded-full shadow-sm flex items-center justify-center text-xs font-semibold transition-colors ${
                            product.is_active 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                          }`}
                          title={product.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium truncate">{product.name}</h4>
                        <span className="font-semibold text-purple-600">{formatCurrency(product.price)}</span>
                      </div>
                      <p className="text-sm text-zinc-500 line-clamp-2">{product.description}</p>
                    </CardContent>
                  </Card>
                ))}
                
                <button 
                  onClick={() => {
                    setEditingProduct(null);
                    productForm.reset({ category_id: category.id });
                    setIsProductModalOpen(true);
                  }}
                  className="flex flex-col items-center justify-center h-full min-h-[200px] border-2 border-dashed border-zinc-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors text-zinc-400 hover:text-purple-600"
                >
                  <Plus className="h-8 w-8 mb-2" />
                  <span className="font-medium">Adicionar Produto</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</CardTitle>
              <button onClick={() => setIsCategoryModalOpen(false)}><span className="sr-only">Fechar</span>×</button>
            </CardHeader>
            <CardContent>
              <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                <Input 
                  label="Nome da Categoria" 
                  {...categoryForm.register('name')} 
                  error={categoryForm.formState.errors.name?.message}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</CardTitle>
              <button onClick={() => setIsProductModalOpen(false)}><span className="sr-only">Fechar</span>×</button>
            </CardHeader>
            <CardContent>
              <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4">
                <Input 
                  label="Nome do Produto" 
                  {...productForm.register('name')} 
                  error={productForm.formState.errors.name?.message}
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Descrição</label>
                  <textarea 
                    className="flex w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                    rows={3}
                    {...productForm.register('description')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Preço (R$)" 
                    placeholder="0.00"
                    {...productForm.register('price')} 
                    error={productForm.formState.errors.price?.message}
                  />
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700">Categoria</label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                      {...productForm.register('category_id')}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Input 
                  label="URL da Imagem (Opcional)" 
                  placeholder="https://..."
                  {...productForm.register('image_url')} 
                  error={productForm.formState.errors.image_url?.message}
                />
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
