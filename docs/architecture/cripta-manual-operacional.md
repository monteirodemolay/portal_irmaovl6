# Cripta VL6 — manual de operação e ensaios (pré-Wix)

## Estado e alcance

Documento de preparo. O Portal **ainda não recebe nem conserva conteúdo real**. A tela pessoal permite testar a exportação cifrada de uma **carta fictícia**, sem anexos, e a restauração local. O laboratório Wix anterior recebe apenas bytes aleatórios. Não usar esses recursos como arquivo definitivo.

O período anual será de **dez dias consecutivos**. Registrar hora e fuso de abertura e encerramento como instantes com offset explícito; por exemplo, `2026-10-09T00:00:00-03:00` até `2026-10-19T00:00:00-03:00` (fim exclusivo). Se houver mudança de fuso, decidir formalmente se contam dez dias civis ou 240 horas antes de aprovar a janela. A política inicial de código exige 240 horas. Uma data escolhida em reunião não libera sozinha o acervo: aprovação, presença dos guardiões e estado das cópias são condições adicionais.

## Papéis e poderes

| Papel | Pode fazer | Não pode fazer sozinho |
| --- | --- | --- |
| Irmão titular ativo | Preparar, revisar e excluir suas cápsulas dentro da janela autorizada. | Abrir a janela, obter a chave de outro irmão ou decretar quite-placet. |
| Operador | Conferir índice cifrado, hashes, mídias e recibos, sem teor das cartas. | Reconstruir chaves ou entregar conteúdo por iniciativa própria. |
| Guardião (três titulares distintos) | Conservar parcela física da recuperação; dois presentes poderão reconstruir a chave sob procedimento autorizado. | Guardar as três parcelas, enviá-las por e-mail ou manter cópia digital íntegra no servidor. |
| Aprovadores | Autorizar janela, adiamento e exceções documentadas. | Desbloquear uma cápsula sem os controles de custódia definidos. |
| Destinatário aprovado | Receber somente sua cápsula e abrir no próprio equipamento com a chave apropriada. | Obter os pacotes de outros destinatários. |

O modelo 2 de 3 é uma **meta de desenho**, ainda não um mecanismo implantado. Antes do primeiro depósito: eleger guardiões e substitutos; contratar revisão técnica do esquema de partilha; escrever procedimento de rotação, perda, morte e suspeita de comprometimento de cada parcela. Biometria e e-mail podem autenticar pedidos, mas não substituem cópia da chave.

## Pacote portátil e restauração

Cada cápsula receberá ID aleatório e uma versão de formato. Texto, destinatário e nomes originais ficam somente dentro do payload cifrado. Mídias serão cifradas separadamente com autenticidade por arquivo, mantendo tamanho e tipo aproximados visíveis ao índice. O manifesto conterá IDs opacos, versões, tamanhos, hashes SHA-256 de bytes **cifrados**, e referência ao material de recuperação embrulhado. O manifesto será autenticado; hash sozinho detecta acidente, mas não impede que alguém substitua manifesto e pacote juntos.

O arquivo do ensaio atual `vl6-capsule-v1` inclui apenas carta e campos `title`, `body`, `recipient`; AES-256-GCM com frase derivada por PBKDF2-SHA256 e salt aleatório. Não inclui anexos nem o futuro esquema de recuperação. Não compartilhar a frase junto ao arquivo. Se ela se perder, a carta deste ensaio não poderá ser reaberta.

### Exercício imediato com conteúdo inventado

1. Entre na área **Minha Cripta** com a conta piloto. Escreva uma carta fictícia e indique um destinatário fictício.
2. Informe uma frase secreta longa na área **Ensaio de recuperação de carta**; clique em **Baixar cifrada** na carta escolhida.
3. Copie o JSON para um pendrive de teste e abra a mesma página em outro navegador ou computador autorizado. Informe a frase em **Frase para restaurar** e escolha **Abrir pacote cifrado**.
4. Confirme título, texto e destinatário. Altere um caractere de `ciphertext` numa cópia do JSON e confirme que a abertura falha. Repita com frase incorreta. Nunca use cartas pessoais neste exercício.
5. Teste após limpar a aba original. Conservar duas cópias do pacote em mídias diferentes; perda simultânea do pacote e da frase implica perda do conteúdo de ensaio.

## Ciclo anual pretendido

| Fase | Evidência para avançar | Conduta se falhar |
| --- | --- | --- |
| Planejamento | Deliberação interna, datas e guardiões confirmados, teste recente das duas mídias. | Adiar sem abrir. |
| Preparação | Inventário e hashes dos dois SSDs conferidos; restauração amostral em equipamento isolado. | Isolar mídia defeituosa e restaurar da íntegra antes de abrir. |
| Abertura | Registro de abertura, hora autenticada, versão implantada e controles de acesso testados. | Bloquear gravações; não confiar apenas no relógio do navegador. |
| Dez dias | Titular ativo altera apenas o próprio conteúdo, com limites aplicados também no servidor; cópias temporárias cifradas. | Suspender depósitos em caso de incidente; preservar evidências sem expor cartas. |
| Fechamento | Bloquear uploads, aguardar transações, exportar inventário final e gravar/verificar dois SSDs independentes. | Manter janela fechada para usuários, mas não apagar a cópia temporária até garantir restauração. |
| Limpeza temporária | Recibos por objeto removido, verificação posterior da listagem e política de retenção do provedor. | Registrar pendência; não declarar eliminação total. |

Em uma hecatombe ou ausência dos responsáveis, a data passa sem abertura. Nova data exige decisão documentada; não existe desbloqueio automático. Se um irmão falecer fora da janela, abrir somente a cápsula elegível em procedimento excepcional, com verificação documental, destinatário e aprovação por duas pessoas; a janela geral continua fechada.

## Ensaios de falha e corrupção

- **Um SSD ilegível:** restaurar do segundo e criar nova segunda cópia antes de concluir a cerimônia. Inspecionar conectores e realizar leitura completa, não confiar apenas na visualização da lista de arquivos.
- **Ambos ilegíveis:** não apagar a cópia temporária; registrar incidente e buscar outros backups autorizados. Sem cópia íntegra e chave, o conteúdo pode ser perdido.
- **Arquivo alterado:** autenticação AES-GCM deve recusar a abertura; hash do manifesto acusa diferença. Nunca corrigir o arquivo por edição manual.
- **Pessoa mal-intencionada:** duas aprovações, parcelas sob custódias distintas, histórico imutável fora do servidor da aplicação e reconciliação independente reduzem risco; não eliminam conluio.
- **Frase ou chave perdida:** simular reconstituição conjunta antes do primeiro uso real. Trocar guardião exige rotação formal e invalidar parcelas anteriores quando possível.
- **Exclusão ou quite-placet:** isolar somente as cápsulas daquele titular; concluir exclusão/verificação nas cópias autorizadas, observando snapshots e retenção. Dar comprovante honesto, sem prometer apagamento físico absoluto.
- **Família:** aprovação deve indicar IDs de cápsulas e destinatários exatos. PDF gerado no computador do destinatário; mídia contínua entregue em arquivos cifrados apropriados.

## Condições de lançamento

Não habilitar conteúdos reais até: revisão externa de criptografia e partilha, fluxo de mídias acima de 4,5 MB sem trânsito por função da Vercel, restauração cruzada em dois dispositivos, ensaio de recuperação por dois guardiões, cópia dupla verificada, controles de titular/janela/exceção no servidor e teste de exclusão rastreável. Separar claramente aprovação institucional e liberação técnica.
