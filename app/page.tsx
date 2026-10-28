'use client';

import React, { useState, useEffect } from 'react';
import { db, IdeaMemo } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Clock, Archive, Settings, Trash2, CheckCircle } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'feed' | 'history' | 'settings'>('feed');
  const [historySubTab, setHistorySubTab] = useState<'stock' | 'completed'>('stock');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Step 1: 入力フォームの状態
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [timerHours, setTimerHours] = useState(24);
  const [mediaType, setMediaType] = useState<'text' | 'voice' | 'image' | 'video'>('text');

  // Step 2: 詳細深掘りモーダル状態
  const [selectedMemo, setSelectedMemo] = useState<IdeaMemo | null>(null);
  const [deepDiveData, setDeepDiveData] = useState({
    why: '',
    trigger: '',
    nextAction: '',
    solution: '',
    others: ''
  });

  // Dexieからのリアルタイムデータ取得
  const feedMemos = useLiveQuery(() => db.memos.where('status').equals('feed').toArray()) || [];
  const stockMemos = useLiveQuery(() => db.memos.where('status').equals('stock').toArray()) || [];
  const completedMemos = useLiveQuery(() => db.memos.where('status').equals('completed').toArray()) || [];

  // 自動削除チェック（タイマー切れのものを物理削除）
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const expired = await db.memos.where('expiresAt').below(now).toArray();
      for (const memo of expired) {
        if (memo.status === 'feed' && memo.id) {
          await db.memos.delete(memo.id);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 新規メモ保存（Step 1）
  const handleSaveQuickMemo = async () => {
    if (!title && !content) return;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timerHours * 60 * 60 * 1000);

    await db.memos.add({
      title: title || '無題のアイデア',
      content,
      mediaType,
      createdAt: now,
      expiresAt,
      status: 'feed',
      deepDiveFields: {}
    });

    setTitle('');
    setContent('');
    setIsModalOpen(false);
  };

  // 深掘り保存（Step 2 クリア条件）
  const handleSaveDeepDive = async () => {
    if (!selectedMemo || !selectedMemo.id) return;
    
    // 任意の1項目でも入力されていればクリア
    const hasInput = Object.values(deepDiveData).some(val => val.trim() !== '');
    if (!hasInput) {
      alert('深掘り項目を1つ以上入力してください');
      return;
    }

    await db.memos.update(selectedMemo.id, {
      status: 'stock',
      deepDiveFields: deepDiveData
    });

    setSelectedMemo(null);
  };

  // 残り時間表示用ヘルパー
  const getRemainingTime = (expiresAt: Date) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return '00:00:00';
    const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
    const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col justify-between pb-20 relative">
      {/* ヘッダー */}
      <header className="p-4 bg-white border-b sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">Idea Seed</h1>
        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
          消滅タイマー稼働中
        </span>
      </header>

      {/* メインコンテンツエリア */}
      <div className="p-4 flex-1">
        {activeTab === 'feed' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-500 mb-2">深掘り待ち（消滅の危機）</h2>
            {feedMemos.length === 0 ? (
              <p className="text-center text-slate-400 py-10">右下の「＋」からアイデアの種を追加してください</p>
            ) : (
              feedMemos.map((memo) => (
                <div
                  key={memo.id}
                  onClick={() => {
                    setSelectedMemo(memo);
                    setDeepDiveData({
                      why: memo.deepDiveFields.why || '',
                      trigger: memo.deepDiveFields.trigger || '',
                      nextAction: memo.deepDiveFields.nextAction || '',
                      solution: memo.deepDiveFields.solution || '',
                      others: memo.deepDiveFields.others || ''
                    });
                  }}
                  className="bg-white p-4 rounded-xl border border-red-200 shadow-sm relative overflow-hidden cursor-pointer hover:border-red-400 transition"
                >
                  <h3 className="font-bold text-slate-800">{memo.title}</h3>
                  <p className="text-sm text-slate-600 line-clamp-2 mt-1">{memo.content}</p>
                  <div className="mt-3 flex justify-end items-center text-red-500 text-sm font-mono font-bold">
                    <Clock className="w-4 h-4 mr-1 animate-pulse" />
                    あと {getRemainingTime(memo.expiresAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="flex bg-slate-200 p-1 rounded-lg mb-4">
              <button
                onClick={() => setHistorySubTab('stock')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${
                  historySubTab === 'stock' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                ストック ({stockMemos.length})
              </button>
              <button
                onClick={() => setHistorySubTab('completed')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${
                  historySubTab === 'completed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                完了 ({completedMemos.length})
              </button>
            </div>

            <div className="space-y-3">
              {(historySubTab === 'stock' ? stockMemos : completedMemos).map((memo) => (
                <div key={memo.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800">{memo.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{memo.content}</p>
                  {historySubTab === 'stock' && (
                    <div className="mt-3 flex justify-end space-x-2 border-t pt-2">
                      <button
                        onClick={async () => memo.id && await db.memos.update(memo.id, { status: 'completed' })}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg flex items-center text-xs"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> 完了
                      </button>
                      <button
                        onClick={async () => memo.id && await db.memos.delete(memo.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center text-xs"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> 削除
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h2 className="font-bold text-slate-800 mb-2">設定</h2>
            <p className="text-sm text-slate-500">テンプレート管理・通知ルールを設定予定です。</p>
          </div>
        )}
      </div>

      {/* FAB (新規作成ボタン) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-20 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition z-20"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Step 1: クイック作成 モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold">新規アイデアを作成</h2>
            <input
              type="text"
              placeholder="アイデアのタイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <textarea
              placeholder="メモ内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
            />
            
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2">消滅タイマー設定</label>
              <div className="flex space-x-2">
                {[3, 12, 24, 48].map((h) => (
                  <button
                    key={h}
                    onClick={() => setTimerHours(h)}
                    className={`flex-1 py-2 text-xs rounded-lg border ${
                      timerHours === h ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    {h}時間
                  </button>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-500 border rounded-xl">
                キャンセル
              </button>
              <button onClick={handleSaveQuickMemo} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl">
                タイマー開始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: 深掘り モーダル */}
      {selectedMemo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{selectedMemo.title} を深掘り</h2>
              <span className="text-xs text-red-500 font-bold">消滅まであと {getRemainingTime(selectedMemo.expiresAt)}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block">1. なぜ？（課題・背景）</label>
                <textarea
                  value={deepDiveData.why}
                  onChange={(e) => setDeepDiveData({ ...deepDiveData, why: e.target.value })}
                  placeholder="なぜこれを思いついたか？"
                  className="w-full p-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block">2. きっかけ（トリガー）</label>
                <textarea
                  value={deepDiveData.trigger}
                  onChange={(e) => setDeepDiveData({ ...deepDiveData, trigger: e.target.value })}
                  placeholder="どんな場面で思いついたか？"
                  className="w-full p-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block">3. 次の手（アクション）</label>
                <textarea
                  value={deepDiveData.nextAction}
                  onChange={(e) => setDeepDiveData({ ...deepDiveData, nextAction: e.target.value })}
                  placeholder="具体的にまず何から始めるか？"
                  className="w-full p-2 border rounded-lg text-sm mt-1"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button onClick={() => setSelectedMemo(null)} className="flex-1 py-3 text-slate-500 border rounded-xl">
                あとで
              </button>
              <button onClick={handleSaveDeepDive} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl">
                深掘りを保存（消滅回避）
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 下部ナビゲーションバー */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex justify-around p-3 z-10">
        <button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center ${activeTab === 'feed' ? 'text-blue-600' : 'text-slate-400'}`}>
          <Clock className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">深掘り</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`}>
          <Archive className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">履歴</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400'}`}>
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">設定</span>
        </button>
      </nav>
    </main>
  );
}