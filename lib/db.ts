import Dexie, { Table } from 'dexie';

export interface CustomQuestion {
  id: string;
  label: string;
  placeholder: string;
}

export interface Folder {
  id?: number;
  name: string;
  createdAt: Date;
}

export interface IdeaMemo {
  id?: number;
  title: string;
  content: string;
  mediaType: 'text' | 'voice' | 'image' | 'video';
  mediaUrl?: string; // 画像・動画・音声のURL/DataURI
  folderId?: number; // 所属フォルダのID（未設定の場合は未分類）
  createdAt: Date;
  expiresAt: Date;
  status: 'feed' | 'stock' | 'completed';
  deepDiveFields: Record<string, string>; // 動的質問に対応するキー＆バリュー
}

export class IdeaSeedDatabase extends Dexie {
  memos!: Table<IdeaMemo>;
  folders!: Table<Folder>;

  constructor() {
    super('IdeaSeedDB');
    this.version(2).stores({
      memos: '++id, status, expiresAt, folderId',
      folders: '++id, name'
    });
  }
}

export const db = new IdeaSeedDatabase();