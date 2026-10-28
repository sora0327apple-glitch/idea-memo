import Dexie, { Table } from 'dexie';

export interface IdeaMemo {
  id?: number;
  title: string;
  content: string;
  mediaType: 'text' | 'voice' | 'image' | 'video';
  createdAt: Date;
  expiresAt: Date;
  status: 'feed' | 'stock' | 'completed';
  deepDiveFields: {
    why?: string;
    trigger?: string;
    nextAction?: string;
    solution?: string;
    others?: string;
    [key: string]: string | undefined;
  };
}

export class IdeaMemoDatabase extends Dexie {
  memos!: Table<IdeaMemo>;

  constructor() {
    super('IdeaMemoDatabase');
    this.version(1).stores({
      memos: '++id, status, expiresAt, createdAt'
    });
  }
}

export const db = new IdeaMemoDatabase();