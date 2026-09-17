import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryParamasonicEntityMemberRepository,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { DemolayRosterRow } from '../lib/demolay-roster.types';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import { ImportDemolayChapterRosterUseCase } from './import-demolay-chapter-roster.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['paramasonicEntity:manage'],
};

const rows: DemolayRosterRow[] = [
  { nomeCompleto: 'Fulano de Tal', idMatricula: '111', cargoOriginal: null, status: 'Regular' },
  { nomeCompleto: 'Beltrano Souza', idMatricula: '222', cargoOriginal: null, status: 'Sênior' },
  {
    nomeCompleto: 'Ciclano Lima',
    idMatricula: '333',
    cargoOriginal: 'Ex-Membro',
    status: 'Consultor',
  },
  { nomeCompleto: 'Sicrano Alves', idMatricula: '444', cargoOriginal: null, status: 'Inativo' },
  { nomeCompleto: 'Falecido Fulano', idMatricula: '555', cargoOriginal: null, status: 'Falecido' },
];

async function buildScenario() {
  const paramasonicEntityRepository = new InMemoryParamasonicEntityRepository();
  const paramasonicEntityMemberRepository = new InMemoryParamasonicEntityMemberRepository();

  const createEntityUseCase = new CreateParamasonicEntityUseCase({
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  const created = await createEntityUseCase.execute(ctx, {
    kind: 'demolay',
    name: 'Capítulo Rio Verde n.º 350',
    shortName: 'DeMolays',
    unitNumber: '350',
    parentUnitName: 'Loja Verdadeira Luz nº 06',
    situacao: 'ativa',
    modules: { people: true, agenda: true, content: true, publicPage: false },
  });
  if (!created.ok) throw new Error('setup failed');

  const useCase = new ImportDemolayChapterRosterUseCase({
    paramasonicEntityMemberRepository,
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, paramasonicEntityMemberRepository, entityId: created.value.id };
}

describe('ImportDemolayChapterRosterUseCase', () => {
  it('importa todos os integrantes como corpo próprio', async () => {
    const { useCase, entityId, paramasonicEntityMemberRepository } = await buildScenario();

    const result = await useCase.execute(ctx, entityId, rows);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.every((r) => r.status === 'criado')).toBe(true);

    const stored = await paramasonicEntityMemberRepository.listByEntity('t1', entityId);
    expect(stored).toHaveLength(5);
    expect(stored.every((m) => m.memberId === null)).toBe(true);

    const ciclano = stored.find((m) => m.nomeCompleto === 'Ciclano Lima');
    expect(ciclano?.cargo).toBe('Consultor — Ex-Membro');

    const inativo = stored.find((m) => m.nomeCompleto === 'Sicrano Alves');
    expect(inativo?.situacao).toBe('inativo');

    const falecido = stored.find((m) => m.nomeCompleto === 'Falecido Fulano');
    expect(falecido?.situacao).toBe('inativo');

    const regular = stored.find((m) => m.nomeCompleto === 'Fulano de Tal');
    expect(regular?.situacao).toBe('ativo');
    expect(regular?.cargo).toBe('Regular');
  });

  it('é idempotente — rodar de novo não duplica ninguém', async () => {
    const { useCase, entityId, paramasonicEntityMemberRepository } = await buildScenario();
    await useCase.execute(ctx, entityId, rows);

    const result = await useCase.execute(ctx, entityId, rows);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.every((r) => r.status === 'já existia')).toBe(true);
    const stored = await paramasonicEntityMemberRepository.listByEntity('t1', entityId);
    expect(stored).toHaveLength(5);
  });

  it('retorna NotFoundError para entidade inexistente', async () => {
    const { useCase } = await buildScenario();

    const result = await useCase.execute(ctx, 'inexistente', rows);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão paramasonicEntity:manage', async () => {
    const { useCase, entityId } = await buildScenario();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, entityId, rows)).rejects.toThrow(ForbiddenError);
  });
});
