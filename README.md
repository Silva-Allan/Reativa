# Reativa

Protótipo de gestão inteligente de desastres para Defesa Civil municipal, demonstrado no município fictício de Vale Sereno. Todos os dados são fictícios.

## Desenvolvimento

Requer Node.js 22+ (ou Bun).

```sh
npm install
npm run dev
```

Outros comandos:

```sh
npm test        # testes (Vitest)
npm run lint    # ESLint + Prettier
npm run build   # build de produção (Nitro)
```

## Estrutura

- `src/store/app.ts` — estado da demo (Zustand); `buildState(step)` reconstrói cada passo do roteiro.
- `src/store/selectors.ts` — totais de assistência, FIDE e métricas derivados dos mesmos registros.
- `src/mock/` — dados do cenário e modelo de risco (H3).
- `src/routes/` — telas (TanStack Start).

## Feito com

- TanStack Start, React, TypeScript
- Tailwind CSS
- Leaflet + basemap OpenFreeMap sem rótulos
- h3-js
