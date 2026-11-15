import { createFileRoute, redirect } from "@tanstack/react-router";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seo("Prontidão", "Painel de prontidão do gabinete de crise de Vale Sereno."),
  beforeLoad: () => { throw redirect({ to: "/gabinete/prontidao" }); },
});
