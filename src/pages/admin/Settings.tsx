import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';

const dayNames = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const timeSlotSchema = z.object({
  open: z.string().min(1, 'Horário de abertura obrigatório'),
  close: z.string().min(1, 'Horário de fechamento obrigatório'),
});

const settingsSchema = z.object({
  restaurant_name: z.string().min(1, 'Nome do restaurante é obrigatório'),
  delivery_fee: z.coerce.number().min(0, 'Taxa de entrega deve ser positiva'),
  min_order_value: z.coerce.number().min(0, 'Pedido mínimo deve ser positivo'),
  free_shipping_threshold: z.coerce.number().nullable().optional(),
  address_cep: z.string().min(8, 'CEP inválido'),
  address_street: z.string().min(1, 'Rua obrigatória'),
  address_number: z.string().min(1, 'Número obrigatório'),
  address_neighborhood: z.string().min(1, 'Bairro obrigatório'),
  address_city: z.string().min(1, 'Cidade obrigatória'),
  address_state: z.string().min(2, 'Estado obrigatório'),
  address_complement: z.string().optional(),
  payment_methods: z.array(z.string()).min(1, 'Selecione pelo menos uma forma de pagamento'),
  opening_hours: z.record(z.string(), z.array(timeSlotSchema)),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: {
      restaurant_name: '',
      delivery_fee: 0,
      min_order_value: 0,
      free_shipping_threshold: null,
      address_cep: '',
      address_street: '',
      address_number: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
      address_complement: '',
      payment_methods: ['pix', 'credit_card', 'debit_card', 'cash'],
      opening_hours: {
        monday: [{ open: '08:00', close: '22:00' }],
        tuesday: [{ open: '08:00', close: '22:00' }],
        wednesday: [{ open: '08:00', close: '22:00' }],
        thursday: [{ open: '08:00', close: '22:00' }],
        friday: [{ open: '08:00', close: '23:00' }],
        saturday: [{ open: '08:00', close: '23:00' }],
        sunday: [{ open: '08:00', close: '22:00' }],
      },
    },
  });

  const openingHours = (watch('opening_hours') || {}) as Record<string, { open: string; close: string; }[]>;

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('restaurant_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading settings:', error);
          toast.error('Erro ao carregar configurações');
          return;
        }

        if (data) {
          setValue('restaurant_name', data.restaurant_name);
          setValue('delivery_fee', data.delivery_fee);
          setValue('min_order_value', data.min_order_value);
          setValue('free_shipping_threshold', data.free_shipping_threshold);
          setValue('address_cep', data.address_cep || '');
          setValue('address_street', data.address_street || '');
          setValue('address_number', data.address_number || '');
          setValue('address_neighborhood', data.address_neighborhood || '');
          setValue('address_city', data.address_city || '');
          setValue('address_state', data.address_state || '');
          setValue('address_complement', data.address_complement || '');
          setValue('payment_methods', data.payment_methods || []);
          setValue('opening_hours', data.opening_hours || {});
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [user, setValue]);

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setValue('address_street', data.logradouro);
        setValue('address_neighborhood', data.bairro);
        setValue('address_city', data.localidade);
        setValue('address_state', data.uf);
      } else {
        toast.error('CEP não encontrado');
      }
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast.error('Erro ao buscar CEP');
    }
  };

  const onSubmit: SubmitHandler<SettingsForm> = async (data) => {
    if (!user) return;
    setSaving(true);

    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('restaurant_settings')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('restaurant_settings')
          .insert({
            ...data,
            user_id: user.id,
          });
        error = insertError;
      }

      if (error) throw error;
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const addTimeSlot = (day: string) => {
    const currentSlots = openingHours[day] || [];
    setValue(`opening_hours.${day}`, [...currentSlots, { open: '08:00', close: '18:00' }]);
  };

  const removeTimeSlot = (day: string, index: number) => {
    const currentSlots = openingHours[day] || [];
    setValue(
      `opening_hours.${day}`,
      currentSlots.filter((_, i) => i !== index)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Configurações do Restaurante</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Informações Básicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Restaurante
              </label>
              <input
                {...register('restaurant_name')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.restaurant_name && (
                <p className="text-red-500 text-sm mt-1">{errors.restaurant_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taxa de Entrega (R$)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('delivery_fee')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.delivery_fee && (
                <p className="text-red-500 text-sm mt-1">{errors.delivery_fee.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pedido Mínimo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('min_order_value')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.min_order_value && (
                <p className="text-red-500 text-sm mt-1">{errors.min_order_value.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frete Grátis acima de (R$) - Opcional
              </label>
              <input
                type="number"
                step="0.01"
                {...register('free_shipping_threshold')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Endereço</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <input
                {...register('address_cep')}
                onBlur={handleCepBlur}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="00000-000"
              />
              {errors.address_cep && (
                <p className="text-red-500 text-sm mt-1">{errors.address_cep.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
              <input
                {...register('address_street')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.address_street && (
                <p className="text-red-500 text-sm mt-1">{errors.address_street.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input
                {...register('address_number')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.address_number && (
                <p className="text-red-500 text-sm mt-1">{errors.address_number.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input
                {...register('address_neighborhood')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.address_neighborhood && (
                <p className="text-red-500 text-sm mt-1">{errors.address_neighborhood.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                {...register('address_city')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.address_city && (
                <p className="text-red-500 text-sm mt-1">{errors.address_city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input
                {...register('address_state')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {errors.address_state && (
                <p className="text-red-500 text-sm mt-1">{errors.address_state.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
              <input
                {...register('address_complement')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </section>

        {/* Payment Methods */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Formas de Pagamento</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                value="pix"
                {...register('payment_methods')}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span>Pix</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                value="credit_card"
                {...register('payment_methods')}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span>Cartão de Crédito</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                value="debit_card"
                {...register('payment_methods')}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span>Cartão de Débito</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                value="cash"
                {...register('payment_methods')}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span>Dinheiro</span>
            </label>
            {errors.payment_methods && (
              <p className="text-red-500 text-sm mt-1">{errors.payment_methods.message}</p>
            )}
          </div>
        </section>

        {/* Opening Hours */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Horário de Atendimento</h2>
          <div className="space-y-6">
            {Object.entries(dayNames).map(([key, label]) => (
              <div key={key} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-700">{label}</h3>
                  <button
                    type="button"
                    onClick={() => addTimeSlot(key)}
                    className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Adicionar horário
                  </button>
                </div>
                
                <div className="space-y-2">
                  {(openingHours[key] || []).map((_, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        {...register(`opening_hours.${key}.${index}.open`)}
                        className="px-2 py-1 border rounded text-sm"
                      />
                      <span className="text-gray-500">até</span>
                      <input
                        type="time"
                        {...register(`opening_hours.${key}.${index}.close`)}
                        className="px-2 py-1 border rounded text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(key, index)}
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(openingHours[key] || []).length === 0 && (
                    <p className="text-sm text-gray-400 italic">Fechado</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-bold text-lg shadow-sm transition-all"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Salvar Alterações
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
