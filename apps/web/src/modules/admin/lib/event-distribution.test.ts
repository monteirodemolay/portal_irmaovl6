import { describe, expect, it } from 'vitest';
import type { Event, ArchiveItem, ArchiveMedia, News, Announcement } from '@vl6/domain';
import { resolveEventDistribution } from './event-distribution';

const now = new Date('2026-10-11T17:00:00Z');
const event = {
  id: 'e1',
  tipo: 'sessao',
  dataInicio: new Date('2026-10-12T22:00:00Z'),
  nivelAcesso: 'irmaos',
  exibirNaLinhaDoTempo: true,
  deletedAt: null,
} as Event;
function states(overrides: Partial<Parameters<typeof resolveEventDistribution>[0]> = {}) {
  return Object.fromEntries(
    resolveEventDistribution({
      event,
      news: [],
      announcements: [],
      archive: [],
      media: [],
      now,
      ...overrides,
    }).map((d) => [d.name, d.state]),
  );
}
describe('distribuição editorial canônica', () => {
  it('mantém legado na Agenda/Início sem publicar memória vazia ou Instagram', () => {
    expect(states()).toMatchObject({
      'Tela Inicial': 'Elegível na agenda do Início',
      Agenda: 'Disponível na Agenda',
      'Acervo VL6': 'Aguardando conteúdo',
      Instagram: 'Sem link de publicação registrado',
    });
  });
  it('ocultar no Início não retira da Agenda; tipo e data controlam próximas sessões', () => {
    expect(
      states({ event: { ...event, exibirNaTelaInicial: false, exibirNaLinhaDoTempo: false } }),
    ).toMatchObject({
      Agenda: 'Disponível na Agenda',
      'Próximas Sessões': 'Oculta no Início',
      'Linha do Tempo': 'Oculta',
    });
    expect(states({ event: { ...event, tipo: 'evento' } })['Próximas Sessões']).toBe(
      'Não se aplica a este tipo',
    );
    expect(
      states({ event: { ...event, dataInicio: new Date('2026-10-10') } })['Próximas Sessões'],
    ).toBe('Sessão já iniciada');
  });
  it('Constelação exige binário e mídia do item publicado, com acesso compatível', () => {
    const archive = [
      { id: 'i1', publicacaoStatus: 'publicado', nivelAcesso: 'irmaos' } as ArchiveItem,
    ];
    const media = [
      {
        archiveItemId: 'i1',
        mediaType: 'foto',
        publicacaoStatus: 'publicado',
        mediaAssetId: 'asset',
        accessLevel: 'irmaos',
      } as ArchiveMedia,
    ];
    expect(states({ archive, media })['Constelação VL6']).toBe('Elegível para seleção automática');
    for (const patch of [
      { mediaAssetId: null },
      { archiveItemId: 'outro' },
      { publicacaoStatus: 'rascunho' },
      { accessLevel: 'administracao' },
    ]) {
      expect(
        states({ archive, media: [{ ...media[0], ...patch } as ArchiveMedia] })['Constelação VL6'],
      ).toBe('Aguardando foto ou vídeo publicado');
    }
  });
  it('deriva publicação e validade dos conteúdos, sem declarar envio externo', () => {
    expect(
      states({
        news: [{ publicado: true, instagramUrls: ['https://instagram.com/p/1'] } as News],
        announcements: [{ publicado: true, dataExpiracao: new Date('2026-10-10') } as Announcement],
      }),
    ).toMatchObject({
      Notícias: '1 publicada(s)',
      Instagram: 'Link externo registrado',
      'Comunicação interna': 'Avisos em rascunho ou expirados',
    });
  });
  it('publicação da notícia não garante seleção no Início', () => {
    expect(
      states({
        news: [{ publicado: true } as News],
        homePlacement: { event: false, news: 0, announcements: 0 },
      })['Tela Inicial'],
    ).toBe('Sem conteúdo selecionado no Início');
    expect(
      states({ homePlacement: { event: true, news: 1, announcements: 0 } })['Tela Inicial'],
    ).toContain('Em exibição');
  });
  it('falha ou falta de permissão resulta em estado desconhecido', () => {
    expect(states({ unavailable: ['Notícias', 'Acervo', 'Avisos'] })).toMatchObject({
      Notícias: 'Não foi possível verificar',
      Instagram: 'Não foi possível verificar',
      'Acervo VL6': 'Não foi possível verificar',
      'Constelação VL6': 'Não foi possível verificar',
      'Comunicação interna': 'Não foi possível verificar',
    });
  });
});
