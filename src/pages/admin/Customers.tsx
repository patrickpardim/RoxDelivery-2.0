import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function Customers() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
        <p className="text-zinc-500">Visualize seus clientes cadastrados.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Base de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500">Em breve você poderá ver seus clientes aqui.</p>
        </CardContent>
      </Card>
    </div>
  );
}
