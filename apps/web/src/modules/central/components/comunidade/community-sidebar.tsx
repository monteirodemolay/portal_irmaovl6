import Link from 'next/link';
import type { Member } from '@vl6/domain';
import { Briefcase, Card, CardContent, ChevronRight } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';

function SideLink({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? 'bg-primary flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90'
          : 'border-border hover:border-primary hover:text-primary flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors'
      }
    >
      {label}
      <ChevronRight size={14} className="shrink-0" />
    </Link>
  );
}

/**
 * Coluna lateral da Comunidade VL6 (`aside` do mock-up) — três cartões:
 * acessos pessoais, pertencimento/memória e atalho pra Negócios. O cartão
 * pessoal rico (avatar, badges, % de preenchimento) já existe em
 * `PersonalSummaryCard`, exibido em destaque acima do workspace — este
 * cartão aqui é deliberadamente compacto (só os 3 links do mock-up), pra
 * não duplicar a mesma informação em dois lugares da mesma tela.
 */
export function CommunitySidebar({
  member,
  showGaleriaDeHonra,
  showComunidadeParamaconica,
}: {
  member: Member | null;
  showGaleriaDeHonra: boolean;
  showComunidadeParamaconica: boolean;
}) {
  const showComunidadeCard = showGaleriaDeHonra || showComunidadeParamaconica;

  return (
    <aside aria-label="Área pessoal e acessos da comunidade" className="flex flex-col gap-4">
      {member && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <MemberAvatar
                fotoUrl={member.fotoUrl}
                nome={member.nomeCompleto}
                className="h-11 w-11"
              />
              <div className="min-w-0">
                <span className="text-accent text-[10px] font-bold uppercase tracking-[0.14em]">
                  Área pessoal
                </span>
                <p className="font-display truncate text-base font-semibold">Meu espaço</p>
              </div>
            </div>
            <p className="text-muted text-xs">
              Seu perfil, suas informações e os vínculos da sua família.
            </p>
            <div className="mt-1 flex flex-col gap-2">
              <SideLink href="/irmaos/meu-espaco" label="Editar informações" primary />
              <SideLink href="/irmaos/meu-espaco?tab=pessoal" label="Família e Legado" />
              <SideLink href="/irmaos/configuracoes" label="Configurações" />
            </div>
          </CardContent>
        </Card>
      )}

      {showComunidadeCard && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <div>
              <span className="text-accent text-[10px] font-bold uppercase tracking-[0.14em]">
                Pertencimento e memória
              </span>
              <p className="font-display text-base font-semibold">Nossa comunidade</p>
            </div>
            <div className="flex flex-col gap-2">
              {showGaleriaDeHonra && (
                <SideLink href="/irmaos/galeria-de-honra" label="Galeria de Honra" />
              )}
              {showComunidadeParamaconica && (
                <SideLink href="/paramaconicas" label="Comunidade Paramaçônica" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-primary rounded-lg p-5 text-white shadow-sm">
        <span className="text-accent text-[10px] font-bold uppercase tracking-[0.14em]">
          Conhecimentos que aproximam
        </span>
        <p className="font-display mt-1 text-base font-semibold">Encontre um serviço</p>
        <p className="mt-2 text-xs text-white/80">
          Explore os negócios compartilhados pelos Irmãos, com filtros por segmento e localização.
        </p>
        <Link
          href="/irmaos?tipo=negocios"
          className="bg-accent text-primary-dark mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
        >
          <Briefcase size={14} strokeWidth={1.75} />
          Explorar negócios
        </Link>
      </div>
    </aside>
  );
}
