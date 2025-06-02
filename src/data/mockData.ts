
interface AttachmentItem {
  id: string;
  name: string;
  type: 'document' | 'execution';
}

export const mockDocuments: AttachmentItem[] = [
  { id: 'doc1', name: 'Planejamento', type: 'document' },
  { id: 'doc2', name: 'Starter Prompt Library', type: 'document' },
  { id: 'doc3', name: 'Metodologia', type: 'document' },
  { id: 'doc4', name: 'Conteúdo S.A.', type: 'document' },
  { id: 'doc5', name: 'Livros', type: 'document' },
];

export const mockExecutions: AttachmentItem[] = [
  { id: 'exec1', name: 'Execution #1234', type: 'execution' },
  { id: 'exec2', name: 'Execution #1235', type: 'execution' },
  { id: 'exec3', name: 'Execution #1236', type: 'execution' },
  { id: 'exec4', name: 'Execution #1237', type: 'execution' },
];
