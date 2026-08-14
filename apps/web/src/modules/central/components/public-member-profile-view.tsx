import type { PublicMemberProfileDTO } from '@vl6/domain';
import { buildWhatsappLink } from '@vl6/shared';
import {
  Briefcase,
  Building2,
  Card,
  CardContent,
  Compass,
  Facebook,
  GraduationCap,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Quote,
  Sparkles,
  UserCircle,
} from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';

type IconType = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: IconType;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border bg-background flex flex-col gap-2.5 rounded-xl border p-4">
      <h3 className="text-muted flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <Icon size={14} strokeWidth={1.75} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function LinkPill({ href, label, icon: Icon }: { href: string; label: string; icon: IconType }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border bg-surface hover:border-primary hover:text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
    >
      <Icon size={15} strokeWidth={1.75} />
      {label}
    </a>
  );
}

/**
 * Renderização somente leitura de um `PublicMemberProfileDTO` — já filtrado
 * server-side (docs/architecture, Central VL6). Nunca renderiza uma seção
 * vazia: se a chave é `null`, a seção inteira some. Reusada tanto pelo
 * preview "como os outros veem" (`/perfil`) quanto pelo perfil de terceiro
 * (`/central/[memberId]`).
 */
export function PublicMemberProfileView({ profile }: { profile: PublicMemberProfileDTO }) {
  const hasContatos = profile.contatos && Object.values(profile.contatos).some(Boolean);
  const hasRedes = profile.redes && Object.values(profile.redes).some(Boolean);

  return (
    <Card className="overflow-hidden">
      <div className="from-primary to-primary-dark h-20 bg-gradient-to-br sm:h-24" />
      <CardContent className="flex flex-col gap-6 px-6 pb-6 pt-0">
        <div className="flex flex-col gap-3">
          <MemberAvatar
            fotoUrl={profile.fotoUrl}
            nome={profile.nomeCompleto}
            className="border-surface -mt-10 h-20 w-20 border-4 shadow-sm sm:-mt-12 sm:h-24 sm:w-24"
          />
          <div className="flex flex-col gap-1.5">
            <p className="font-display text-xl font-semibold">{profile.nomeCompleto}</p>
            <MemberDegreeBadge grau={profile.grau} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {profile.apresentacao?.texto && (
            <Section title="Sobre" icon={Quote}>
              <p className="whitespace-pre-line text-sm">{profile.apresentacao.texto}</p>
            </Section>
          )}

          {profile.informacoesPessoais &&
            (profile.informacoesPessoais.interesses ||
              profile.informacoesPessoais.cidadeExibicao) && (
              <Section title="Informações pessoais" icon={UserCircle}>
                <dl className="flex flex-col gap-1 text-sm">
                  {profile.informacoesPessoais.cidadeExibicao && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Cidade</dt>
                      <dd>{profile.informacoesPessoais.cidadeExibicao}</dd>
                    </div>
                  )}
                  {profile.informacoesPessoais.interesses && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Interesses</dt>
                      <dd>{profile.informacoesPessoais.interesses}</dd>
                    </div>
                  )}
                </dl>
              </Section>
            )}

          {profile.profissional &&
            (profile.profissional.profissao ||
              profile.profissional.areaAtuacao ||
              profile.profissional.formacao ||
              profile.profissional.resumoProfissional) && (
              <Section title="Atuação profissional" icon={Briefcase}>
                <dl className="flex flex-col gap-1 text-sm">
                  {profile.profissional.profissao && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Profissão</dt>
                      <dd>{profile.profissional.profissao}</dd>
                    </div>
                  )}
                  {profile.profissional.areaAtuacao && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Área</dt>
                      <dd>{profile.profissional.areaAtuacao}</dd>
                    </div>
                  )}
                  {profile.profissional.formacao && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Formação</dt>
                      <dd>{profile.profissional.formacao}</dd>
                    </div>
                  )}
                </dl>
                {profile.profissional.resumoProfissional && (
                  <p className="mt-1 whitespace-pre-line text-sm">
                    {profile.profissional.resumoProfissional}
                  </p>
                )}
              </Section>
            )}

          {((profile.competencias && profile.competencias.length > 0) ||
            (profile.servicos && profile.servicos.length > 0)) && (
            <Section title="Competências e serviços" icon={Sparkles}>
              <div className="flex flex-wrap gap-1.5">
                {[...(profile.competencias ?? []), ...(profile.servicos ?? [])].map((tag) => (
                  <span key={tag} className="bg-background text-muted rounded-md px-2 py-1 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {(profile.empresaAtual || (profile.negocios && profile.negocios.length > 0)) && (
            <Section title="Empresa" icon={Building2}>
              <div className="flex flex-col gap-3">
                {profile.empresaAtual && (
                  <p className="text-sm font-medium">{profile.empresaAtual}</p>
                )}
                {profile.negocios?.map((negocio) => (
                  <div key={negocio.id} className="text-sm">
                    <p className="font-medium">{negocio.nomeEmpresa}</p>
                    {negocio.segmento && <p className="text-muted">{negocio.segmento}</p>}
                    {negocio.descricao && <p className="mt-1">{negocio.descricao}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {hasContatos && (
            <Section title="Contatos" icon={Phone}>
              <div className="flex flex-wrap gap-2">
                {profile.contatos?.whatsapp && (
                  <LinkPill
                    href={buildWhatsappLink(profile.contatos.whatsapp)}
                    label="WhatsApp"
                    icon={MessageCircle}
                  />
                )}
                {profile.contatos?.telefone && (
                  <LinkPill
                    href={`tel:${profile.contatos.telefone}`}
                    label="Telefone"
                    icon={Phone}
                  />
                )}
                {profile.contatos?.email && (
                  <LinkPill href={`mailto:${profile.contatos.email}`} label="E-mail" icon={Mail} />
                )}
              </div>
            </Section>
          )}

          {hasRedes && (
            <Section title="Redes e perfis" icon={Globe}>
              <div className="flex flex-wrap gap-2">
                {profile.redes?.whatsapp && (
                  <LinkPill
                    href={buildWhatsappLink(profile.redes.whatsapp)}
                    label="WhatsApp"
                    icon={MessageCircle}
                  />
                )}
                {profile.redes?.instagram && (
                  <LinkPill href={profile.redes.instagram} label="Instagram" icon={Instagram} />
                )}
                {profile.redes?.facebook && (
                  <LinkPill href={profile.redes.facebook} label="Facebook" icon={Facebook} />
                )}
                {profile.redes?.linkedin && (
                  <LinkPill href={profile.redes.linkedin} label="LinkedIn" icon={Linkedin} />
                )}
                {profile.redes?.lattes && (
                  <LinkPill
                    href={profile.redes.lattes}
                    label="Currículo Lattes"
                    icon={GraduationCap}
                  />
                )}
                {profile.redes?.site && (
                  <LinkPill href={profile.redes.site} label="Site" icon={Globe} />
                )}
              </div>
            </Section>
          )}

          {profile.informacoesMaconicas &&
            (profile.informacoesMaconicas.lojasVisitadas ||
              profile.informacoesMaconicas.interessesMaconicos) && (
              <Section title="Informações maçônicas" icon={Compass}>
                <dl className="flex flex-col gap-1 text-sm">
                  {profile.informacoesMaconicas.lojasVisitadas && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Lojas visitadas</dt>
                      <dd>{profile.informacoesMaconicas.lojasVisitadas}</dd>
                    </div>
                  )}
                  {profile.informacoesMaconicas.interessesMaconicos && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Interesses</dt>
                      <dd>{profile.informacoesMaconicas.interessesMaconicos}</dd>
                    </div>
                  )}
                </dl>
              </Section>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
