# Zerar a Cripta entre percursos de ensaio

Implementação de 01/10/2026. A ação usa Firestore e Wix reais quando publicada;
os testes automatizados usam provedores simulados. Não houve zerada em produção
nem validação autenticada no Wix durante o desenvolvimento.

## Como usar

1. Na **Cripta · Administração**, abra **Zerar Cripta para novo teste**.
2. Clique em **Conferir dados antes de zerar** e confira o inventário apresentado.
3. Marque a ciência da exclusão definitiva e das cópias externas; digite
   exatamente **ZERAR CRIPTA**. Clique em **Apagar os dados e reiniciar a Cripta**.
4. Aguarde **Zerada concluída**. Se houver falha, rede interrompida ou aba fechada,
   volte à mesma tela, confira o estado e use **Retomar zerada**. Não é necessário
   começar outra zerada. Operações interrompidas podem exigir até 15 minutos de espera.
5. Apague separadamente arquivos baixados, cópias A/B/C e arquivos dos Guardiões.
   Nenhum comando do Portal consegue apagar essas cópias externas.
6. Comece uma nova inauguração, gere novas chaves, nomeie a Comissão e abra o
   primeiro recebimento na tela de Reabertura. Feche abas antigas de escrita.
7. Escreva e deposite cartas de ensaio pelo fluxo normal; confira rascunho,
   anexos, recibo de depósito e o limite de cartas. Feche o recebimento, lacre,
   exporte o mesmo arquivo para A/B/C e confira as três unidades. Ensaie também a
   recuperação offline com os arquivos dos Guardiões.
8. Volte ao passo 1 para repetir. Não há limite de dez execuções. A última zerada
   não libera automaticamente o acesso público: a liberação continua sendo uma
   etapa separada após a homologação.

**Limite do percurso atual:** a zerada descarta deliberadamente todo o ensaio,
mesmo lacrado. Ela não substitui a limpeza do fechamento anual com preservação
para reabertura. A limpeza anual em `/api/cripta/export/cleanup` continua bloqueada
pela revisão de liberação; recuperação integral dos formatos legados e entrega
individual ainda precisam de homologação. Não declarar a operação final liberada
apenas porque a zerada passou.

## Escopo e recuperação

- Acesso exige conta do piloto e permissão `tenant:manage`, no servidor, com
  validação de origem e confirmação. GET apenas confere; nunca exclui.
- A Loja vem da sessão, nunca do corpo do pedido. Uma lista explícita inclui
  cartas, rascunhos, chaves por conta, chave da Cripta e seus registros,
  Comissão, janela de recebimento, recibos, conferências físicas, ocorrências,
  travas de depósito, pendências e registro de uploads vinculados à Loja.
- Inclui os registros antigos pessoais do piloto sem identificação de Loja.
  Registros que identificam outra Loja ou outro proprietário ficam preservados.
- Filhos são encontrados mesmo quando o documento pai não existe. A configuração
  global legada `criptaControlV1/pilot` é preservada por não pertencer a uma Loja;
  após a primeira zerada, a antiga rota de depósitos deixa de aceitar conteúdo
  para essa Loja. Os novos percursos usam o recebimento atual, inicialmente fechado.
- A pasta Wix inteira nunca é apagada: somente IDs vinculados ao inventário.
  Um registro de uploads mantém IDs conhecidos mesmo quando uma gravação posterior
  falha. Arquivos antigos órfãos sem qualquer ID registrado no Portal precisam de
  reconciliação específica; a ação não promete localizar esses arquivos.
- O pedido fecha a admissão de operações e aguarda as operações em andamento.
  APIs da Cripta e ações administrativas participam da mesma trava transacional.
  O prazo de uma operação é 15 minutos, maior que `maxDuration` de até 300 segundos
  dos handlers protegidos. Esse limite de execução deve ser preservado no deployment.
- Lotes de até três arquivos solicitam exclusão permanente e conferem ausência
  no Wix. HTTP 401/403/429/5xx, respostas inválidas e arquivos ainda presentes não
  contam como sucesso. Referências e chaves permanecem até resolver as pendências.
- Depois dos arquivos, documentos são apagados em lotes de até 100, filhos antes
  dos pais e chaves por último. Um inventário vazio confirma a conclusão.
- A trava persistida identifica a zerada e impede trabalhadores concorrentes.
  Uma geração crescente rejeita rascunhos de abas anteriores. Repetir a chamada
  final não incrementa o contador de novo nem começa outra exclusão.
- Ficam apenas controles técnicos da geração/última execução, contador e data de
  conclusão. Cadastros de irmãos, usuários, gestão, permissões e demais módulos
  não são alterados.

## Verificação

Testes cobrem isolamento entre Lojas/proprietários, subcoleções órfãs, falha do
Wix com preservação de chaves, retomada, drenagem de upload em curso, concorrência,
confirmação/origem/permissões, abas antigas e dez reinícios independentes. O teste
não executa dez percursos humanos completos nem apaga dados reais.
