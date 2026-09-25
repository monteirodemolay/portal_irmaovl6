import { notFound } from 'next/navigation';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { WixTestButton } from './wix-test-button';

export const metadata = {
  title: 'Administração da Cripta | Portal VL6',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();

  return <div className="mx-auto max-w-5xl space-y-6 pb-12">
    <header className="rounded-[2rem] border border-[#c9a449]/50 bg-[#0a2547] p-8 text-white sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e3bd62]">Governança · acesso piloto</p>
      <h1 className="mt-4 font-serif text-4xl">Administração da Cripta</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">Área institucional distinta da experiência pessoal do Irmão. Aqui estarão os fluxos de abertura, guarda, quite-placet e entrega excepcional.</p>
    </header>
    <p role="alert" className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950"><strong>Anteprojeto sem armazenamento de conteúdo pessoal.</strong> Esta tela não consulta acervos, não valida óbitos, não exporta pacotes de irmãos e não apaga seus dados. O ensaio Wix abaixo trabalha apenas com bytes aleatórios.</p>
    <WixTestButton />
    <div className="grid gap-4 md:grid-cols-2">
      {[
        ['01 · Abertura anual', 'Registrar autorização interna, período de acesso, integridade das cópias e encerramento. A data, sozinha, não libera conteúdos.'],
        ['02 · Custódia', 'Conferir inventário cifrado, cópias em mídias separadas, versões e integridade sem acesso ao teor das cartas.'],
        ['03 · Quite-placet', 'Confirmar o ato administrativo. Preparar a devolução do pacote daquele irmão e a retirada controlada das cópias mantidas pela Loja.'],
        ['04 · Entrega após falecimento', 'Validar o óbito e a identidade de cada destinatário, aprovar internamente e entregar somente os pacotes que lhe forem destinados.'],
      ].map(([title, detail]) => <section key={title} className="rounded-2xl border border-[#dbcda9] bg-[#fbf8f1] p-6"><h2 className="font-serif text-xl text-[#142a43]">{title}</h2><p className="mt-3 text-sm leading-7 text-[#536074]">{detail}</p></section>)}
    </div>
    <section className="rounded-2xl border border-[#dbcda9] bg-white p-7"><h2 className="font-serif text-2xl text-[#142a43]">Entrega sem leitura pela Loja</h2><ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-7 text-[#41516a]"><li>O irmão prepara cartas e anexos cifrados separadamente para cada destinatário.</li><li>Após verificação e autorização, a Loja grava no pendrive apenas o pacote cifrado destinado à pessoa identificada.</li><li>O destinatário abre o pacote com uma chave à qual a Loja não tenha acesso; a visualização ou geração de PDF ocorre em seu próprio dispositivo.</li></ol><p className="mt-4 rounded-xl bg-[#f8f1e4] p-4 text-sm leading-6 text-[#725624]">A recuperação por custodiante só poderá ser incluída após decidir formalmente quem controla as chaves. Se a Loja puder recuperá-las sozinha, não será possível garantir tecnicamente que ela jamais consiga ler as cartas.</p></section>
  </div>;
}
