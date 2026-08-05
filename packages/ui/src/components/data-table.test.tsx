import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn } from './data-table';
import { EmptyState } from './empty-state';

interface Row {
  id: string;
  nome: string;
  grau: string;
}

const rows: Row[] = [
  { id: '1', nome: 'Fulano de Tal', grau: 'Mestre' },
  { id: '2', nome: 'Beltrano da Silva', grau: 'Companheiro' },
];

const columns: DataTableColumn<Row>[] = [
  { key: 'nome', header: 'Nome', cell: (row) => row.nome },
  { key: 'grau', header: 'Grau', cell: (row) => row.grau },
];

describe('DataTable', () => {
  it('renderiza cabeçalhos e uma linha por registro', () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(row) => row.id} />);

    expect(screen.getByRole('columnheader', { name: 'Nome' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Grau' })).toBeInTheDocument();
    expect(screen.getByText('Fulano de Tal')).toBeInTheDocument();
    expect(screen.getByText('Beltrano da Silva')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // 1 de cabeçalho + 2 de dados
  });

  it('chama onRowClick com o registro correspondente ao clicar na linha', async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );

    await userEvent.click(screen.getByText('Beltrano da Silva'));

    expect(onRowClick).toHaveBeenCalledOnce();
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it('renderiza o emptyState em vez da tabela quando não há registros', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        getRowId={(row) => row.id}
        emptyState={<EmptyState title="Nenhum Irmão cadastrado" />}
      />,
    );

    expect(screen.getByText('Nenhum Irmão cadastrado')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renderiza a tabela vazia (sem linhas de dados) quando não há emptyState', () => {
    render(<DataTable columns={columns} rows={[]} getRowId={(row) => row.id} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(1); // só o cabeçalho
  });
});
