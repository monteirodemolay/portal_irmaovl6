import type { PublicMemberProfileDTO } from '@vl6/domain';
import { buildWhatsappLink } from '@vl6/shared';
import { Card, CardContent } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-border border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border hover:bg-surface rounded-full border px-3 py-1.5 text-sm"
    >
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
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          <MemberAvatar
            fotoUrl={profile.fotoUrl}
            nome={profile.nomeCompleto}
            className="h-16 w-16"
          />
          <div className="flex flex-col gap-1.5">
            <p className="font-display text-xl font-semibold">{profile.nomeCompleto}</p>
            <MemberDegreeBadge grau={profile.grau} />
          </div>
        </div>

        {profile.apresentacao?.texto && (
          <Section title="Sobre">
            <p className="whitespace-pre-line text-sm">{profile.apresentacao.texto}</p>
          </Section>
        )}

        {profile.informacoesPessoais &&
          (profile.informacoesPessoais.interesses ||
            profile.informacoesPessoais.cidadeExibicao) && (
            <Section title="Informações pessoais">
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
          (profile.profissional.areaAtuacao ||
            profile.profissional.formacao ||
            profile.profissional.resumoProfissional) && (
            <Section title="Atuação profissional">
              <dl className="flex flex-col gap-1 text-sm">
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
                <p className="mt-2 whitespace-pre-line text-sm">
                  {profile.profissional.resumoProfissional}
                </p>
              )}
            </Section>
          )}

        {profile.negocios && profile.negocios.length > 0 && (
          <Section title="Empresa">
            <div className="flex flex-col gap-3">
              {profile.negocios.map((negocio) => (
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
          <Section title="Contatos">
            <div className="flex flex-wrap gap-2">
              {profile.contatos?.whatsapp && (
                <ExternalLink
                  href={buildWhatsappLink(profile.contatos.whatsapp)}
                  label="WhatsApp"
                />
              )}
              {profile.contatos?.telefone && (
                <ExternalLink href={`tel:${profile.contatos.telefone}`} label="Telefone" />
              )}
              {profile.contatos?.email && (
                <ExternalLink href={`mailto:${profile.contatos.email}`} label="E-mail" />
              )}
            </div>
          </Section>
        )}

        {hasRedes && (
          <Section title="Redes e perfis">
            <div className="flex flex-wrap gap-2">
              {profile.redes?.whatsapp && (
                <ExternalLink href={buildWhatsappLink(profile.redes.whatsapp)} label="WhatsApp" />
              )}
              {profile.redes?.instagram && (
                <ExternalLink href={profile.redes.instagram} label="Instagram" />
              )}
              {profile.redes?.facebook && (
                <ExternalLink href={profile.redes.facebook} label="Facebook" />
              )}
              {profile.redes?.linkedin && (
                <ExternalLink href={profile.redes.linkedin} label="LinkedIn" />
              )}
              {profile.redes?.lattes && (
                <ExternalLink href={profile.redes.lattes} label="Currículo Lattes" />
              )}
              {profile.redes?.site && <ExternalLink href={profile.redes.site} label="Site" />}
            </div>
          </Section>
        )}

        {profile.informacoesMaconicas &&
          (profile.informacoesMaconicas.lojasVisitadas ||
            profile.informacoesMaconicas.interessesMaconicos) && (
            <Section title="Informações maçônicas">
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
      </CardContent>
    </Card>
  );
}
