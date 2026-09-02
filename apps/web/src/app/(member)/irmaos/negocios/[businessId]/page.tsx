import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import {
  buildWhatsappLink,
  FORMA_ATENDIMENTO_LABELS,
  isSafeExternalUrl,
  normalizeInstagram,
  normalizeWhatsapp,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Card,
  CardContent,
  Clock,
  EmptyState,
  Gift,
  Globe,
  Instagram,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { LodgeTenureBadge } from '@vl6/ui';

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const session = await requireSession();
  const { businessId } = await params;

  if (!hasPermission(session.authContext, 'memberDirectory:read')) {
    return (
      <EmptyState
        icon={<Lock size={22} strokeWidth={1.75} />}
        title="Rede de Confiança VL6 indisponível"
        description="Sua função não tem acesso a esta área."
      />
    );
  }

  const container = createServerContainer();
  const result = await container.useCases.getBusinessDirectoryEntry.execute(
    session.authContext,
    businessId,
  );

  if (!result.ok || !result.value) {
    notFound();
  }

  const entry = result.value;

  const whatsappHref = entry.whatsappComercial
    ? (() => {
        const normalized = normalizeWhatsapp(entry.whatsappComercial!);
        return normalized ? buildWhatsappLink(normalized) : null;
      })()
    : null;
  const instagramHref = entry.instagramComercial
    ? normalizeInstagram(entry.instagramComercial)
    : null;
  const siteHref = entry.siteUrl && isSafeExternalUrl(entry.siteUrl) ? entry.siteUrl : null;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/irmaos?tipo=negocios"
        className="border-border bg-surface hover:border-primary hover:text-primary flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar à Rede de Confiança
      </Link>

      <Card className="overflow-hidden">
        <div className="from-primary to-primary-dark h-16 bg-gradient-to-br sm:h-20" />
        <CardContent className="flex flex-col gap-6 px-6 pb-6 pt-0">
          {/*
            Só a logo sobrepõe a faixa gradiente (tem fundo/borda próprios,
            sempre legível ali) — o nome fica num bloco à parte, sempre
            abaixo da faixa, nunca sobre ela. Antes os dois dividiam a mesma
            linha com `items-end`: um nome comprido o bastante pra ocupar a
            altura toda ficava com o topo do texto (sem cor definida, herda
            o texto escuro padrão) sobre o azul escuro do gradiente —
            ilegível. Sem depender de acertar quantas linhas o nome vai
            ocupar, isso nunca mais volta a acontecer.
          */}
          <div className="-mt-8 sm:-mt-10">
            {entry.logoUrl ? (
              <img
                src={entry.logoUrl}
                alt={`Logo de ${entry.nomeEmpresa}`}
                className="bg-surface border-surface h-20 w-20 shrink-0 rounded-xl border-4 object-contain p-1.5 shadow-sm"
              />
            ) : (
              <span className="bg-surface border-surface text-muted flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-4 shadow-sm">
                <Building2 size={28} strokeWidth={1.75} />
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-xl font-semibold sm:text-2xl">{entry.nomeEmpresa}</h1>
            {entry.segmento && <p className="text-muted text-sm">{entry.segmento}</p>}
          </div>

          <p className="border-border bg-background flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
            <ShieldCheck size={14} className="text-primary shrink-0" strokeWidth={1.75} />
            Vinculado a Irmão da VL6
          </p>

          {entry.descricao && <p className="text-sm">{entry.descricao}</p>}

          {entry.ofereceDescontoIrmaos && (
            <p className="bg-primary/10 text-primary-dark flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium">
              <Gift size={16} className="mt-0.5 shrink-0" />
              <span>{entry.descontoDescricao || 'Condição especial para Irmãos'}</span>
            </p>
          )}

          {entry.produtosServicos.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-muted text-xs font-semibold uppercase tracking-wide">
                Produtos e serviços
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {entry.produtosServicos.map((item) => (
                  <span
                    key={item}
                    className="bg-accent/15 text-primary-dark rounded-full px-2.5 py-1 text-xs font-medium"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="border-border bg-background flex flex-col gap-2 rounded-xl border p-4 text-sm">
              <h2 className="text-muted text-xs font-semibold uppercase tracking-wide">
                Como encontrar
              </h2>
              {entry.cidade && (
                <p className="flex items-center gap-1.5">
                  <MapPin size={14} className="shrink-0" />
                  {entry.cidade}
                </p>
              )}
              {entry.formasAtendimento.length > 0 && (
                <p>
                  {entry.formasAtendimento.map((key) => FORMA_ATENDIMENTO_LABELS[key]).join(' · ')}
                </p>
              )}
              {entry.horarioFuncionamento && (
                <p className="flex items-center gap-1.5">
                  <Clock size={14} className="shrink-0" />
                  {entry.horarioFuncionamento}
                </p>
              )}
              {!entry.cidade && !entry.formasAtendimento.length && !entry.horarioFuncionamento && (
                <p className="text-muted">Nenhuma informação adicional publicada.</p>
              )}
            </div>

            <div className="border-border bg-background flex flex-col gap-2 rounded-xl border p-4 text-sm">
              <h2 className="text-muted text-xs font-semibold uppercase tracking-wide">Contato</h2>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-border hover:border-primary hover:text-primary flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors"
                >
                  <MessageCircle size={15} strokeWidth={1.75} />
                  WhatsApp comercial
                </a>
              )}
              {entry.telefoneComercial && (
                <a href={`tel:${entry.telefoneComercial}`} className="flex items-center gap-1.5">
                  <Phone size={14} className="shrink-0" />
                  {entry.telefoneComercial}
                </a>
              )}
              {entry.emailComercial && (
                <a href={`mailto:${entry.emailComercial}`} className="flex items-center gap-1.5">
                  <Mail size={14} className="shrink-0" />
                  {entry.emailComercial}
                </a>
              )}
              {siteHref && (
                <a
                  href={siteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5"
                >
                  <Globe size={14} className="shrink-0" />
                  Site
                </a>
              )}
              {instagramHref && (
                <a
                  href={instagramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5"
                >
                  <Instagram size={14} className="shrink-0" />
                  Instagram
                </a>
              )}
              {!whatsappHref &&
                !entry.telefoneComercial &&
                !entry.emailComercial &&
                !siteHref &&
                !instagramHref && <p className="text-muted">Nenhum contato publicado.</p>}
            </div>
          </div>

          <Link
            href={`/irmaos/${entry.responsavel.memberId}`}
            className="border-border hover:border-primary mt-2 flex items-center gap-3 rounded-xl border p-3 transition-colors"
          >
            <MemberAvatar
              fotoUrl={entry.responsavel.fotoUrl}
              nome={entry.responsavel.nomeCompleto}
              className="h-11 w-11"
            />
            <span className="min-w-0 flex-1">
              <span className="text-muted block text-xs leading-none">Irmão responsável</span>
              <span className="block truncate font-medium">{entry.responsavel.nomeCompleto}</span>
            </span>
            <LodgeTenureBadge
              dataIniciacao={entry.responsavel.dataIniciacao}
              className="shrink-0"
            />
            <ArrowUpRight size={16} className="text-muted shrink-0" />
          </Link>
        </CardContent>
      </Card>

      <p className="text-muted text-xs">
        As informações desta página são publicadas pelo próprio responsável. A Loja não intermedeia
        contratações nem garante produtos ou serviços aqui apresentados.
      </p>
    </div>
  );
}
