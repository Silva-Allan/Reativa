import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useApp } from "@/store/app";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/demo")({
  head: () => seo("Modo demonstração", "Reinicia o cenário de inundação de Vale Sereno no passo 0."),
  component: Demo,
});
function Demo() {
  const navigate = useNavigate();
  useEffect(() => {
    useApp.getState().applyStep(0);
    useApp.setState({ demoMode: true, role: "Coordenador" });
    navigate({ to: "/gabinete/prontidao", replace: true });
  }, [navigate]);
  return <p className="text-sm text-muted-foreground">Reiniciando demonstração…</p>;
}
