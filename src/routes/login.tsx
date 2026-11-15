import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fase2 } from "@/components/reativa/bits";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () => seo("Entrar", "Acesso ao Reativa."),
  component: Login,
});
function Login() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4 pt-6">
      <img src="/reativa-logo.png" alt="Reativa — Gestão inteligente" className="mx-auto w-72" />
      <Button disabled className="w-full" variant="outline">Entrar com gov.br</Button>
      <div className="text-center"><Fase2 /></div>
      <Input placeholder="Usuário" /><Input type="password" placeholder="Senha" />
      <Button className="w-full" onClick={() => navigate({ to: "/gabinete/prontidao" })}>Entrar</Button>
      <p className="text-center text-xs text-muted-foreground">Protótipo: qualquer credencial funciona.</p>
    </div>
  );
}
