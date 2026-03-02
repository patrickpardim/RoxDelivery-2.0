import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ChefHat, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <ChefHat className="h-5 w-5 text-purple-600" />
            </div>
            <span className="font-bold text-xl tracking-tight text-zinc-900">Rox Delivery</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button>Entrar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900">
            Seu delivery no <span className="text-purple-600">WhatsApp</span> em segundos.
          </h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
            Crie seu cardápio digital, receba pedidos organizados e aumente suas vendas.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/login">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full">
                Acessar Painel <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-zinc-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-zinc-200">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold">Cardápio Digital</h3>
              <p className="text-zinc-600">
                Adicione fotos, descrições e preços. Seu cliente acessa pelo link e monta o pedido sozinho.
              </p>
            </div>
            <div className="space-y-4">
              <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-zinc-200">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold">Pedidos no WhatsApp</h3>
              <p className="text-zinc-600">
                O pedido chega pronto no seu WhatsApp, com endereço e forma de pagamento. Sem erros de digitação.
              </p>
            </div>
            <div className="space-y-4">
              <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-zinc-200">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold">Gestão Simples</h3>
              <p className="text-zinc-600">
                Painel administrativo para você alterar preços, pausar produtos e ver estatísticas de vendas.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
