import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('./storage-scope', () => ({ trackCriptaUpload: vi.fn() }));
import { deleteAndVerifyPrivateCiphertext } from './wix-private-files';
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('WIX_CRIPTA_API_KEY', 'test-only');
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
describe('confirmação de exclusão Wix', () => {
  it('exclui permanentemente e exige ausência depois do pedido', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ file: { id: 'file' } }))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({}, 404));
    await deleteAndVerifyPrivateCiphertext('file');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({
      fileIds: ['file'],
      permanent: true,
    });
  });
  it('aceita arquivo já ausente sem repetir exclusão', async () => {
    fetchMock.mockResolvedValue(response({}, 404));
    await deleteAndVerifyPrivateCiphertext('file');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('não confunde resposta 200 com exclusão efetivada', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ file: { id: 'file' } }))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({ file: { id: 'file' } }));
    await expect(deleteAndVerifyPrivateCiphertext('file')).rejects.toThrow('ainda não confirmou');
  });
  it.each([401, 403, 429, 500])('não trata HTTP %i como ausência', async (status) => {
    fetchMock.mockResolvedValue(response({}, status));
    await expect(deleteAndVerifyPrivateCiphertext('file')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('rejeita resposta vazia ou divergente', async () => {
    fetchMock.mockResolvedValue(response({}));
    await expect(deleteAndVerifyPrivateCiphertext('file')).rejects.toThrow();
  });
});
