'use client';

import React, { useState, useEffect } from 'react';
import { db, IdeaMemo } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Clock, Archive, Settings, Trash2, CheckCircle, Share2, FolderInput } from 'lucide-react';
import { motion, PanInfo } from 'framer-motion';

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

  // 自動削除チェック
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

  // 深掘り保存（Step 2）
  const handleSaveDeepDive = async () => {
    if (!selectedMemo || !selectedMemo.id) return;
    
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

  // 共有機能（Web Share API）
  const handleShare = async (memo: IdeaMemo) => {
    const shareText = `【${memo.title}】\n${memo.content || ''}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: memo.title,
          text: shareText,
        });
      } catch (err) {
        console.log('共有キャンセル', err);
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      alert('クリップボードにコピーしました！');
    }
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
    <div className="w-full bg-slate-100 min-h-screen flex justify-center">
      <main className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col justify-between pb-20 relative shadow-md">
        
        {/* ヘッダー */}
        <header className="p-4 bg-white border-b sticky top-0 z-10 flex justify-between items-center shadow-sm h-16 w-full">
          <h1 className="text-xl font-bold text-slate-800">Idea Seed</h1>
          <span className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-medium">
            消滅タイマー稼働中
          </span>
        </header>

        {/* メインコンテンツエリア */}
        <div className="p-4 flex-1 w-full overflow-x-hidden">
          {activeTab === 'feed' && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-500 mb-2">深掘り待ち（消滅の危機）</h2>
              {feedMemos.length === 0 ? (
                <p className="text-center text-slate-400 py-10">右下の「＋」からアイデアの種を追加してください</p>
              ) : (
                feedMemos.map((memo) => (
                  <SwipeableCard
                    key={memo.id}
                    onCardClick={() => {
                      setSelectedMemo(memo);
                      setDeepDiveData({
                        why: memo.deepDiveFields.why || '',
                        trigger: memo.deepDiveFields.trigger || '',
                        nextAction: memo.deepDiveFields.nextAction || '',
                        solution: memo.deepDiveFields.solution || '',
                        others: memo.deepDiveFields.others || ''
                      });
                    }}
                    actions={[
                      {
                        label: '共有',
                        icon: <Share2 className="w-5 h-5 text-white" />,
                        bg: 'bg-blue-500',
                        onClick: () => handleShare(memo)
                      },
                      {
                        label: '削除',
                        icon: <Trash2 className="w-5 h-5 text-white" />,
                        bg: 'bg-red-500',
                        onClick: async () => memo.id && await db.memos.delete(memo.id)
                      }
                    ]}
                  >
                    <div className="border border-red-200">
                      <h3 className="font-bold text-slate-800">{memo.title}</h3>
                      <p className="text-sm text-slate-600 line-clamp-2 mt-1">{memo.content}</p>
                      <div className="mt-3 flex justify-end items-center text-red-500 text-sm font-mono font-bold">
                        <Clock className="w-4 h-4 mr-1 animate-pulse" />
                        あと {getRemainingTime(memo.expiresAt)}
                      </div>
                    </div>
                  </SwipeableCard>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div className="flex bg-slate-200 p-1 rounded-lg mb-4">
                <button
                  onClick={() => setHistorySubTab('stock')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                    historySubTab === 'stock' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  ストック ({stockMemos.length})
                </button>
                <button
                  onClick={() => setHistorySubTab('completed')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                    historySubTab === 'completed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  完了 ({completedMemos.length})
                </button>
              </div>

              <div className="space-y-3">
                {(historySubTab === 'stock' ? stockMemos : completedMemos).map((memo) => (
                  <SwipeableCard
                    key={memo.id}
                    actions={
                      historySubTab === 'stock'
                        ? [
                            {
                              label: '共有',
                              icon: <Share2 className="w-5 h-5 text-white" />,
                              bg: 'bg-blue-500',
                              onClick: () => handleShare(memo)
                            },
                            {
                              label: '完了',
                              icon: <CheckCircle className="w-5 h-5 text-white" />,
                              bg: 'bg-green-500',
                              onClick: async () => memo.id && await db.memos.update(memo.id, { status: 'completed' })
                            },
                            {
                              label: '削除',
                              icon: <Trash2 className="w-5 h-5 text-white" />,
                              bg: 'bg-red-500',
                              onClick: async () => memo.id && await db.memos.delete(memo.id)
                            }
                          ]
                        : [
                            {
                              label: '共有',
                              icon: <Share2 className="w-5 h-5 text-white" />,
                              bg: 'bg-blue-500',
                              onClick: () => handleShare(memo)
                            },
                            {
                              label: 'ストック',
                              icon: <FolderInput className="w-5 h-5 text-white" />,
                              bg: 'bg-purple-500',
                              onClick: async () => memo.id && await db.memos.update(memo.id, { status: 'stock' })
                            },
                            {
                              label: '削除',
                              icon: <Trash2 className="w-5 h-5 text-white" />,
                              bg: 'bg-red-500',
                              onClick: async () => memo.id && await db.memos.delete(memo.id)
                            }
                          ]
                    }
                  >
                    <div className="border border-slate-200">
                      <h3 className="font-bold text-slate-800">{memo.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{memo.content}</p>
                    </div>
                  </SwipeableCard>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="font-bold text-slate-800 mb-2">設定</h2>
              <p className="text-sm text-slate-500">テンプレート管理・通知ルールを設定予定です。</p>
            </div>
          )}
        </div>

        {/* FAB (新規作成ボタン) */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-20 right-1/2 translate-x-[160px] bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition z-20"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Step 1: クイック作成 モーダル */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl">
              <h2 className="text-lg font-bold text-slate-800">新規アイデアを作成</h2>
              <input
                type="text"
                placeholder="アイデアのタイトル"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoFocus
              />
              <textarea
                placeholder="メモ内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 text-sm"
              />
              
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-2">消滅タイマー設定</label>
                <div className="flex space-x-2">
                  {[3, 12, 24, 48].map((h) => (
                    <button
                      key={h}
                      onClick={() => setTimerHours(h)}
                      className={`flex-1 py-2 text-xs rounded-lg border transition ${
                        timerHours === h ? 'bg-blue-600 text-white border-blue-600 font-bold' : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      {h}時間
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-slate-500 border rounded-xl text-sm font-medium">
                  キャンセル
                </button>
                <button onClick={handleSaveQuickMemo} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm">
                  タイマー開始
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: 深掘り モーダル */}
        {selectedMemo && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="text-base font-bold text-slate-800 truncate pr-2">{selectedMemo.title} を深掘り</h2>
                <span className="text-xs text-red-500 font-bold whitespace-nowrap">あと {getRemainingTime(selectedMemo.expiresAt)}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block">1. なぜ？（課題・背景）</label>
                  <textarea
                    value={deepDiveData.why}
                    onChange={(e) => setDeepDiveData({ ...deepDiveData, why: e.target.value })}
                    placeholder="なぜこれを思いついたか？"
                    className="w-full p-2.5 border rounded-lg text-sm mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block">2. きっかけ（トリガー）</label>
                  <textarea
                    value={deepDiveData.trigger}
                    onChange={(e) => setDeepDiveData({ ...deepDiveData, trigger: e.target.value })}
                    placeholder="どんな場面で思いついたか？"
                    className="w-full p-2.5 border rounded-lg text-sm mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block">3. 次の手（アクション）</label>
                  <textarea
                    value={deepDiveData.nextAction}
                    onChange={(e) => setDeepDiveData({ ...deepDiveData, nextAction: e.target.value })}
                    placeholder="具体的にまず何から始めるか？"
                    className="w-full p-2.5 border rounded-lg text-sm mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button onClick={() => setSelectedMemo(null)} className="flex-1 py-3 text-slate-500 border rounded-xl text-sm font-medium">
                  あとで
                </button>
                <button onClick={handleSaveDeepDive} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl text-sm">
                  深掘りを保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 下部ナビゲーションバー */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t flex justify-around p-3 z-10 shadow-lg">
          <button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center relative ${activeTab === 'feed' ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className="relative">
              <Clock className="w-5 h-5" />
              {/* 深掘り件数の赤丸通知バッジ */}
              {feedMemos.length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[16px] h-[16px] rounded-full flex items-center justify-center leading-none shadow-sm">
                  {feedMemos.length > 99 ? '99+' : feedMemos.length}
                </span>
              )}
            </div>
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
    </div>
  );
}

// --- スワイプ可能なカードコンポーネント ---
interface ActionItem {
  label: string;
  icon: React.ReactNode;
  bg: string;
  onClick: () => void;
}

function SwipeableCard({
  children,
  actions,
  onCardClick,
}: {
  children: React.ReactNode;
  actions: ActionItem[];
  onCardClick?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const actionWidth = actions.length * 64; // 各ボタン約64px幅

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -40) {
      setIsOpen(true);
    } else if (info.offset.x > 40) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-white shadow-sm my-2">
      {/* 右側に隠れているアクションボタン領域 */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end z-0">
        {actions.map((act, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              act.onClick();
              setIsOpen(false);
            }}
            className={`h-full w-16 flex flex-col items-center justify-center text-white ${act.bg} active:opacity-80 transition`}
          >
            {act.icon}
            <span className="text-[10px] font-medium mt-1">{act.label}</span>
          </button>
        ))}
      </div>

      {/* スライドする表のカード */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -actionWidth, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: isOpen ? -actionWidth : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else if (onCardClick) {
            onCardClick();
          }
        }}
        className="bg-white p-4 rounded-xl relative z-10 cursor-pointer touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}