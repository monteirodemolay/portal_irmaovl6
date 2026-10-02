import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { hasPermission, resolveHeroPhoto } from '@vl6/domain';
import {
  Archive,
  EyeOff,
  FileArchive,
  FileText,
  Lock,
  NotebookText,
  PageHero,
  ShieldCheck,
  StickyNote,
  Users,
} from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { isOnlineOpen, openingRef } from '@/modules/cripta/lib/online-opening';
import { resolveMemberDisplayName } from '@/lib/membership/resolve-display-name';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { PageHeroPhotoUpload } from '@/components/member/page-hero-photo-upload';

export const metadata = {
  title: 'Painel da Cripta | Portal VL6',
  robots: { index: false, follow: false },
};

const gold = '#8a682d';
const cream = '#fbf8f1';
const border = '#dbcda9';

export default async function Page() {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);
  const tenantId = session.authContext.tenantId;
  const member = await createServerContainer().repositories.member.findByUserId(
    tenantId,
    session.user.id,
  );
  if (member?.situacao !== 'ativo') notFound();
  const db = getAdminFirestore();
  // A próxima data de abertura NÃO é buscada nem exibida aqui, de propósito: é informação
  // operacional da Comissão, anunciada em sessão — publicá-la com antecedência pra toda a
  // Loja (agora que o acesso é de todo Irmão Ativo) daria a quem tivesse más intenções o
  // calendário exato de quando atacar. O irmão só vê uma data quando ela já é fato consumado:
  // o prazo de FECHAMENTO, uma vez que a escrita já está aberta (closesAt, abaixo).
  const [open, letters, draft, openingDoc] = await Promise.all([
    isOnlineOpen(tenantId),
    db.collection('criptaOnlineCapsulesV1').where('uid', '==', session.user.id).get(),
    db
      .collection('criptaOnlineDraftsV1')
      .doc(tenantId)
      .collection('users')
      .doc(session.user.id)
      .get(),
    openingRef(tenantId).get(),
  ]);
  const count = letters.docs.filter(
    (doc) => doc.data().tenantId === tenantId && doc.data().status === 'ready',
  ).length;
  const hasDraft = draft.exists && draft.data()?.status !== 'deleted';
  const closesAt = openingDoc.data()?.closesAt as string | undefined;
  const daysLeft =
    open && closesAt
      ? Math.max(1, Math.ceil((Date.parse(closesAt) - Date.now()) / 86_400_000))
      : null;

  const displayName = resolveMemberDisplayName(member, session.user.email);
  const firstName = displayName.split(' ')[0];
  const canManageHeroPhoto = current ? hasPermission(session.authContext, 'tenant:manage') : false;
  const heroPhoto = current ? resolveHeroPhoto(current.tenant, 'cripta') : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12 text-[#17263f]">
      <PageHero
        kickerIcon={<Lock size={13} />}
        kicker="Cripta Digital · área do irmão"
        title={`Bem-vindo à sua Cripta, ${firstName}`}
        description={
          open
            ? 'A escrita está aberta. Escreva com calma, salve rascunhos quantas vezes quiser e envie quando estiver pronto — sua carta fica guardada com segurança até o dia da entrega.'
            : 'A janela de escrita está fechada no momento. Suas cartas já enviadas continuam guardadas e disponíveis para consulta. A Comissão de Guarda avisa com antecedência quando a próxima abertura for marcada.'
        }
        meta={current?.tenant.nome}
        photoUrl={heroPhoto?.url}
        photoPosicao={heroPhoto?.posicao}
        actions={
          <>
            {open ? (
              <Link
                href="/cripta/minhas-cartas"
                className="bg-accent inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-[#2a2106]"
              >
                <NotebookText size={16} /> Escrever minha carta
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white/70">
                <Lock size={16} /> Escrita fechada
              </span>
            )}
            <Link
              href="/cripta/minhas-cartas"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white"
            >
              Ver minhas cartas
            </Link>
            {canManageHeroPhoto && (
              <PageHeroPhotoUpload
                pageKey="cripta"
                path="/cripta/painel"
                hasPhoto={Boolean(heroPhoto)}
                initialPosicao={heroPhoto?.posicao ?? 50}
              />
            )}
          </>
        }
        side={
          <div className="flex min-w-[200px] flex-col gap-2 rounded-2xl border border-white/15 bg-white/[0.06] p-5">
            <span className="text-[10px] uppercase tracking-widest text-white/60">
              Situação agora
            </span>
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${
                open
                  ? 'border-emerald-400/45 bg-emerald-400/15 text-white'
                  : 'border-white/20 bg-white/5 text-white/85'
              }`}
            >
              <span
                className={`h-[7px] w-[7px] rounded-full ${open ? 'bg-emerald-400' : 'bg-white/40'}`}
              />
              {open ? 'Escrita aberta' : 'Escrita fechada'}
            </span>
            <span className="text-xs text-white/70">
              {open
                ? daysLeft
                  ? `Encerra em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}`
                  : null
                : 'A Comissão avisa em sessão quando a próxima abertura for marcada'}
            </span>
          </div>
        }
      />

      {/* Estatísticas rápidas */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<FileText size={16} />}
          label="Minhas cartas"
          value={String(count)}
          hint="Guardadas na sua conta, cifradas"
        />
        <StatCard
          icon={<StickyNote size={16} />}
          label="Rascunho"
          value={hasDraft ? 'Em andamento' : 'Nenhum'}
          hint={
            open
              ? 'Salvo automaticamente enquanto você escreve'
              : 'Disponível assim que a escrita reabrir'
          }
          small
        />
        <StatCard
          icon={<ShieldCheck size={16} />}
          label="Guardiões da Cripta"
          value="5"
          hint="Pelo menos 3 precisam se reunir para retirar um arquivo lacrado"
          small
        />
      </section>

      {/* Como a carta é escrita */}
      <section className="rounded-2xl border border-[#d8c8a4] bg-white p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: gold }}>
          Como a carta é escrita
        </p>
        <h2 className="mt-1 font-serif text-2xl">Do rascunho à guarda, em quatro passos</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FlowStep n={1} icon={<Users size={15} />} title="A Comissão abre a janela">
            Uma vez por ano, em sessão, o Venerável e um irmão da Comissão de Guarda registram a
            abertura da escrita para todos os irmãos Ativos.
          </FlowStep>
          <FlowStep n={2} icon={<NotebookText size={15} />} title="Você escreve no seu tempo">
            Rascunhos ficam salvos na sua conta enquanto a janela estiver aberta. Edite, revise e
            volte quando quiser — ninguém mais enxerga o texto.
          </FlowStep>
          <FlowStep n={3} icon={<Lock size={15} />} title="A carta é cifrada e enviada">
            Ao concluir, o seu navegador cifra a carta antes de qualquer envio. O Portal recebe só o
            conteúdo já lacrado, ilegível por fora.
          </FlowStep>
          <FlowStep n={4} icon={<Archive size={15} />} title="Fica em custódia até a entrega">
            A carta permanece guardada, lacrada, até a hipótese institucional prevista — sem leitura
            administrativa de rotina.
          </FlowStep>
        </div>
      </section>

      {/* Manual de segurança */}
      <section className="rounded-2xl border border-[#d8c8a4] bg-white p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: gold }}>
          Manual da Cripta
        </p>
        <h2 className="mt-1 font-serif text-2xl">Como sua carta fica protegida</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5e584c]">
          Quatro camadas independentes — nenhuma sozinha é suficiente para abrir sua carta, e isso é
          proposital.
        </p>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <EyeOff size={17} />
          </span>
          <p className="text-sm leading-6 text-emerald-950">
            <strong>Os Guardiões nunca abrem nem leem sua carta.</strong> Na hipótese prevista de
            entrega, o papel deles é só reunir a chave para retirar o arquivo lacrado da guarda e
            repassá-lo a quem de direito — fechado. A leitura é de quem recebe, não da Loja nem dos
            Guardiões.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <SecurityLayer icon={<Lock size={18} />} title="Cifrada antes de sair do seu aparelho">
            A cifragem acontece no seu navegador. O Portal nunca recebe o texto em aberto — só o
            conteúdo já lacrado.
          </SecurityLayer>
          <SecurityLayer icon={<EyeOff size={18} />} title="Guarda temporária, sem leitura">
            Enquanto aguarda a lacração, o arquivo cifrado fica num cofre digital temporário. A
            Administração vê status e metadados — nunca o conteúdo.
          </SecurityLayer>
          <SecurityLayer
            icon={<ShieldCheck size={18} />}
            title="A chave é dividida entre 5 Guardiões"
          >
            Ninguém detém a chave inteira. Ela é repartida entre cinco Guardiões; é preciso que pelo
            menos três se reúnam, presencialmente, para reconstruí-la — só para retirar o arquivo
            lacrado, nunca para abri-lo ou lê-lo.
          </SecurityLayer>
          <SecurityLayer icon={<FileArchive size={18} />} title="Cópias físicas fora do Portal">
            No fechamento anual, o lote lacrado é gravado em três unidades físicas externas,
            conferidas por hash, antes de qualquer limpeza online.
          </SecurityLayer>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="rounded-2xl border border-[#d8c8a4] bg-white p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: gold }}>
          Perguntas frequentes
        </p>
        <h2 className="mt-1 font-serif text-2xl">Antes de escrever, tire suas dúvidas</h2>
        <div className="mt-4 divide-y divide-[#e7dcc0]">
          <Faq question="Quem pode ler minha carta?">
            Nem a Loja, nem a Administração do Portal, nem os Guardiões. Sua carta é cifrada no seu
            navegador antes de sair do seu aparelho. Na hipótese institucional prevista para a
            entrega, ao menos três dos cinco Guardiões se reúnem, presencialmente e fora do Portal,
            só para reconstruir a chave e retirar o arquivo lacrado da guarda — eles não abrem nem
            leem o conteúdo. O arquivo fechado é repassado a quem de direito, que é quem
            efetivamente abre e lê.
          </Faq>
          <Faq question="Posso editar uma carta depois de enviada?">
            Enquanto a carta estiver como rascunho, sim, quantas vezes quiser. Depois de enviada e
            lacrada, ela entra em custódia e deixa de ser um documento editável — é assim que
            garantimos que ninguém, nem você por engano, altere o conteúdo depois do lacre.
          </Faq>
          <Faq question="O que são os Guardiões da Cripta?">
            Cinco irmãos designados em sessão, que guardam cada um uma parte da chave de abertura.
            Nenhum deles, sozinho, consegue reconstituir nada — é preciso a reunião de pelo menos
            três. E mesmo reunidos, o papel deles é só retirar o arquivo lacrado da guarda e
            repassá-lo a quem de direito: os Guardiões não abrem nem leem o conteúdo da carta em
            nenhuma etapa.
          </Faq>
          <Faq question="E se eu entrar na Loja depois da última abertura?">
            Assim que sua conta estiver ativa, você já pode escrever na próxima janela aberta pela
            Comissão — não é preciso esperar um novo ciclo completo nem pedir liberação especial.
          </Faq>
          <Faq question="Minha carta pode se perder?">
            O ciclo prevê três cópias físicas externas, conferidas por hash contra o arquivo
            original, além da guarda temporária no cofre digital. Isso reduz bastante o risco, mas o
            Portal é transparente: nenhuma tecnologia promete apagamento ou preservação absolutos, e
            isso está descrito na nossa Política de Privacidade.
          </Faq>
        </div>
      </section>

      {/* Atalhos */}
      <section className="grid gap-4 sm:grid-cols-3">
        <QuickLink
          href="/cripta/minhas-cartas"
          icon={<FileText size={18} />}
          title="Minhas cartas"
          desc="Veja a contagem e o estado das cartas vinculadas à sua conta."
          cta="Abrir"
        />
        <QuickLink
          href="/cripta/comprovante"
          icon={<FileArchive size={18} />}
          title="Comprovante"
          desc="Consulte e imprima o registro atual vinculado ao seu login."
          cta="Ver comprovante"
        />
        <QuickLink
          href="/cripta/liberadas"
          icon={<Archive size={18} />}
          title="Cartas liberadas"
          desc="Estado das cartas do seu login nas reaberturas futuras."
          cta="Ver área"
        />
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: border, background: cream }}>
      <span
        className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border bg-white"
        style={{ borderColor: border, color: gold }}
      >
        {icon}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: gold }}>
        {label}
      </span>
      <strong className={`mt-1 block font-serif ${small ? 'text-xl' : 'text-3xl'}`}>{value}</strong>
      <span className="mt-1 block text-xs text-[#5e584c]">{hint}</span>
    </div>
  );
}

function FlowStep({
  n,
  icon,
  title,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#123c69] text-sm font-bold text-[#e3bd62]">
        {n}
      </span>
      <h3 className="flex items-center gap-1.5 text-sm font-bold">
        {icon}
        {title}
      </h3>
      <p className="mt-1.5 text-[13px] leading-5 text-[#5e584c]">{children}</p>
    </div>
  );
}

function SecurityLayer({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3.5 rounded-xl border border-[#e2dbc8] p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#123c69] text-[#e3bd62]">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="mt-1 text-[13px] leading-5 text-[#5e584c]">{children}</p>
      </div>
    </div>
  );
}

function Faq({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <details className="group py-3.5 first:pt-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold">
        {question}
        <span className="text-lg font-normal group-open:hidden" style={{ color: gold }}>
          +
        </span>
        <span className="hidden text-lg font-normal group-open:inline" style={{ color: gold }}>
          –
        </span>
      </summary>
      <p className="mt-2.5 max-w-2xl text-[13.5px] leading-6 text-[#5e584c]">{children}</p>
    </details>
  );
}

function QuickLink({
  href,
  icon,
  title,
  desc,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-2xl border border-[#d8c8a4] bg-white p-5 transition hover:border-[#8a6a1f] hover:shadow-sm"
    >
      <span style={{ color: gold }}>{icon}</span>
      <strong className="text-[15px]">{title}</strong>
      <span className="text-xs leading-5 text-[#5e584c]">{desc}</span>
      <span className="mt-1 text-xs font-bold text-[#123c69]">{cta} →</span>
    </Link>
  );
}
