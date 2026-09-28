# Cripta — integração do pacote revisado

O pacote `cripta-pacote (1).zip` orienta as telas das fases. Ele **não** deve ser copiado sobre `apps/web`: pressupõe Firebase ID token, coleções globais e Wix sem cifra antes do upload, enquanto o Portal usa sessão por cookie, `tenantId` e cartas cifradas antes do Wix.

## O que está ligado ao Portal

- Telas pessoais: painel, cartas com rascunho, comprovante e cartas liberadas, sob login de irmão Ativo e restrição piloto.
- Telas administrativas: estado, Comissão e recebimento/lacração, reabertura e ocorrência individual, sob permissão administrativa.
- Carta/rascunho: cifra autenticada com chave da conta mantida no servidor, envio privado ao Wix e índice no Firestore isolado por `tenantId` e `uid`. A Administração com acesso ao servidor e às chaves ainda pode tecnicamente decifrar; não prometer sigilo absoluto contra operadores da infraestrutura.
- Recibo do inventário: código, contagem, digest e ata. A nova conferência lê localmente dois arquivos `CRIPTA/2`, compara cada manifesto, as impressões digitais, o código e o digest do inventário do recibo. Só o resultado e os identificadores declarados são enviados ao servidor, com histórico da conta operadora.

## Condições para usar a conferência física

O cabeçalho e o manifesto do arquivo `.lacre` devem conter `inventoryDigest` idêntico ao recibo do Portal. O gerador offline aceita esse campo do JSON de exportação. A exportação real **ainda não é emitida pelo Portal**. Por isso a nova tela fica preparada para o ensaio integrado, mas não permite afirmar que as cartas reais foram transferidas para as unidades. Sem esse campo, a conferência recusa o arquivo.

Um resultado lançado pelo navegador não é uma assinatura da mídia física: alguém com acesso administrativo pode forjar a chamada. Registrar em ata o identificador de cada unidade, assinatura de dois presentes e o resultado de restauração independente. Manter as unidades em custódias distintas. A leitura de hashes detecta diferenças de bytes, mas não prova que as chaves reconstituem todas as cartas.

## Bloqueios restantes antes da exclusão do Wix

1. Produzir exportação por ciclo e `tenantId`, com inventário assinado ou preservado fora das mídias e todos os objetos Wix conferidos. Não colocar texto legível ou chaves em uma exportação comum sem proteção.
2. Integrar essa exportação ao formato `CRIPTA/2` e testar volume real sem concentrar todo o acervo em memória do navegador ou exceder o tempo de uma função Vercel.
3. Ler de volta cada unidade e restaurar amostras autorizadas em outro equipamento, com as duas partes da chave.
4. Integrar reabertura e entrega individual, com autorização e vínculo estrito a carta, irmão, ciclo e destinatário.
5. Somente então criar uma rotina de exclusão com reconciliação por objeto. Atualmente não há botão nem rota para apagar todo o acervo temporário após a lacração.

O `CRIPTA/1` do ZIP não é compatível com o `CRIPTA/2` corrigido nesta árvore. Nunca misturar seus manifestos, partes da chave e arquivos lacrados.
