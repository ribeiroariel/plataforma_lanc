---
name: revisar-cadastros-lanc
description: Lista cadastros de bolsista pendentes de aprovação no site do LANC e aprova ou rejeita quando o Ariel pedir explicitamente. Use quando o Ariel perguntar algo como "tem cadastro pendente?", "quem se cadastrou no site?", "aprova a Fulana", "recusa esse cadastro de bolsista". Nunca aprova ou rejeita sozinho sem o Ariel apontar a pessoa — sempre lista e espera a decisão dele.
---

# revisar-cadastros-lanc

## Por quê

Todo cadastro novo de bolsista nasce com `aprovado = false` (ver
`supabase/schema.sql`) e não enxerga a área de bolsista até o Ariel
aprovar. Em vez de mandar e-mail automático, o Ariel prefere revisar aqui,
no chat, quando ele pedir.

## Passo a passo

1. **Listar pendentes**: rode `node scripts/revisar-cadastros.mjs listar`
   dentro do repositório `plataforma-lanc` e mostre o resultado formatado
   pro Ariel (nome, e-mail, quando pediu).
2. **Esperar a decisão dele** — nunca aprove/rejeite sozinho, mesmo que só
   tenha um pendente. O Ariel precisa dizer explicitamente quem aprovar ou
   recusar.
3. **Aprovar**: `node scripts/revisar-cadastros.mjs aprovar <email-ou-id>`.
4. **Rejeitar**: `node scripts/revisar-cadastros.mjs rejeitar <email-ou-id>`
   — isso apaga a conta de login inteira (a pessoa pode se cadastrar de
   novo depois, se for engano).

## Pré-requisito

Precisa de `SUPABASE_SERVICE_ROLE_KEY` preenchida em `.env.local` (chave
"secret", nunca a "publishable"). Se estiver vazia, o script avisa e para
— peça a chave ao Ariel em vez de tentar contornar.
