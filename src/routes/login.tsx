import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fase2 } from "@/components/reativa/bits";
import { seo } from "@/lib/seo";
import reativaIcon from "@/assets/reativa-icon.png";

export const Route = createFileRoute("/login")({
  head: () => seo("Entrar", "Acesso ao Reativa."),
  component: Login,
});
function Login() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4 pt-6">
      <div className="flex flex-col items-center gap-2">
        <img src={reativaIcon} alt="" className="h-16 w-16 rounded-full" />
        <div className="text-center"><div className="text-3xl font-semibold tracking-tight">Reativa</div><div className="text-sm text-muted-foreground">Gestão inteligente de desastres</div></div>
      </div>
      <Button disabled className="w-full" variant="outline">Entrar com gov.br</Button>
      <div className="text-center"><Fase2 /></div>
      <Input placeholder="Usuário" /><Input type="password" placeholder="Senha" />
      <Button className="w-full" onClick={() => navigate({ to: "/gabinete/prontidao" })}>Entrar</Button>
      <p className="text-center text-xs text-muted-foreground">Protótipo: qualquer credencial funciona.</p>
    </div>
  );
}
